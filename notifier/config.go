package main

import (
	"github.com/safing/portbase/database/record"

	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/log"

	"github.com/tevino/abool"
)

var (
	notificationsEnabled = abool.NewBool(true)
	promptsEnabled       = abool.NewBool(true)
)

func configClient() {
	configOp := apiClient.Qsub("query config", handleConfigUpdate)
	configOp.EnableResuscitation()
}

func handleConfigUpdate(m *client.Message) {
	switch m.Type {
	case client.MsgError:
		log.Warningf("config: received error message: %s", string(m.RawValue))
	case client.MsgDone:
	case client.MsgSuccess:
	case client.MsgOk, client.MsgUpdate, client.MsgNew:

		// only process these keys
		switch m.Key {
		case "config:core/useSystemNotifications":
		case "config:filter/askWithSystemNotifications":
		default:
			return
		}

		// parse record
		if len(m.RawValue) < 2 {
			log.Warningf("notify: failed to parse new config msg %s: too short", m.Key)
			return
		}
		r, err := record.NewWrapper(m.Key, nil, m.RawValue[0], m.RawValue[1:])
		if err != nil {
			log.Warningf("notify: failed to parse new config msg %s: %s", m.Key, err)
			return
		}
		acc := r.GetAccessor(r)

		// get value
		newValue, ok := acc.GetBool("Value")
		if !ok {
			newValue, ok = acc.GetBool("DefaultValue")
			if !ok {
				log.Warningf("config: could not get Value or DefaultValue from %s", m.Key)
			}
		}

		// set value
		switch m.Key {
		case "config:core/useSystemNotifications":
			notificationsEnabled.SetTo(newValue)
			log.Infof("config: use system notifications set to: %v", newValue)
		case "config:filter/askWithSystemNotifications":
			promptsEnabled.SetTo(newValue)
			log.Infof("config: ask with systemNotifications set to: %v", newValue)
		}

	case client.MsgDelete:
	case client.MsgWarning:
	case client.MsgOffline:
	}
}
