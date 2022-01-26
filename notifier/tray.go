package main

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/safing/portmaster-ui/notifier/icons"

	"github.com/getlantern/systray"
	"github.com/safing/portbase/log"
)

const (
	shortenStatusMsgTo = 40
)

var (
	trayLock sync.Mutex

	activeIconID    int = -1
	activeStatusMsg     = ""

	menuItemStatusMsg *systray.MenuItem
	// TODO: Enable when auto detection is available.
	// menuItemAutoDetect *systray.MenuItem
	menuItemTrusted     *systray.MenuItem
	menuItemUntrusted   *systray.MenuItem
	menuItemDanger      *systray.MenuItem
	menuItemRateNetwork *systray.MenuItem
)

func init() {
	// lock until ready
	trayLock.Lock()
}

func tray() {
	systray.Run(onReady, onExit)
}

func exitTray() {
	systray.Quit()
}

func onReady() {
	// unlock when ready
	defer trayLock.Unlock()

	// icon
	systray.SetIcon(icons.ColoredIcons[icons.RedID])
	// systray.SetTitle("Portmaster Notifier") // Don't set title, as it may be displayed in full in the menu/tray bar. (Ubuntu)
	systray.SetTooltip("The Notifier provides a minimal interface to the Portmaster and sends notifications to your desktop.")

	// menu: open app
	if dataDir != "" {
		menuItemOpenApp := systray.AddMenuItem("Open App", "")
		go clickListener(menuItemOpenApp, launchApp)
		systray.AddSeparator()
	}

	// menu: status

	menuItemStatusMsg = systray.AddMenuItem("Loading...", "")
	menuItemStatusMsg.Disable()
	systray.AddSeparator()

	// menu: network rating

	menuItemRateNetwork = systray.AddMenuItem("Rate Your Network", "")
	menuItemRateNetwork.Disable()

	// TODO: Enable when auto detection is available.
	// menuItemAutoDetect = systray.AddMenuItem("Auto Detect", "")
	// go clickListener(menuItemAutoDetect, func() {
	// 	SelectSecurityLevel(SecurityLevelAutoDetect)
	// })

	menuItemTrusted = systray.AddMenuItemCheckbox("Trusted", "Home", false)
	go clickListener(menuItemTrusted, func() {
		SelectSecurityLevel(SecurityLevelTrusted)
	})

	menuItemUntrusted = systray.AddMenuItemCheckbox("Untrusted", "Public Wifi", false)
	go clickListener(menuItemUntrusted, func() {
		SelectSecurityLevel(SecurityLevelUntrusted)
	})

	menuItemDanger = systray.AddMenuItemCheckbox("Danger", "Hacked Network", false)
	go clickListener(menuItemDanger, func() {
		SelectSecurityLevel(SecurityLevelDanger)
	})

	// menu: quit
	systray.AddSeparator()
	closeTray := systray.AddMenuItem("Close Tray Notifier", "")
	go clickListener(closeTray, func() {
		cancelMainCtx()
	})
	shutdownPortmaster := systray.AddMenuItem("Shut Down Portmaster", "")
	go clickListener(shutdownPortmaster, func() {
		TriggerShutdown()
		time.Sleep(1 * time.Second)
		cancelMainCtx()
	})
}

func onExit() {

}

func triggerTrayUpdate() {
	// TODO: Deduplicate triggers.
	go updateTray()
}

