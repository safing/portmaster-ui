package main

import (
	"fmt"
	"os"

	"github.com/Safing/portbase/info"
	"github.com/zserge/webview"
)

func main() {
	// set meta info
	info.Set("Portmaster App", "0.1.2", "GPLv3", false)

	// check if meta info is ok
	err := info.CheckVersion()
	if err != nil {
		fmt.Println("compile error: please compile using the provided build script")
		os.Exit(1)
	}

	// react to version flag
	if info.PrintVersion() {
		os.Exit(0)
	}

	webview.Open("Portmaster", "http://127.0.0.1:18/", 1400, 900, true)
}
