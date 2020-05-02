package main

import (
	"github.com/safing/portbase/log"

	"github.com/skratchdot/open-golang/open"
	"github.com/zserge/webview"
)

func registerUrlOpener(wv webview.WebView) error {
	return wv.Bind("openWithOS", openWithOS)
}

func openWithOS(thing string) error {
	err := open.Run(thing)
	if err != nil {
		log.Warningf("failed to open %s: %s", thing, err)
	}
	return err
}
