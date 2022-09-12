package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"unsafe"

	"github.com/safing/portbase/info"
	"github.com/safing/portbase/log"

	"golang.org/x/sys/windows"
)

const (
	appName     = "Portmaster"
	company     = "Safing ICS Technologies GmbH"
	productName = "Portmaster"
	subProduct  = "notifier"
)

// WinNotify holds the DLL handle.
type NotifierLib struct {
	sync.RWMutex

	dll *windows.DLL

	initialize         *windows.Proc
	isInitialized      *windows.Proc
	createNotification *windows.Proc
	addButton          *windows.Proc
	setImage           *windows.Proc
	showNotification   *windows.Proc
	hideNotification   *windows.Proc
	setCallback        *windows.Proc
}

var (
	lib            *NotifierLib
	notifsByID     = make(map[uint64]*Notification)
	notifsByIDLock sync.Mutex
)

func init() {
	new := &NotifierLib{}

	// get dll path
	dllPath, err := getPath("notifier-winnotify")
	if err != nil {
		log.Errorf("notify: failed to get path to notifier-winnotify dll %q", err)
		return
	}
	// load dll
	new.dll, err = windows.LoadDLL(dllPath)
	if err != nil {
		log.Errorf("notify: failed to load notifier-winnotify dll %q", err)
		return
	}

	// load functions
	new.initialize, err = new.dll.FindProc("PortmasterToastInitialize")
	if err != nil {
		log.Errorf("notify: PortmasterToastInitialize not found %q", err)
		return
	}

	new.isInitialized, err = new.dll.FindProc("PortmasterToastIsInitialized")
	if err != nil {
		log.Errorf("notify: PortmasterToastIsInitialized not found %q", err)
		return
	}

	new.createNotification, err = new.dll.FindProc("PortmasterToastCreateNotification")
	if err != nil {
		log.Errorf("notify: PortmasterToastCreateNotification not found %q", err)
		return
	}

	new.addButton, err = new.dll.FindProc("PortmasterToastAddButton")
	if err != nil {
		log.Errorf("notify: PortmasterToastAddButton not found %q", err)
		return
	}

	new.setImage, err = new.dll.FindProc("PortmasterToastSetImage")
	if err != nil {
		log.Errorf("notify: PortmasterToastSetImage not found %q", err)
		return
	}

	new.showNotification, err = new.dll.FindProc("PortmasterToastShow")
	if err != nil {
		log.Errorf("notify: PortmasterToastShow not found %q", err)
		return
	}

	new.setCallback, err = new.dll.FindProc("PortmasterActivatedCallback")
	if err != nil {
		log.Errorf("notify: PortmasterActivatedCallback not found %q", err)
		return
	}

	new.hideNotification, err = new.dll.FindProc("PortmasterToastHide")
	if err != nil {
		log.Errorf("notify: PortmasterToastHide not found %q", err)
		return
	}

	lib = new
}

// API called functions:

// Show shows the notification.
func (n *Notification) Show() {
	if lib == nil {
		log.Error("notify: library not properly loaded")
		return
	}

	if !isInitialized() {
		initialize()
	}

	lib.Lock()
	defer lib.Unlock()

	title, _ := windows.UTF16PtrFromString(n.Title)
	message, _ := windows.UTF16PtrFromString(n.Message)
	titleP := unsafe.Pointer(title)
	messageP := unsafe.Pointer(message)
	if lib != nil {
		// Create new notification object
		notificationPtr, _, err := lib.createNotification.Call(uintptr(titleP), uintptr(messageP))
		if notificationPtr == 0 {
			log.Errorf("notify: failed to create notification: %q", err)
		}

		// Set Portmaster icon.
		iconLocation, err := ensureAppIcon()
		if err != nil {
			log.Warningf("notify: failed to write icon: %s", err)
		}
		iconPathUTF, _ := windows.UTF16PtrFromString(iconLocation)
		iconPathP := unsafe.Pointer(iconPathUTF)
		_, _, _ = lib.setImage.Call(notificationPtr, uintptr(iconPathP))

		// Set all the required actions
		for _, action := range n.AvailableActions {
			textUTF, _ := windows.UTF16PtrFromString(action.Text)
			textP := unsafe.Pointer(textUTF)
			_, _, _ = lib.addButton.Call(notificationPtr, uintptr(textP))
		}

		// Show notification and delete c notification object
		rc, _, err := lib.showNotification.Call(notificationPtr)
		if int64(rc) == -1 {
			log.Errorf("notify: failed to show notification: %q", err)
		}

		// Link system id to the notification object
		notifsByIDLock.Lock()
		defer notifsByIDLock.Unlock()
		notifsByID[uint64(rc)] = n
	}
}

