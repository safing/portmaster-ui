package main

import (
	"fmt"
	"sync"
	"unsafe"

	"github.com/safing/portbase/info"
	"github.com/safing/portbase/log"
	"github.com/safing/portmaster/updates/helper"

	"golang.org/x/sys/windows"
)

type NotificationID int64

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

	initialize           *windows.Proc
	isInitialized        *windows.Proc
	createNotification   *windows.Proc
	deleteNotification   *windows.Proc
	addButton            *windows.Proc
	setImage             *windows.Proc
	showNotification     *windows.Proc
	hideNotification     *windows.Proc
	setActivatedCallback *windows.Proc
	setDismissedCallback *windows.Proc
	setFailedCallback    *windows.Proc
}

var (
	lib            *NotifierLib
	libInitialized bool
	notifsByID     = make(map[NotificationID]*Notification)
	notifsByIDLock sync.Mutex
)

func loadDLL() error {
	new := &NotifierLib{}

	// get dll path
	dllPath, err := getDllPath()
	if err != nil {
		return fmt.Errorf("failed to get path to notifier dll %q", err)
	}
	// load dll
	new.dll, err = windows.LoadDLL(dllPath)
	if err != nil {
		return fmt.Errorf("failed to load notifier dll %q", err)
	}

	// load functions
	new.initialize, err = new.dll.FindProc("PortmasterToastInitialize")
	if err != nil {
		return fmt.Errorf("PortmasterToastInitialize not found %q", err)
	}

	new.isInitialized, err = new.dll.FindProc("PortmasterToastIsInitialized")
	if err != nil {
		return fmt.Errorf("PortmasterToastIsInitialized not found %q", err)
	}

	new.createNotification, err = new.dll.FindProc("PortmasterToastCreateNotification")
	if err != nil {
		return fmt.Errorf("PortmasterToastCreateNotification not found %q", err)
	}

	new.deleteNotification, err = new.dll.FindProc("PortmasterToastDeleteNotification")
	if err != nil {
		return fmt.Errorf("PortmasterToastDeleteNotification not found %q", err)
	}

	new.addButton, err = new.dll.FindProc("PortmasterToastAddButton")
	if err != nil {
		return fmt.Errorf("PortmasterToastAddButton not found %q", err)
	}

	new.setImage, err = new.dll.FindProc("PortmasterToastSetImage")
	if err != nil {
		return fmt.Errorf("PortmasterToastSetImage not found %q", err)
	}

	new.showNotification, err = new.dll.FindProc("PortmasterToastShow")
	if err != nil {
		return fmt.Errorf("PortmasterToastShow not found %q", err)
	}

	new.setActivatedCallback, err = new.dll.FindProc("PortmasterToastActivatedCallback")
	if err != nil {
		return fmt.Errorf("PortmasterActivatedCallback not found %q", err)
	}

	new.setDismissedCallback, err = new.dll.FindProc("PortmasterToastDismissedCallback")
	if err != nil {
		return fmt.Errorf("PortmasterToastDismissedCallback not found %q", err)
	}

	new.setFailedCallback, err = new.dll.FindProc("PortmasterToastFailedCallback")
	if err != nil {
		return fmt.Errorf("PortmasterToastFailedCallback not found %q", err)
	}

	new.hideNotification, err = new.dll.FindProc("PortmasterToastHide")
	if err != nil {
		return fmt.Errorf("PortmasterToastHide not found %q", err)
	}

	lib = new
	return nil
}

// API called functions:

