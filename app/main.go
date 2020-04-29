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

	// create webview
	wv := webview.New(true)
	go shutdownHandler(wv)

	// configure
	wv.SetTitle("Portmaster")
	wv.SetSize(1400, 900, webview.HintNone)
	wv.Navigate(url)

	// register helper to open links in default browser
	err = registerUrlOpener(wv)
	if err != nil {
		log.Warningf("failed to register URL opener: %s", err)
	}

	// render
	wv.Run()
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
	wv.Dispatch(wv.Destroy)
}
