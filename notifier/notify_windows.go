package main

import "github.com/safing/portbase/log"

func actionListener() {

}

// Show shows the notification.
func (n *Notification) Show() {
	log.Warningf("notify: showing notifications not yet implemented. (%s)", n.ID)
}

// Cancel cancels the notification.
func (n *Notification) Cancel() {
}
