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
	"sync"

	"github.com/Microsoft/go-winio"
	"github.com/safing/portbase/log"
	"github.com/safing/portbase/utils/osdetail"
	"golang.org/x/text/encoding/unicode"
)

var (
	notifierPath                  string
	notifierPathMutex             sync.Mutex
	logoLocation                  string // no locking done since only written in init()
	notificationsEnabledForThisOS bool   // Are Notifications even enabled? (not on Windows Versions < 8); no locking done since only written in init()
)

const (
	pipeName          = "\\\\.\\pipe\\portmasterNotifierToast"
	webLogoLocation   = "http://127.0.0.1:817/assets/favicons/ms-icon-310x310.png"
	appID             = "io.safing.portmaster"
	notificationTitle = "Portmaster"
)

type actionCallback struct {
	action string
	button string // actionCallback.button is NOT garanteed to exist in the Callback. Therefore make sure to handle empty String
	id     string
}

type cmdArgs []string

func init() {
	var err error

	if logoLocation == "" {
		logoLocation = filepath.Join(os.TempDir(), "Portmaster", "logo-310x310.png")
	}

	notificationsEnabledForThisOS, err = osdetail.IsAtLeastWindowsVersion("8")
	if err != nil {
		log.Errorf("failed to obtain and compare Windows-Version: %s", err)
		notificationsEnabledForThisOS = true
	}
}

// API called functions:

func actionListener() {
	initNotifierPath()
	initLogo()
	go notificationListener()
}

// Show shows the notification.
func (n *Notification) Show() {
	log.Debugf("showing notification: %+v", n)

	if !notificationsEnabledForThisOS {
		log.Warningf("showing notifications is not implemented on Windows Versions < 8.")
		return
	}

	initLogo() // if not already there

	// beeing very safe while building the Snoretoast-Arguments because malformed arguments sometimes install the SnoreToast default shortcut, see https://bugs.kde.org/show_bug.cgi?id=410622
	args := make(cmdArgs, 0, 10)
	if err := verifySnoreToastArgumentSyntax(n.GUID); err != nil {
		log.Errorf("failed verifiying the GUID when building the SnoreToast-Command: %s", err)
		return
	}
	args.addKeyVal("-id", n.GUID, false)
	if err := args.addKeyVal("-t", notificationTitle, true); err != nil {
		log.Errorf("failed adding Title when building SnoreToast-Command: %s Notification: %+v", err, n)
		return
	}
	if err := args.addKeyVal("-m", n.Message, true); err != nil {
		log.Errorf("failed adding Message when building SnoreToast-Command: %s Notification: %+v", err, n)
		return
	}
	args.addKeyVal("-b", n.buildSnoreToastButtonArgument(), false)
	if err := verifySnoreToastArgumentSyntax(appID); err != nil {
		log.Errorf("failed verifying the appID when building the SnoreToast-Command: %s", err)
		return
	}
	args.addKeyVal("-appID", appID, false)
	args.addKeyVal("-p", logoLocation, false)
	if err := verifySnoreToastArgumentSyntax(pipeName); err != nil {
		log.Errorf("failed verifying the pipeName when building the SnoreToast-Command: %s", err)
		return
	}
	args.addKeyVal("-pipeName", pipeName, false)

	go runSnoreToastCmd(exec.Command(notifierPath, args...))
}

// Cancel cancels the notification.
func (n *Notification) Cancel() {
	if n == nil || n.GUID == "" || !notificationsEnabledForThisOS {
		return
	}

	args := make(cmdArgs, 0, 4)
	if err := args.addKeyVal("-close", n.GUID, true); err != nil {
		log.Errorf("failed adding ID of Notification when building SnoreToast-Close-Command: %s Notification: %+v", err, n)
		return
	}
	if err := args.addKeyVal("-appID", appID, true); err != nil {
		log.Errorf("failed adding appID when building SnoreToast-Close-Command: %s Notification: %+v", err, n)
		return
	}

	go runSnoreToastCmd(exec.Command(notifierPath, args...))
}

// internal functions:

func initNotifierPath() {
	notifierPathMutex.Lock()
	defer notifierPathMutex.Unlock()

	if notifierPath == "" {
		var err error
		notifierPath, err = getPath("notifier-snoretoast")

		if err != nil {
			log.Errorf("failed obtaining SnoreToast-Path: %s %s", err, notifierPath)
			return
		}
	}
}

