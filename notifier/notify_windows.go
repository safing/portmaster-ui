package main

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/Microsoft/go-winio"
	"github.com/safing/portbase/log"
	"golang.org/x/text/encoding/unicode"
)

var (
	notifierPath string
	logoLocation string
)

const (
	pipeName          = "\\\\.\\pipe\\portmasterNotifierToast"
	webLogoLocation   = "http://127.0.0.1:817/assets/favicons/ms-icon-310x310.png"
	appID             = "io.safing.portmaster"
	notificationTitle = "Portmaster"
)

type actionCallback struct {
	action string
	button string
	id     string
}

type cmdArgs []string

func init() {
	if logoLocation == "" {
		logoLocation = filepath.Join(os.TempDir(), "Portmaster", "logo-310x310.png")
	}
}

// API called functions:

func actionListener() {
	initNotifierPath()
	go notificationListener()
	initLogo()
}

// Show shows the notification.
func (n *Notification) Show() {
	log.Debugf("notification to show: %+v", n)

	initLogo() // if not already there

	//beeing very safe while building the Snoretoast-Arguments because malformed arguments sometimes install the SnoreToast default shortcut, see https://bugs.kde.org/show_bug.cgi?id=410622
	args := make(cmdArgs, 0, 10)
	if err := snoreToastVerifyArgumentSyntax(n.GUID); err != nil {
		log.Errorf("verification of the GUID failed when building the SnoreToast-Command: %s", err)
		return
	}
	args.addKeyVal("-id", n.GUID, false)
	if err := args.addKeyVal("-t", notificationTitle, true); err != nil {
		log.Errorf("adding Title while building SnoreToast-Command failed: %s Notification: %+v", err, n)
		return
	}
	if err := args.addKeyVal("-m", n.Message, true); err != nil {
		log.Errorf("adding Message while building SnoreToast-Command failed: %s Notification: %+v", err, n)
		return
	}
	args.addKeyVal("-b", n.buildSnoreToastButtonArgument(), false)
	if err := snoreToastVerifyArgumentSyntax(appID); err != nil {
		log.Errorf("verification of the appID failed when building the SnoreToast-Command: %s", err)
		return
	}
	args.addKeyVal("-appID", appID, false)
	args.addKeyVal("-p", logoLocation, false)
	if err := snoreToastVerifyArgumentSyntax(pipeName); err != nil {
		log.Errorf("verification of the pipeName failed when building the SnoreToast-Command: %s", err)
		return
	}
	args.addKeyVal("-pipeName", pipeName, false)

	snoreToastRunCmdAsync(exec.Command(notifierPath, args...))
}

// Cancel cancels the notification.
func (n *Notification) Cancel() {
	if n == nil || n.GUID == "" {
		return
	}

	args := make(cmdArgs, 0, 4)
	if err := args.addKeyVal("-close", n.GUID, true); err != nil {
		log.Errorf("adding ID of Notification while building SnoreToast-Close-Command failed: %s Notification: %+v", err, n)
		return
	}
	if err := args.addKeyVal("-appID", appID, true); err != nil {
		log.Errorf("adding appID while building SnoreToast-Close-Command failed: %s Notification: %+v", err, n)
		return
	}

	snoreToastRunCmdAsync(exec.Command(notifierPath, args...))
}

// internal functions:

func initNotifierPath() {
	if notifierPath == "" {
		var err error
		notifierPath, err = getPath("notifier-snoretoast")

		if err != nil {
			log.Errorf("error while getting SnoreToast-Path: %s %s", err, notifierPath)
			return
		}
	}
}

func initLogo() {
	if _, err := os.Stat(logoLocation); err != nil { // File doesn't exist or another Error that is handled while copying file there
		if err = os.MkdirAll(filepath.Dir(logoLocation), 0644); err != nil {
			log.Errorf("can't create Directory %s for Logo for SnoreToast: %s", logoLocation, err)
		}
		if err = downloadFile(logoLocation, webLogoLocation); err != nil {
			log.Errorf("can't copy Logo for SnoreToast from %s to %s: %s", webLogoLocation, logoLocation, err)
		}
	}
}

func notificationListener() {
	log.Debugf("running Callback-Pipe for SnoreToast: %s", pipeName)
	l, err := winio.ListenPipe(pipeName, nil)
	if err != nil {
		log.Errorf("error while starting Pipe for SnoreToast: %s", err)
		return
	}
	defer l.Close()

	for {
		conn, err := l.Accept()
		if err != nil {
			log.Errorf("Error while accepting namedPipe-connection (for receiving Callbacks from SnoreToast): %s", err)
			continue
		}
		go handlePipeMessage(conn)
	}
}