// Show shows the notification.
func (n *Notification) Show() {
	if lib == nil {
		log.Error("notify: library not properly loaded")
		return
	}

	if !libInitialized {
		log.Error("notify: not initialized")
	}

	lib.Lock()
	defer lib.Unlock()

	title, _ := windows.UTF16PtrFromString(n.Title)
	message, _ := windows.UTF16PtrFromString(n.Message)
	titleP := unsafe.Pointer(title)
	messageP := unsafe.Pointer(message)
	if lib != nil {
		// Create new notification object
		notificationTemplate, _, err := lib.createNotification.Call(uintptr(titleP), uintptr(messageP))
		if notificationTemplate == 0 {
			log.Errorf("notify: failed to create notification: %q", err)
		}
		// Make sure memory is freed when done
		defer func() { _, _, _ = lib.deleteNotification.Call(notificationTemplate) }()

		// Set Portmaster icon.
		iconLocation, err := ensureAppIcon()
		if err != nil {
			log.Warningf("notify: failed to write icon: %s", err)
		}
		iconPathUTF, _ := windows.UTF16PtrFromString(iconLocation)
		iconPathP := unsafe.Pointer(iconPathUTF)
		_, _, _ = lib.setImage.Call(notificationTemplate, uintptr(iconPathP))

		// Set all the required actions
		for _, action := range n.AvailableActions {
			textUTF, _ := windows.UTF16PtrFromString(action.Text)
			textP := unsafe.Pointer(textUTF)
			_, _, _ = lib.addButton.Call(notificationTemplate, uintptr(textP))
		}

		// Show notification and delete c notification object
		rc, _, err := lib.showNotification.Call(notificationTemplate)
		if int64(rc) == -1 {
			log.Errorf("notify: failed to show notification: %q", err)
		}
		n.systemID = NotificationID(rc)

		// Link system id to the notification object
		notifsByIDLock.Lock()
		notifsByID[NotificationID(rc)] = n
		notifsByIDLock.Unlock()
	}
}

// Cancel cancels the notification.
func (n *Notification) Cancel() {
	if lib == nil {
		log.Errorf("notify: notification library not properly loaded")
		return
	}

	if !libInitialized {
		log.Error("notify: not initialized")
	}

	lib.Lock()
	defer lib.Unlock()

	// the hide function deletes the notification
	_, _, _ = lib.hideNotification.Call(uintptr(n.systemID))

	notifsByIDLock.Lock()
	delete(notifsByID, n.systemID)
	notifsByIDLock.Unlock()
}

func actionListener() {
	_ = initialize()
	// making sure that everything is loaded
	libInitialized = isInitialized()
	// Block until notified
	<-mainCtx.Done()
}

// portmasterNotificationCallback is a callback from the c library
func portmasterNotificationActivatedCallback(id NotificationID, actionIndex int32) uintptr {
	// The user clicked on the notification (not a button), open the portmaster
	if actionIndex == -1 {
		launchApp()
		return 0
	}

	// The user click one of the buttons
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

// portmasterNotificationDismissedCallback is a callback from the c library
func portmasterNotificationDismissedCallback(id NotificationID, reason int32) uintptr {
	// Failure or user dismissal of notification
	if reason == 0 {
		notifsByIDLock.Lock()
		delete(notifsByID, id)
		notifsByIDLock.Unlock()
	}
	return 0
}

func initialize() bool {
	// load the c library
	err := loadDLL()
	if err != nil {
		log.Errorf("notify: notification library not properly loaded %s", err)
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

	// they are needed as unsafe pointers
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

	// Initialize action callbacks
	callback := windows.NewCallback(portmasterNotificationActivatedCallback)
	rc, _, err = lib.setActivatedCallback.Call(callback)

	if rc != 1 {
		log.Errorf("notify: failed to initialize activated callback %q", err)
		return false
	}

	callback = windows.NewCallback(portmasterNotificationDismissedCallback)
	rc, _, err = lib.setDismissedCallback.Call(callback)

	if rc != 1 {
		log.Errorf("notify: failed to initialize dismissed callback %q", err)
		return false
	}

	callback = windows.NewCallback(portmasterNotificationDismissedCallback)
	rc, _, err = lib.setFailedCallback.Call(callback)

	if rc != 1 {
		log.Errorf("notify: failed to initialize failed callback %q", err)
		return false
	}

	return true
}

func isInitialized() bool {
	if lib == nil {
		return false
	}
	lib.Lock()
	defer lib.Unlock()
	rc, _, _ := lib.isInitialized.Call()
	return rc == 1
}

func getDllPath() (string, error) {
	if dataDir == "" {
		return "", fmt.Errorf("dataDir is empty")
	}

	// Aks the registry for the dll path
	identifier := helper.PlatformIdentifier("notifier/portmaster-wintoast.dll")
	file, err := registry.GetFile(identifier)
	if err != nil {
		return "", err
	}
	return file.Path(), nil
}
