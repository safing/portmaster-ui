//go:generate goversioninfo -64

package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/safing/portbase/info"
	"github.com/zserge/webview"
)

var (
	databaseDir string
)

func init() {
	flag.StringVar(&databaseDir, "db", "", "set database directory (for starting UI)")
}

func main() {
	// parse flags
	flag.Parse()

	// set meta info
	info.Set("Portmaster App", "0.1.6", "GPLv3", false)

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

	settings := webview.Settings{
		// WebView main window title
		Title: "Portmaster",
		// URL to open in a webview
		URL: "http://127.0.0.1:817/",
		// Window width in pixels
		Width: 1400,
		// Window height in pixels
		Height: 900,
		// Allows/disallows window resizing
		Resizable: true,
		// Enable debugging tools (Linux/BSD/MacOS, on Windows use Firebug)
		Debug: true,
	}

	wv := webview.New(settings)
	wv.SetColor(68, 68, 68, 1)
	wv.Run()

}
