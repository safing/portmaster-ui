package main

import (
	"fmt"
	"strings"
	"sync"

	"github.com/Safing/portbase/api/client"
	"github.com/Safing/portbase/formats/dsd"
	"github.com/Safing/portbase/log"
)

const (
	dbNotifBasePath = "notifications:all/"
)

var (
	notifications     = make(map[string]*Notification)
	notificationsLock sync.Mutex
)

func notifClient() {
	notifOp := apiClient.Qsub(fmt.Sprintf("query %s", dbNotifBasePath), handleNotification)
	notifOp.EnableResuscitation()

	actionListener()
}

func handleNotification(m *client.Message) {
	notificationsLock.Lock()
	defer notificationsLock.Unlock()

	log.Tracef("received %s msg: %s", m.Type, m.Key)

	switch m.Type {
	case client.MsgError:
	case client.MsgDone:
	case client.MsgSuccess:
	case client.MsgOk, client.MsgUpdate, client.MsgNew:

		n := &Notification{}
		_, err := dsd.Load(m.RawValue, n)
		if err != nil {
			log.Warningf("notify: failed to parse new notification: %s", err)
			return
		}

		// copy existing system values
		existing, ok := notifications[n.ID]
		if ok {
			existing.Lock()
			n.systemID = existing.systemID
			existing.Unlock()
		}

		notifications[n.ID] = n
		n.Show()

	case client.MsgDelete:

		n, ok := notifications[strings.TrimPrefix(m.Key, dbNotifBasePath)]
		if ok {
			n.Cancel()
			delete(notifications, n.ID)
		}

	case client.MsgWarning:
	case client.MsgOffline:
	}
}

func clearNotifications() {
	notificationsLock.Lock()
	defer notificationsLock.Unlock()

	for _, n := range notifications {
		n.Cancel()
	}
}
