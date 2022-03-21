package main

import (
	"io/ioutil"
	"path/filepath"
	"sync"

	"github.com/safing/portmaster-ui/notifier/icons"
)

var (
	appIconEnsureOnce = new(sync.Once)
	appIconPath       string
)

func ensureAppIcon() (location string, err error) {
	appIconEnsureOnce.Do(func() {
		if appIconPath == "" {
			appIconPath = filepath.Join(dataDir, "exec", "portmaster.png")
		}
		err = ioutil.WriteFile(appIconPath, icons.PNG, 0o0644)
	})

	return appIconPath, err
}
