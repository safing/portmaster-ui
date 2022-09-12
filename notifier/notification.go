package main

import (
	"fmt"
	"sync"
)

// Type describes the type of a notification.
type Type uint8

// Notification types.
const (
	Info    Type = 0
	Warning Type = 1
	Prompt  Type = 2
	Error   Type = 3
)

// State describes the state of a notification.
type State string

// Possible notification states.
// State transitions can only happen from top to bottom.
const (
	// Active describes a notification that is active, no expired and,
	// if actions are available, still waits for the user to select an
	// action.
	Active State = "active"
	// Responded describes a notification where the user has already
	// selected which action to take but that action is still to be
	// performed.
	Responded State = "responded"
	// Executes describes a notification where the user has selected
	// and action and that action has been performed.
	Executed State = "executed"
)

// Notification represents a notification that is to be delivered to the user.
type Notification struct {
	sync.Mutex

	// EventID is used to identify a specific notification. It consists of
	// the module name and a per-module unique event id.
	// The following format is recommended:
	// 	<module-id>:<event-id>
	EventID string
	// GUID is a unique identifier for each notification instance. That is
	// two notifications with the same EventID must still have unique GUIDs.
	// The GUID is mainly used for system (Windows) integration and is
	// automatically populated by the notification package. Average users
	// don't need to care about this field.
	GUID string
	// Type is the notification type. It can be one of Info, Warning or Prompt.
	Type Type
	// Title is an optional and very short title for the message that gives a
	// hint about what the notification is about.
	Title string
	// Category is an optional category for the notification that allows for
	// tagging and grouping notifications by category.
	Category string
	// Message is the default message shown to the user if no localized version
	// of the notification is available. Note that the message should already
	// have any parametrized values replaced.
	Message string
	// ShowOnSystem specifies if the notification should be also shown on the
	// operating system. Notifications shown on the operating system level are
	// more focus-intrusive and should only be used for important notifications.
	ShowOnSystem bool
	// EventData contains an additional payload for the notification. This payload
	// may contain contextual data and may be used by a localization framework
	// to populate the notification message template.
	// If EventData implements sync.Locker it will be locked and unlocked together with the
	// notification. Otherwise, EventData is expected to be immutable once the
	// notification has been saved and handed over to the notification or database package.
	EventData interface{}
	// Expires holds the unix epoch timestamp at which the notification expires
	// and can be cleaned up.
	// Users can safely ignore expired notifications and should handle expiry the
	// same as deletion.
	Expires int64
	// State describes the current state of a notification. See State for
	// a list of available values and their meaning.
	State State
	// AvailableActions defines a list of actions that a user can choose from.
	AvailableActions []*Action
	// SelectedActionID is updated to match the ID of one of the AvailableActions
	// based on the user selection.
	SelectedActionID string

	// systemID holds the ID returned by the dbus interface on Linux.
	systemID uint32
}

// Action describes an action that can be taken for a notification.
type Action struct {
	// ID specifies a unique ID for the action. If an action is selected, the ID
	// is written to SelectedActionID and the notification is saved.
	// If the action type is not ActionTypeNone, the ID may be empty, signifying
	// that this action is merely additional and selecting it does dismiss the
	// notification.
	ID string
	// Text on the button.
	Text string
	// Type specifies the action type. Implementing interfaces should only
	// display action types they can handle.
	Type ActionType
	// Payload holds additional data for special action types.
	Payload interface{}
}

// ActionType defines a specific type of action.
type ActionType string

// Action Types.
const (
	ActionTypeNone        = ""             // Report selected ID back to backend.
	ActionTypeOpenURL     = "open-url"     // Open external URL
	ActionTypeOpenPage    = "open-page"    // Payload: Page ID
	ActionTypeOpenSetting = "open-setting" // Payload: See struct definition below.
	ActionTypeOpenProfile = "open-profile" // Payload: Scoped Profile ID
	ActionTypeInjectEvent = "inject-event" // Payload: Event ID
	ActionTypeWebhook     = "call-webhook" // Payload: See struct definition below.
)

// ActionTypeOpenSettingPayload defines the payload for the OpenSetting Action Type.
type ActionTypeOpenSettingPayload struct {
	// Key is the key of the setting.
	Key string
	// Profile is the scoped ID of the profile.
	// Leaving this empty opens the global settings.
	Profile string
}

// ActionTypeWebhookPayload defines the payload for the WebhookPayload Action Type.
type ActionTypeWebhookPayload struct {
	// HTTP Method to use. Defaults to "GET", or "POST" if a Payload is supplied.
	Method string
	// URL to call.
	// If the URL is relative, prepend the current API endpoint base path.
	// If the URL is absolute, send request to the Portmaster.
	URL string
	// Payload holds arbitrary payload data.
	Payload interface{}
	// ResultAction defines what should be done with successfully returned data.
	// Must one of:
	// - `ignore`: do nothing (default)
	// - `display`: the result is a human readable message, display it in a success message.
	ResultAction string
}

// IsSupported returns whether the action is supported on this system.
func (a *Action) IsSupported() bool {
	switch a.Type {
	case ActionTypeNone:
		return true
	default:
		return false
	}
}

// SelectAction sends an action back to the portmaster.
func (n *Notification) SelectAction(action string) {
	new := &Notification{
		EventID:          n.EventID,
		SelectedActionID: action,
	}

	// FIXME: check response
	apiClient.Update(fmt.Sprintf("%s%s", dbNotifBasePath, new.EventID), new, nil)
}
