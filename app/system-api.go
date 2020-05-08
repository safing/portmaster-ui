package main

import (
	"runtime"

	"github.com/safing/portbase/info"
	"github.com/safing/portbase/log"

	"github.com/skratchdot/open-golang/open"
	"github.com/zserge/webview"
)

// using v0.1.1 - example: https://github.com/zserge/webview/tree/0.1.1/examples/counter-go

type SystemAPI struct {
	OsName     string
	OsArch     string
	AppVersion string
	DataDir    string
}

func registerSystemAPI(wv webview.WebView) error {
	_, err := wv.Bind("system", &SystemAPI{
		OsName:     runtime.GOOS,
		OsArch:     runtime.GOARCH,
		AppVersion: info.Version(),
		DataDir:    dataDir,
	})
	return err
}

func (api *SystemAPI) Open(thing string) error {
	err := open.Run(thing)
	if err != nil {
		log.Warningf("failed to open %s: %s", thing, err)
	}
	return err
}

func (api *SystemAPI) OpenDataDir() error {
	return api.Open(dataDir)
}
