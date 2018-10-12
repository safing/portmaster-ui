package main

import (
	"fmt"
	"net/http"
	"os"
	"path"
	"sync"

	resources "github.com/cookieo9/resources-go"
	"github.com/gorilla/mux"

	"github.com/Safing/portbase/api"
	"github.com/Safing/portbase/log"
	"github.com/Safing/portmaster/ui"
)

var (
	apps       = make(map[string]*resources.BundleSequence)
	appsLock   sync.RWMutex
	assets     *resources.BundleSequence
	assetsLock sync.RWMutex
)

func main() {
	if len(os.Args) < 2 {
		fmt.Printf("usage: %s <listen address>\n", os.Args[0])
		os.Exit(1)
	}
	address := os.Args[1]

	router := mux.NewRouter()
	router.Use(api.RequestLogger)
	router.HandleFunc("/assets/{resPath:[a-zA-Z0-9/\\._-]+}", ServeAssets("../ui-assets"))
	router.HandleFunc("/app/{appName:[a-z]+}/", ServeApps("."))
	router.HandleFunc("/app/{appName:[a-z]+}/{resPath:[a-zA-Z0-9/\\._-]+}", ServeApps("."))
	router.HandleFunc("/", ui.RedirectToControl)

	log.Start()
	log.Infof("api: starting to listen on %s", address)
	log.Errorf("api: failed to listen on %s: %s", address, http.ListenAndServe(address, router))
}

func ServeApps(basePath string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		vars := mux.Vars(r)
		appName, ok := vars["appName"]
		if !ok {
			http.Error(w, "missing app name", http.StatusBadRequest)
			return
		}

		resPath, ok := vars["resPath"]
		if !ok {
			resPath = "index.html"
		}

		appsLock.RLock()
		bundle, ok := apps[appName]
		appsLock.RUnlock()
		if ok {
			ui.ServeFileFromBundle(w, r, bundle, resPath)
			return
		}

		newBundle := resources.OpenFS(path.Join(basePath, appName, "dist"))
		bundle = &resources.BundleSequence{newBundle}
		appsLock.Lock()
		apps[appName] = bundle
		appsLock.Unlock()

		ui.ServeFileFromBundle(w, r, bundle, resPath)
	}
}

func ServeAssets(basePath string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		vars := mux.Vars(r)
		resPath, ok := vars["resPath"]
		if !ok {
			http.Error(w, "missing resource path", http.StatusBadRequest)
			return
		}

		assetsLock.RLock()
		bundle := assets
		assetsLock.RUnlock()
		if bundle != nil {
			ui.ServeFileFromBundle(w, r, bundle, resPath)
			return
		}

		newBundle := resources.OpenFS(basePath)
		bundle = &resources.BundleSequence{newBundle}
		assetsLock.Lock()
		assets = bundle
		assetsLock.Unlock()

		ui.ServeFileFromBundle(w, r, bundle, resPath)
	}
}