func handlePipeMessage(conn net.Conn) {
	data := snoreToastStrToStruct(readWstrConnToStr(conn))
	log.Debugf("handlePipeMessage: %+v", data)

	if data.action == "timedout" {
		return
	}

	notificationsLock.Lock()
	var n *Notification
	for _, elem := range notifications {
		if elem.GUID == data.id {
			n = elem
			break
		}
	}
	notificationsLock.Unlock()
	if n == nil {
		return
	}
	n.Lock()
	defer n.Unlock()

	switch data.action {
	case "dismissed": // do nothing
	case "clicked": // like dismissed: do nothing
	case "buttonClicked":
		for _, actions := range n.AvailableActions {
			if actions.Text == data.button {
				n.SelectAction(actions.ID)
				return
			}
		}

		log.Warningf("button %s is reported to have been clicked but is not available. Available options: %+v", data.button, n.AvailableActions)
	default:
		log.Debugf("SnoreToast-Action %s not implemented yet", data.action)
	}
}

// Snoretoast helper-Functions:

func (list *cmdArgs) addKeyVal(key, val string, required bool) error {
	if val == "" {
		if required {
			return fmt.Errorf("required value for %s is empty", key)
		}
		return nil
	}

	*list = append(*list, key, val)

	return nil
}

//Verifies that the Argument contians no Semicolon which would be difficult (in some cases impossible) to parse in a Pipe-Response
func snoreToastVerifyArgumentSyntax(arg string) error {
	if strings.Contains(arg, ";") {
		return fmt.Errorf("the SnoreToast-Argument %s would contain a semicolon which would screw up the pipe responses", arg)
	}
	return nil
}

//actionCallback.button is NOT garanteed to exist in the Callback. Therefore make sure to handle empty String
func snoreToastStrToStruct(in string) actionCallback {
	ret := actionCallback{}

	for _, elem := range strings.Split(in, ";") {
		if elem == "" {
			continue
		}

		elemSplit := strings.SplitN(elem, "=", 2)
		if len(elemSplit) != 2 {
			log.Warningf("snoretoast-Callback %s cannot be parsed into Key=Value-Pair; whole String: %s", elem, in)
			continue
		}

		switch elemSplit[0] {
		case "action":
			ret.action = elemSplit[1]
		case "button":
			ret.button = elemSplit[1]
		case "notificationId":
			ret.id = elemSplit[1]
		case "version", "pipe": // not needed: do nothing
		default:
			log.Infof("key %s received from SnoreToast isn't known to Portmaster (%s)", elemSplit[0], elem)
		}
	}

	if ret.action == "" {
		log.Errorf("no action specified in the SnoreToast Callback: %s", in)
	}

	if ret.id == "" {
		log.Errorf("no notificationId specified in the SnoreToast Callback: %s", in)
	}

	return ret
}

func (n *Notification) buildSnoreToastButtonArgument() string {
	n.Lock()
	defer n.Unlock()

	temp := make([]string, 0, len(n.AvailableActions))
	for _, elem := range n.AvailableActions {
		if err := snoreToastVerifyArgumentSyntax(elem.Text); err != nil {
			log.Errorf("failed building SnoreToast Button-Argument: failed to validate Text for %+v: %s", elem, err)
			continue
		}

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
		case 0, 1, 2, 3, 4, 5: // do nothing
		default:
			log.Errorf("error while running %+v: %s", cmd.Args, err)
		}
	}()
}

// Generel helper-Functions:

func execCmd(cmd *exec.Cmd) (exitCode int, err error) {
	log.Debugf("run snoretoast: %+v", cmd.Args)

	err = cmd.Run()
	exitCode = cmd.ProcessState.ExitCode()

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
			// do nothing
		case io.EOF:
			break readloop
		default:
			log.Warningf("error while reading from pipe (SnoreToast-Callback): %s", err)
			return ""
		}
		bufferslice = append(bufferslice, buffer[:n]...)
	}

	dec := unicode.UTF16(unicode.LittleEndian, unicode.UseBOM).NewDecoder()
	out, err := dec.Bytes(bufferslice)
	if err != nil {
		log.Warningf("error while converting wstr to str: %s", err)
		return ""
	}

	return string(out)
}

func getPath(module string) (string, error) {
	// build path to app
	if dataDir == "" {
		return "", fmt.Errorf("error while getting Path for %s: dataDir is empty", module)
	}

	appPath := filepath.Join(dataDir, "portmaster-control")
	if runtime.GOOS == "windows" {
		appPath += ".exe"
	}

	// get path
	cmd := exec.Command(appPath, "show", module, "--db", dataDir)
	ret, err := cmd.Output()

	if err != nil {
		err = fmt.Errorf("failed to execute command: %s", err)
	}

	return strings.TrimSpace(string(ret)), err
}

// from https://golangcode.com/download-a-file-from-a-url/
func downloadFile(filepath string, url string) error {

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to open download url %s: %s", url, err)
	}
	defer resp.Body.Close()

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return fmt.Errorf("failed to create file for storing the downloading content: %s", err)
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)

	if err != nil {
		err = fmt.Errorf("failed to copy downloaded content to file: %s", err)
	}

	return err
}
