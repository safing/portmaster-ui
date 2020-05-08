package main

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/formats/dsd"
)

var (
	apiClient = client.NewClient("127.0.0.1:817")
	initAPI   sync.Once
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
	apiClient.Get("core:ui/app/window", parseDataFn(dataStruct, errs))

	select {
	case err := <-errs:
		if err != nil {
			return err
		}
		return nil
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
				close(errs)
			}
		default:
			errs <- fmt.Errorf("received unexpected reply: %s %s", m.Type, m.Value)
		}
	}
}
