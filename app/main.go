//go:generate goversioninfo -64

package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/safing/portbase/modules"

	"github.com/safing/portbase/info"
	"github.com/safing/portbase/log"
	"github.com/zserge/webview"
)

var (
	dataDir     string
	databaseDir string
	urlFlag     string

	url = "http://127.0.0.1:817/"
)

func init() {
	flag.StringVar(&dataDir, "data", "", "set data directory")
	flag.StringVar(&databaseDir, "db", "", "alias to --data (deprecated)")
}

func main() {
	// parse flags
	flag.Parse()

	// set meta info
	info.Set("Portmaster App", "0.1.7", "GPLv3", false)

	// check if meta info is ok
	err := info.CheckVersion()
	if err != nil {
		fmt.Println("compile error: please compile using the provided build script")
		os.Exit(1)
	}

	// print help
	if modules.HelpFlag {
		flag.Usage()
		os.Exit(0)
	}

	// print version
	if info.PrintVersion() {
		os.Exit(0)
	}

	// backwards compatibility
	if dataDir == "" {
		dataDir = databaseDir
	}

	// check data dir
	if dataDir == "" {
		fmt.Fprintln(os.Stderr, "please set the data directory using --data=/path/to/data/dir")
		os.Exit(1)
	}

	// backwards compatibility
	databaseDir = dataDir

	// set custom url for development
	if urlFlag != "" {
		url = urlFlag
	}

	// start log writer
	log.Start()

	// configure
	settings := webview.Settings{
		// WebView main window title
		Title: "Portmaster",
		// URL to open in a webview
		URL: url,
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
	go shutdownHandler(wv)

	wv.SetColor(68, 68, 68, 1)
	wv.Run()
}

func shutdownHandler(wv webview.WebView) {
	// catch interrupt for clean shutdown
	signalCh := make(chan os.Signal)
	signal.Notify(
		signalCh,
		os.Interrupt,
		syscall.SIGHUP,
		syscall.SIGINT,
		syscall.SIGTERM,
		syscall.SIGQUIT,
	)

	// wait for shutdown
	select {
	case <-signalCh:
		fmt.Println(" <INTERRUPT>")
		log.Warning("program was interrupted, shutting down")
	}

	// exit
	wv.Dispatch(wv.Exit)
}
