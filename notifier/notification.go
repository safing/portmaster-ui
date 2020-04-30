package main

import (
	"fmt"
	"sync"
)

// Notification types
const (
	Info    uint8 = 0 //nolint:deadcode
	Warning uint8 = 1 //nolint:deadcode
	Prompt  uint8 = 2
)

// Notification represents a notification that is to be delivered to the user.
type Notification struct {
	sync.Mutex

	ID      string
	GUID    string
	Message string
	// MessageTemplate string
	// MessageData []string
	DataSubject map[string]interface{}
	Type        uint8

	AvailableActions []*Action
	SelectedActionID string

	Persistent bool  // this notification persists until it is handled and survives restarts
	Created    int64 // creation timestamp, notification "starts"
	Responded  int64 // response timestamp, notification "ends"
	Executed   int64 // execution timestamp, notification will be deleted soon

	systemID uint32
}

// Action describes an action that can be taken for a notification.
type Action struct {
	ID   string
	Text string
}

// SelectAction sends an action back to the portmaster.
func (n *Notification) SelectAction(action string) {
	new := &Notification{
		ID:               n.ID,
		SelectedActionID: action,
	}

	// FIXME: check response
	apiClient.Update(fmt.Sprintf("%s%s", dbNotifBasePath, new.ID), new, nil)
}
