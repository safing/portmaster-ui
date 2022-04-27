package main

import (
	"fmt"
	"time"

	// Works:
	// "github.com/getlantern/systray"

	// Does not work:
	"fyne.io/systray"

	"github.com/safing/portmaster-ui/notifier/icons"
)

func main() {
	systray.SetIcon(icons.GreenPNG)
	systray.Run(onReady, nil)
}

func onReady() {
	go iconChanger()
}

func iconChanger() {
	var i int
	for {
		time.Sleep(250 * time.Millisecond)

		systray.SetIcon(icons.ColoredIcons[i])
		fmt.Printf("set to icon %d\n", i)

		i++
		i %= 4
	}
}
