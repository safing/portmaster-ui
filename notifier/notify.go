package main

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/formats/dsd"
	"github.com/safing/portbase/log"
)

const (
	dbNotifBasePath = "notifications:all/"
)

var (
	notifications     = make(map[string]*Notification)
	notificationsLock sync.Mutex
)

func notifClient() {
	notifOp := apiClient.Qsub(fmt.Sprintf("query %s where ShowOnSystem is true", dbNotifBasePath), handleNotification)
	notifOp.EnableResuscitation()

	// start the action listener and block
	// until it's closed.
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
		existing, ok := notifications[n.EventID]
		if ok {
			existing.Lock()
			n.systemID = existing.systemID
			existing.Unlock()
		}

		// save
		notifications[n.EventID] = n

		// check if notifications are enabled
		if !notificationsEnabled.IsSet() {
			return
		}
		// check if prompts are enabled
		if n.Type == Prompt && !promptsEnabled.IsSet() {
			return
		}

		// Handle notification.
		switch {
		case existing != nil:
			// Cancel existing notification if not active, else ignore.
			if n.State != Active {
				existing.Cancel()
			}
			return
		case n.State == Active:
			// Show new notifications that are active.
			n.Show()
		default:
			// Ignore new notifications that are not active.
		}

	case client.MsgDelete:

		n, ok := notifications[strings.TrimPrefix(m.Key, dbNotifBasePath)]
		if ok {
			n.Cancel()
			delete(notifications, n.EventID)
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

	// Wait for goroutines that cancel notifications.
	// TODO: Revamp to use a waitgroup.
	time.Sleep(1 * time.Second)
}
