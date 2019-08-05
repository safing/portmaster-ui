package main

import (
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"

	"github.com/Microsoft/go-winio"
	"github.com/safing/portbase/log"
	"golang.org/x/text/encoding/unicode"
)

var (
	notifierPath = ""
	logoLocation = ""
)

const (
	pipeName        = "\\\\.\\pipe\\portmasterNotifierToast"
	webLogoLocation = "http://127.0.0.1:817/ui/modules/assets/favicons/ms-icon-310x310.png" //TODO
)

func init() {
	if logoLocation == "" {
		logoLocation = filepath.Join(os.TempDir(), "Portmaster", "logo-310x310.png")
	}
}

//API called functions:

func actionListener() {
	initNotifierPath()
	go notificationListener()
	initLogo()
}

// Show shows the notification.
func (n *Notification) Show() {
	log.Debugf("called to show: %+v", n)
	if n.Message == "" {
		log.Errorf("Snoretoast was asked to create this notification with empty messag - impossible: %+v", n)
		return
	}
	initLogo()
	snoreToastRunCmdAsync(exec.Command(notifierPath, "-id", n.GUID, "-t", "Portmaster", "-m", n.Message, "-b", buildSnoreToastButtonArgument(n.AvailableActions), "-appID", "io.safing.portmaster", "-p", logoLocation, "-pipeName", pipeName))
}

// Cancel cancels the notification.
func (n *Notification) Cancel() {
	if n == nil || n.GUID == "" {
		return
	}
	snoreToastRunCmdAsync(exec.Command(notifierPath, "-close", n.GUID, "-appID", "io.safing.portmaster"))
}

//internal functions:

func initNotifierPath() {
	if notifierPath == "" {
		var err error
		notifierPath, err = getPath("notifier-snoretoast")

		if err != nil {
			log.Errorf("Error while getting SnoreToast-Path: %s %s", err, notifierPath)
			return
			//TODO: what to do?
		}
	}
}

func initLogo() {
	if _, err := os.Stat(logoLocation); err != nil { //File doesn't exist or another Error that is handled while copying file there
		os.MkdirAll(filepath.Dir(logoLocation), os.ModePerm)
		if err = downloadFile(logoLocation, webLogoLocation); err != nil {
			log.Errorf("Can't copy Logo for SnoreToast from %s to %s: %s", webLogoLocation, logoLocation, err)
		}
	}
}

func notificationListener() {
	log.Debugf("Listening on Pipe %s\n", pipeName)
	l, err := winio.ListenPipe(pipeName, nil)
	if err != nil {
		log.Errorf("Error while starting Pipe for SnoreToast: %s", err)
		return
	}
	defer l.Close()

	for {
		conn, err := l.Accept()
		if err != nil {
			log.Errorf(err)
			continue
		}
		go onCallback(conn)
	}
}

func onCallback(conn net.Conn) {
	data := snoreToastStrToMap(readWstrConnToStr(conn)) //TODO: what  if some required attribute isn't there?
	log.Debugf("onCallback: %+v", data)

	if data["action"] == "timedout" {
		return
	}

	notificationsLock.Lock()
	var n *Notification
	for _, elem := range notifications {
		if elem.GUID == data["notificationId"] {
			n = elem
		}
	}
	notificationsLock.Unlock()
	if n == nil {
		return
	}
	n.Lock()
	defer n.Unlock()

	switch data["action"] {
	case "dismissed": //do nothing
	case "clicked": //like dismissed: do nothing
	case "buttonClicked":
		for _, actions := range n.AvailableActions {
			if actions.Text == data["button"] {
				n.SelectAction(actions.ID)
			}
		}
	default:
		log.Debugf("SnoreToast-Action %s not implemented yet", data["action"])
	}
}

//Snoretoast helper-Functions:

func snoreToastStrToMap(in string) map[string]string {
	ret := make(map[string]string)

	for _, el := range strings.Split(in, ";") { //TODO: make sure, there is no ; in any value!
		if el == "" {
			continue
		}

		kv := strings.Split(el, "=") //TODO: make sure, there is no = in any value!
		if len(kv) != 2 {
			log.Warning("SnoreToast-Callback: " + el + " cannot be parsed in Key=Value")
			continue
		}

		ret[kv[0]] = kv[1]
	}

	return ret
}

func buildSnoreToastButtonArgument(a []*Action) string {
	temp := make([]string, 0, len(a))
	for _, elem := range a {
		if elem.Text != "" {
			temp = append(temp, elem.Text)
		}
	}
	return strings.Join(temp, ";")
}

func snoreToastRunCmdAsync(cmd *exec.Cmd) {
	go func() {
		exit, err := execCmd(cmd)

		switch exit {
		case 0: //do nothing
		case 1: //do nothing
		case 2: //do nothing
		case 3: //do nothing
		case 4: //do nothing
		case 5: //do nothing
		default:
			log.Errorf("Error while running %+v: %s", cmd.Args, err)
		}
	}()
}

//Generel helper-Functions:

func execCmd(cmd *exec.Cmd) (exitCode int, err error) {
	log.Debugf("Run snoretoast:%+v", cmd.Args)

	err = cmd.Run()

	//Used: https://stackoverflow.com/questions/10385551/get-exit-code-go
	if err != nil {
		exitError, ok := err.(*exec.ExitError)
		if ok {
			ws := exitError.Sys().(syscall.WaitStatus)
			exitCode = ws.ExitStatus()
		} else {
			// This will happen (in OSX) if `name` is not available in $PATH,
			// in this situation, exit code could not be get, and stderr will be
			// empty string very likely, so we use the default fail code, and format err
			// to string and set to stderr
			log.Warningf("Could not get exit code for failed program: %v", cmd.Args)
			exitCode = -2 //We want to have something that sticks out somehow
		}
	} else {
		// success, exitCode should be 0 if go is ok
		ws := cmd.ProcessState.Sys().(syscall.WaitStatus)
		exitCode = ws.ExitStatus()
	}

	return
}

func readWstrConnToStr(conn net.Conn) string {
	defer conn.Close()

	var bufferslice []byte

readloop:
	for {
		buffer := make([]byte, 512)

		n, err := conn.Read(buffer)
		switch err {
		case nil:
			//do nothing
		case io.EOF:
			break readloop
		default:
			log.Warningf("%s", err)
			return ""
		}
		bufferslice = append(bufferslice, buffer[:n]...)
	}

	dec := unicode.UTF16(unicode.LittleEndian, unicode.UseBOM).NewDecoder()
	out, err := dec.Bytes(bufferslice)
	if err != nil {
		log.Warningf("Error while converting wstr to str: %s", err)
		return ""
	}

	return string(out)
}

func getPath(what string) (string, error) {
	// build path to app
	if dataDir == "" {
		log.Errorf("dataDir is empty!!!")
	}

	appPath := filepath.Join(dataDir, "portmaster-control")
	if runtime.GOOS == "windows" {
		appPath += ".exe"
	}

	// get path
	cmd := exec.Command(appPath, "show", what, "--db", dataDir)
	ret, err := cmd.Output()

	return strings.TrimSpace(string(ret)), err
}

//from https://golangcode.com/download-a-file-from-a-url/
func downloadFile(filepath string, url string) error {

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	return err
}