// Cancel cancels the notification.
func (n *Notification) Cancel() {
	if lib == nil {
		log.Errorf("notify: notification library not properly loaded")
		return
	}

	lib.Lock()
	defer lib.Unlock()

	// Ignore errors
	_, _, _ = lib.hideNotification.Call(uintptr(n.systemID))
}

func actionListener() {
	// Block until notified
	<-mainCtx.Done()
}

// portmasterNotificationCallback is a callback from the c library
func portmasterNotificationCallback(id uint64, actionIndex int) uintptr {
	// Lock for notification map
	notifsByIDLock.Lock()
	defer notifsByIDLock.Unlock()

	// Get notified object
	notification := notifsByID[id]

	// Set selected action
	actionID := notification.AvailableActions[actionIndex].ID
	notification.SelectAction(actionID)

	delete(notifsByID, id)
	return 0
}

func initialize() bool {
	if lib == nil {
		log.Errorf("notify: notification library not properly loaded")
		return false
	}

	lib.Lock()
	defer lib.Unlock()

	// Initialize all necessary string for the notification meta data
	appNameUTF, _ := windows.UTF16PtrFromString(appName)
	companyUTF, _ := windows.UTF16PtrFromString(company)
	productNameUTF, _ := windows.UTF16PtrFromString(productName)
	subProductUTF, _ := windows.UTF16PtrFromString(subProduct)
	versionInfoUTF, _ := windows.UTF16PtrFromString(info.Version())

	// we need them as unsafe pointers
	appNameP := unsafe.Pointer(appNameUTF)
	companyP := unsafe.Pointer(companyUTF)
	productNameP := unsafe.Pointer(productNameUTF)
	subProductP := unsafe.Pointer(subProductUTF)
	versionInfoP := unsafe.Pointer(versionInfoUTF)

	// Initialize notifications
	rc, _, err := lib.initialize.Call(uintptr(appNameP), uintptr(companyP), uintptr(productNameP), uintptr(subProductP), uintptr(versionInfoP))
	if rc != 1 {
		log.Errorf("notify: failed to initialize notification library %q", err)
		return false
	}

	// Initialize action callback
	callback := windows.NewCallback(portmasterNotificationCallback)
	rc, _, err = lib.setCallback.Call(callback)

	if rc != 1 {
		log.Errorf("notify: failed to initialize notification library %q", err)
		return false
	}

	return true
}

func isInitialized() bool {
	lib.Lock()
	defer lib.Unlock()
	rc, _, _ := lib.isInitialized.Call()
	return rc == 1
}

func getPath(module string) (string, error) {
	// build path to app
	if dataDir == "" {
		return "", fmt.Errorf("failed to get Path for %s: dataDir is empty", module)
	}

	pmStartPath := filepath.Join(dataDir, "portmaster-start")
	if runtime.GOOS == "windows" {
		pmStartPath += ".exe"
	}

	// get path
	cmd := exec.Command(pmStartPath, "show", module, "--data", dataDir)
	ret, err := cmd.Output()

	if err != nil {
		err = fmt.Errorf("failed to execute command: %s", err)
	}

	return strings.TrimSpace(string(ret)), err
}
