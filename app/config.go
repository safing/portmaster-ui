package main

import (
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/formats/dsd"
)

var (
	apiClient = client.NewClient("127.0.0.1:817")
	initAPI   sync.Once

	errNotFound = errors.New("database entry not found")
)

type WindowConfig struct {
	Height int
	Width  int
}

func getWindowConfig() (*WindowConfig, error) {
	window := &WindowConfig{}
	return window, getRecord(window)
}

func getRecord(dataStruct interface{}) error {
	initAPI.Do(connectToAPI)

	errs := make(chan error)
	op := apiClient.Get("core:ui/app/window", parseDataFn(dataStruct, errs))
	defer op.Cancel()

	select {
	case err := <-errs:
		return err
	case <-time.After(5 * time.Second):
		return errors.New("request timed out")
	}
}

func connectToAPI() {
	go apiClient.StayConnected()
}

func parseDataFn(dataStruct interface{}, errs chan error) func(*client.Message) {
	return func(m *client.Message) {
		switch m.Type {
		case client.MsgOk, client.MsgUpdate, client.MsgNew:
			_, err := dsd.Load(m.RawValue, dataStruct)
			if err != nil {
				errs <- fmt.Errorf("failed to parse message: %s", err)
			} else {
				errs <- nil // playing it safe: don't close
			}
		default:
			errMsg := m.Key // message space is where the key would be

			// detect not found
			// TODO: This is hacky, find a better way. Probably needs a protocol improvement.
			if strings.Contains(errMsg, "not found") {
				errs <- errNotFound
				return
			}

			errs <- fmt.Errorf("received unexpected reply: %s %s", m.Type, errMsg)
		}
	}
}