func initLogo() {
	if _, err := os.Stat(logoLocation); err != nil { // File doesn't exist or another Error that is handled while copying file there
		if err = os.MkdirAll(filepath.Dir(logoLocation), 0644); err != nil {
			log.Errorf("failed to create Directory %s for Logo for SnoreToast: %s", logoLocation, err)
		}
		if err = downloadFile(logoLocation, webLogoLocation); err != nil {
			log.Errorf("failed to copy Logo for SnoreToast from %s to %s: %s", webLogoLocation, logoLocation, err)
		}
	}
}

func notificationListener() {
	log.Debugf("starting Callback-Pipe for SnoreToast: %s", pipeName)
	l, err := winio.ListenPipe(pipeName, nil)
	if err != nil {
		log.Errorf("failed to start Pipe for SnoreToast: %s", err)
		return
	}
	defer l.Close()

	for {
		conn, err := l.Accept()
		if err != nil {
			log.Errorf("failed to accept namedPipe-connection (for receiving Callbacks from SnoreToast): %s", err)
			continue
		}
		go handlePipeMessage(conn)
	}
}

func handlePipeMessage(conn net.Conn) {
	data := parseSnoreToastActionCallback(readWideStringAsUnicode(conn))
	log.Debugf("handling PipeMessage: %+v", data)

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

		log.Warningf("failed to handle button click: button %s is reported to have been clicked but is no registered button. Available options: %+v", data.button, n.AvailableActions)
	default:
		log.Debugf("failed to handle SnoreToast-Action %s: not implemented yet", data.action)
	}
}

// Snoretoast helper-Functions:

// Verifies that the Argument contians no Semicolon which would be difficult (in some cases impossible) to parse in a Pipe-Response
func verifySnoreToastArgumentSyntax(arg string) error {
	if strings.Contains(arg, ";") {
		return fmt.Errorf("the SnoreToast-Argument %s would contain a semicolon which would screw up the pipe responses", arg)
	}
	return nil
}

func parseSnoreToastActionCallback(in string) actionCallback {
	ret := actionCallback{}

	for _, elem := range strings.Split(in, ";") {
		if elem == "" {
			continue
		}

		elemSplit := strings.SplitN(elem, "=", 2)
		if len(elemSplit) != 2 {
			log.Warningf("failing to parse snoretoast-Response %s into Key=Value-Pair; Response: %s", elem, in)
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
			log.Infof("failed to parse key %s from SnoreToast-Response into struct: receivedkey is unknown to Portmaster (%s)", elemSplit[0], elem)
		}
	}

	if ret.action == "" {
		log.Errorf("missing attribute action in SnoreToast Response: %s", in)
	}

	if ret.id == "" {
		log.Errorf("missing attribute id in SnoreToast Response: %s", in)
	}

	return ret
}

func (n *Notification) buildSnoreToastButtonArgument() string {
	n.Lock()
	defer n.Unlock()

	temp := make([]string, 0, len(n.AvailableActions))
	for _, elem := range n.AvailableActions {
		if err := verifySnoreToastArgumentSyntax(elem.Text); err != nil {
			log.Errorf("failed to build SnoreToast Button-Argument: failed to validate Text for %+v: %s", elem, err)
			continue
		}

		if elem.Text != "" {
			temp = append(temp, elem.Text)
		}
	}
	return strings.Join(temp, ";")
}

func runSnoreToastCmd(cmd *exec.Cmd) {
	exit, err := execCmd(cmd)

	switch exit {
	case 0, 1, 2, 3, 4, 5: // do nothing
	default:
		log.Errorf("executing %+v failed: %s", cmd.Args, err)
	}
}

// Generel helper-Functions:

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

func execCmd(cmd *exec.Cmd) (exitCode int, err error) {
	log.Debugf("running command: %+v", cmd.Args)

	err = cmd.Run()
	exitCode = cmd.ProcessState.ExitCode()

	return
}

func readWideStringAsUnicode(conn net.Conn) string {
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
			log.Warningf("failed to read from pipe: %s", err)
			return ""
		}
		bufferslice = append(bufferslice, buffer[:n]...)
	}

	dec := unicode.UTF16(unicode.LittleEndian, unicode.UseBOM).NewDecoder()
	out, err := dec.Bytes(bufferslice)
	if err != nil {
		log.Warningf("failed to convert wstr to str: %s", err)
		return ""
	}

	return string(out)
}

func getPath(module string) (string, error) {
	// build path to app
	if dataDir == "" {
		return "", fmt.Errorf("failed to get Path for %s: dataDir is empty", module)
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
