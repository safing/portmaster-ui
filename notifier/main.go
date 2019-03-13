package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"runtime/pprof"
	"sync"
	"syscall"
	"time"

	"github.com/Safing/portbase/api/client"
	"github.com/Safing/portbase/info"
	"github.com/Safing/portbase/log"
)

var (
	printStackOnExit bool

	apiClient = client.NewClient("127.0.0.1:18")

	mainCtx, cancelMainCtx = context.WithCancel(context.Background())
	mainWg                 = &sync.WaitGroup{}
)

func init() {
	flag.BoolVar(&printStackOnExit, "print-stack-on-exit", false, "prints the stack before of shutting down")

	runtime.GOMAXPROCS(2)
}

func main() {
	// parse flags
	flag.Parse()

	// set meta info
	info.Set("Portmaster Notifier", "0.1.2", "GPLv3", false)

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

	// start log writer
	log.Start()

	// connect to API
	go apiClient.StayConnected()

	// start subsystems
	go tray()
	go statusClient()
	go notifClient()

	// Shutdown
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
	<-signalCh
	fmt.Println(" <INTERRUPT>")
	log.Warning("program was interrupted, shutting down.")

	if printStackOnExit {
		fmt.Println("=== PRINTING STACK ===")
		pprof.Lookup("goroutine").WriteTo(os.Stdout, 1)
		fmt.Println("=== END STACK ===")
	}
	go func() {
		time.Sleep(3 * time.Second)
		fmt.Println("===== TAKING TOO LONG FOR SHUTDOWN - PRINTING STACK TRACES =====")
		pprof.Lookup("goroutine").WriteTo(os.Stdout, 2)
		os.Exit(1)
	}()

	// shutdown
	cancelMainCtx()
	mainWg.Wait()

	apiClient.Shutdown()
	exitTray()
	log.Shutdown()

	os.Exit(0)
}
