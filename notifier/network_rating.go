package main

import (
	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/formats/dsd"
	"github.com/safing/portbase/log"
	"github.com/tevino/abool"
)

const networkRatingKey = "config:core/enableNetworkRating"

var networkRatingEnabled = abool.New()

func networkRatingClient() {
	queryOp := apiClient.Qsub("query "+networkRatingKey, handleNetworkRatingUpdate)
	queryOp.EnableResuscitation()
}

func handleNetworkRatingUpdate(m *client.Message) {
	switch m.Type {
	case client.MsgOk, client.MsgUpdate, client.MsgNew:
		var cfg struct {
			Value bool `json:"Value"`
		}
		_, err := dsd.Load(m.RawValue, &cfg)
		if err != nil {
			log.Warningf("config: failed to parse config: %s", err)
			return
		}

		networkRatingEnabled.SetTo(cfg.Value)

		log.Infof("config: received update to network rating system: enabled=%v", cfg.Value)

		triggerTrayUpdate()

	default:
	}
}