// updateTray update the state of the tray depending on the currently available information.
func updateTray() {
	// Get current information.
	systemStatus := GetStatus()
	failureID, failureMsg := GetFailure()

	trayLock.Lock()
	defer trayLock.Unlock()

	// Select icon and status message to show.
	newIconID := icons.GreenID
	newStatusMsg := "Secure."
	switch {
	case shuttingDown.IsSet():
		newIconID = icons.RedID
		newStatusMsg = "Shutting Down Portmaster"

	case restarting.IsSet():
		newIconID = icons.YellowID
		newStatusMsg = "Restarting Portmaster"

	case !connected.IsSet():
		newIconID = icons.RedID
		newStatusMsg = "Connecting to Portmaster"

	case systemStatus.ActiveSecurityLevel < systemStatus.ThreatMitigationLevel:
		newIconID = icons.RedID
		newStatusMsg = fmt.Sprintf(
			"Threat detected, please switch to %s or Auto Detect for mitigation.",
			fmtSecurityLevel(systemStatus.ThreatMitigationLevel),
		)

	case failureID == FailureError:
		newIconID = icons.RedID
		newStatusMsg = failureMsg

	case failureID == FailureWarning:
		newIconID = icons.YellowID
		newStatusMsg = failureMsg
	}

	// Set icon if changed.
	if newIconID != activeIconID {
		activeIconID = newIconID
		systray.SetIcon(icons.ColoredIcons[activeIconID])
	}

	// Set message if changed.
	if newStatusMsg != activeStatusMsg {
		activeStatusMsg = newStatusMsg

		// Shorten message if too long.
		shortenedMsg := activeStatusMsg
		if len(shortenedMsg) > shortenStatusMsgTo && strings.Contains(shortenedMsg, ". ") {
			shortenedMsg = strings.SplitN(shortenedMsg, ". ", 2)[0]
		}
		if len(shortenedMsg) > shortenStatusMsgTo {
			shortenedMsg = shortenedMsg[:shortenStatusMsgTo] + "..."
		}

		menuItemStatusMsg.SetTitle("Status: " + shortenedMsg)
	}

	// Set security levels on menu item.

	// TODO: Enable when auto detection is available.
	// if systemStatus.SelectedSecurityLevel == SecurityLevelAutoDetect {
	// 	menuItemAutoDetect.Check()
	// } else {
	// 	menuItemAutoDetect.Uncheck()
	// }

	switch systemStatus.ActiveSecurityLevel {
	case SecurityLevelAutoDetect:
		// This will be the case when offline.
		menuItemTrusted.Uncheck()
		menuItemUntrusted.Uncheck()
		menuItemDanger.Uncheck()
	case SecurityLevelTrusted:
		menuItemTrusted.Check()
		menuItemUntrusted.Uncheck()
		menuItemDanger.Uncheck()
	case SecurityLevelUntrusted:
		menuItemTrusted.Uncheck()
		menuItemUntrusted.Check()
		menuItemDanger.Uncheck()
	case SecurityLevelDanger:
		menuItemTrusted.Uncheck()
		menuItemUntrusted.Uncheck()
		menuItemDanger.Check()
	}

	items := []*systray.MenuItem{
		menuItemRateNetwork,
		menuItemTrusted,
		menuItemUntrusted,
		menuItemDanger,
	}

	for _, i := range items {
		if i == nil {
			continue
		}
		if networkRatingEnabled.IsSet() {
			log.Debugf("%s: showing item", i.String())
			i.Show()
		} else {
			log.Debugf("%s: hiding item", i.String())
			i.Hide()
		}
	}

	log.Infof(
		"tray: set to selected=%s active=%s icon=%d msg=%q",
		fmtSecurityLevel(systemStatus.SelectedSecurityLevel),
		fmtSecurityLevel(systemStatus.ActiveSecurityLevel),
		newIconID,
		newStatusMsg,
	)
}

func clickListener(item *systray.MenuItem, fn func()) {
	for range item.ClickedCh {
		fn()
	}
}

func launchApp() {
	// build path to app
	pmStartPath := filepath.Join(dataDir, "portmaster-start")
	if runtime.GOOS == "windows" {
		pmStartPath += ".exe"
	}

	// start app
	cmd := exec.Command(pmStartPath, "app", "--data", dataDir)
	err := cmd.Start()
	if err != nil {
		log.Warningf("failed to start app: %s", err)
		return
	}

	// Use cmd.Wait() instead of cmd.Process.Release() to properly release its resources.
	// See https://github.com/golang/go/issues/36534
	go func() {
		err := cmd.Wait()
		if err != nil {
			log.Warningf("failed to wait/release app process: %s", err)
		}
	}()
}
