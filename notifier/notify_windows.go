package main

//TODO: Pipe Security

import (
	"io"
	"net"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/Microsoft/go-winio"
	"github.com/safing/portbase/log"
	"golang.org/x/text/encoding/unicode"
)

func actionListener() {

}

var (
	notifierPath = "C:\\snoretoast.exe"
)

const (
	pipeName = "\\\\.\\pipe\\portmasterNotifierToast"
)

func init() {
	if notifierPath == "" {
		var err error
		notifierPath, err = getPath("notifier-snoretoast")

		if err != nil {
			log.Errorf("Error while getting SnoreToast-Path: %s", err)
			return
			//TODO: what to do?
		}
	}

	go notificationListener()
}

func notificationListener() {
	log.Debugf("Listening on %s\n", pipeName)
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

// Show shows the notification.
func (n *Notification) Show() {
	go asyncCmd(exec.Command(notifierPath, "-id", n.ID, "-t", "Portmaster", "-m", n.Message, "-b", buildSnoreToastButtonArgument(n.AvailableActions), "-appID", "io.safing.portmaster", "-pipeName", pipeName))
}

func onCallback(conn net.Conn) {
	data := snoreToastStrToMap(readWstrConnToStr(conn))
	log.Debugf("%+v", data)

	if data["action"] == "timedout" {
		return
	}

	notificationsLock.Lock()
	n := notifications[data["notificationId"]]
	n.Lock()
	defer n.Unlock()
	log.Debugf("%+v", n.AvailableActions[0])
	notificationsLock.Unlock()

	switch data["action"] {
	case "buttonClicked":
		for _, actions := range n.AvailableActions {
			if actions.Text == data["button"] {
				n.SelectAction(actions.ID)
			}
		}
	default:
		log.Debugf("SnoreToast-Action %s not implemented yet")
	}
}

// Cancel cancels the notification.
func (n *Notification) Cancel() {
	//TODO
}

//Snoretoast helper-Functions:

func snoreToastStrToMap(in string) map[string]string {
	ret := make(map[string]string)

	for _, el := range strings.Split(in, ";") {
		if el == "" {
			continue
		}

		kv := strings.Split(el, "=")
		if len(kv) != 2 {
			log.Warning("SnoreToast-Callback: " + el + " cannot be parsed in Key=Value")
			continue
		}

		ret[kv[0]] = kv[1]
	}

	return ret
}

func buildSnoreToastButtonArgument(a []*Action) (text string) {
	temp := make([]string, 0, len(a))
	for _, elem := range a {
		if elem.Text != "" {
			temp = append(temp, elem.Text)
		}
	}
	return strings.Join(temp, ";")
}

//Generel helper-Functions:

func asyncCmd(cmd *exec.Cmd) {
	log.Debugf("Run snoretoast:%+v", cmd.Args)

	err := cmd.Run()

	if err != nil {
		//TODO
	}
}

func readWstrConnToStr(conn net.Conn) string {
	defer conn.Close()

	var bufferslice []byte

readloop:
	for {
		buffer := make([]byte, 100)

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
	appPath := filepath.Join(databaseDir, "portmaster-control")
	if runtime.GOOS == "windows" {
		appPath += ".exe"
	}

	// get path
	cmd := exec.Command(appPath, "show", what, "--db", databaseDir)
	ret, err := cmd.Output()

	return strings.TrimSpace(string(ret)), err
}
