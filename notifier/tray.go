package main

import (
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/getlantern/systray"
	"github.com/safing/portbase/log"
)

var (
	trayLock       sync.Mutex
	displayedLevel uint8

	menuLevelItems     [4]*systray.MenuItem
	menuItemThreatInfo *systray.MenuItem
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
	systray.SetIcon(securityLevelIcons[SecurityLevelOffline])
	// systray.SetTitle("Portmaster Notifier") // Don't set title, as it may be displayed in full in the menu/tray bar. (Ubuntu)
	systray.SetTooltip("The Portmaster Notifier alerts you of important things and prompts you for decisions if necessary.")

	// menu: open app
	if dataDir != "" {
		menuItemOpenApp := systray.AddMenuItem("Open App", "")
		go clickListener(menuItemOpenApp, func() {
			// build path to app
			appPath := filepath.Join(dataDir, "portmaster-control")
			if runtime.GOOS == "windows" {
				appPath += ".exe"
			}

			// start app
			cmd := exec.Command(appPath, "run", "app", "--db", dataDir)
			err := cmd.Start()
			if err != nil {
				log.Warningf("failed to start app: %s", err)
				return
			}
			err = cmd.Process.Release()
			if err != nil {
				log.Warningf("failed to release app process: %s", err)
			}
		})
		systray.AddSeparator()
	}

	// menu: security levels
	menuItemAutopilot := systray.AddMenuItem("Autopilot", "")
	go clickListener(menuItemAutopilot, func() {
		SelectSecurityLevel(0)
	})

	menuItemLevelDynamic := systray.AddMenuItem("Level Dynamic", "")
	go clickListener(menuItemLevelDynamic, func() {
		SelectSecurityLevel(SecurityLevelDynamic)
	})

	menuItemLevelSecure := systray.AddMenuItem("Level Secure", "")
	go clickListener(menuItemLevelSecure, func() {
		SelectSecurityLevel(SecurityLevelSecure)
	})

	menuItemLevelFortess := systray.AddMenuItem("Level Fortess", "")
	go clickListener(menuItemLevelFortess, func() {
		SelectSecurityLevel(SecurityLevelFortress)
	})

	menuLevelItems = [4]*systray.MenuItem{menuItemAutopilot, menuItemLevelDynamic, menuItemLevelSecure, menuItemLevelFortess}

	// menu: threat info
	systray.AddSeparator()
	menuItemThreatInfo = systray.AddMenuItem("Loading threat information...", "")
	menuItemThreatInfo.Disable()

	// menu: quit
	systray.AddSeparator()
	menuItemQuit := systray.AddMenuItem("Quit Notifier", "")
	go clickListener(menuItemQuit, func() {
		cancelMainCtx()
	})
}

func onExit() {

}

func displaySelectedLevel(level uint8) {
	trayLock.Lock()
	defer trayLock.Unlock()

	// adjust level number to array
	if level == 4 {
		level = 3
	}

	for index, menuItem := range menuLevelItems {
		if menuItem == nil {
			continue
		}

		if index == int(level) {
			if !menuItem.Checked() {
				log.Tracef("tray: check security level %s", fmtLevel(uint8(index), false))
				menuItem.Check()
			}
		} else {
			if menuItem.Checked() {
				log.Tracef("tray: uncheck security level %s", fmtLevel(uint8(index), false))
				menuItem.Uncheck()
			}
		}
	}

	log.Infof("tray: set selected security level to %s", fmtLevel(level, false))
}

func displayActiveLevel(level uint8) {
	trayLock.Lock()
	defer trayLock.Unlock()

	if level != displayedLevel {
		displayedLevel = level
	}

	// adjust level number to array
	if level == 4 {
		level = 3
	}

	systray.SetIcon(securityLevelIcons[level])

	log.Infof("tray: set active security level to %s", fmtLevel(level, true))
}

func displayThreatInfo(info string) {
	trayLock.Lock()
	defer trayLock.Unlock()
	menuItemThreatInfo.SetTitle(info)
	log.Infof("tray: set threat info to \"%s\"", info)
}

func clickListener(item *systray.MenuItem, fn func()) {
	for range item.ClickedCh {
		fn()
	}
}
