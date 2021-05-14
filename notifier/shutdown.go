package main

import (
	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/log"
)

func startShutdownEventListener() {
	notifOp := apiClient.Sub("query runtime:modules/core/event/shutdown", handleShutdownEvent)
	notifOp.EnableResuscitation()
}

func handleShutdownEvent(m *client.Message) {
	switch m.Type {
	case client.MsgOk, client.MsgUpdate, client.MsgNew:
		log.Warningf("shutdown: received shutdown event, shutting down now")
		cancelMainCtx()
	case client.MsgWarning, client.MsgError:
		log.Errorf("shutdown: event subscription error: %s", string(m.RawValue))
	}
}
