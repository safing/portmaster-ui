//go:generate goversioninfo -64

package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/safing/portbase/info"
	"github.com/safing/portbase/log"
	"github.com/safing/portbase/modules"

	"github.com/zserge/webview"
)

var (
	dataDir     string
	databaseDir string
	urlFlag     string
	showVersion bool

	url = "http://127.0.0.1:817/"
)

func init() {
	flag.StringVar(&dataDir, "data", "", "set data directory")
	flag.StringVar(&databaseDir, "db", "", "alias to --data (deprecated)")
	flag.BoolVar(&showVersion, "version", false, "show version and exit")
}

func main() {
	// parse flags
	flag.Parse()

	// set meta info
	info.Set("Portmaster App", "0.1.8", "GPLv3", false)

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
	if showVersion {
		fmt.Println(info.FullVersion())
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
	err = log.Start()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to start logging: %s\n", err)
		os.Exit(1)
	}

	// configure
	// using v0.1.1: https://github.com/zserge/webview/tree/0.1.1
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
		// handle invokes
		ExternalInvokeCallback: handleExternalInvokeCallback,
	}
	wv := webview.New(settings)

	// register helper to open links in default browser
	err = registerSystemAPI(wv)
	if err != nil {
		log.Warningf("failed to register system api: %s", err)
	}

	// listen for interrupts
	go shutdownHandler(wv)

	// render
	wv.SetColor(68, 68, 68, 1)
	wv.Run()
}

func handleExternalInvokeCallback(wv webview.WebView, data string) {
	switch data {
	case "DOMContentLoaded":
		// finished loading

		// register helper to open links in default browser
		err := registerSystemAPI(wv)
		if err != nil {
			log.Warningf("failed to register system api: %s", err)
		}
	}
}

func shutdownHandler(wv webview.WebView) {
	// catch interrupt for clean shutdown
	signalCh := make(chan os.Signal, 1)
	signal.Notify(
		signalCh,
		os.Interrupt,
		syscall.SIGHUP,
		syscall.SIGINT,
		syscall.SIGTERM,
		syscall.SIGQUIT,
	)

	// wait for shutdown
	<-signalCh
	fmt.Println(" <INTERRUPT>")
	log.Warning("program was interrupted, shutting down")

	// exit
	wv.Dispatch(wv.Exit)
}
