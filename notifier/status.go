package main

import (
	"fmt"
	"sync"

	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/formats/dsd"
	"github.com/safing/portbase/log"
)

// Security Level constants
const (
	SecurityLevelAutoDetect uint8 = 0
	SecurityLevelTrusted    uint8 = 1
	SecurityLevelUntrusted  uint8 = 2
	SecurityLevelDanger     uint8 = 4

	systemStatusKey         = "runtime:system/status"
	selectSecurityStatusKey = "runtime:system/security-level"
)

var (
	status     = new(SystemStatus)
	statusLock sync.Mutex
)

// SystemStatus saves basic information about the Portmasters system status.
type SystemStatus struct {
	// ActiveSecurityLevel holds the currently
	// active security level.
	ActiveSecurityLevel uint8
	// SelectedSecurityLevel holds the security level
	// as selected by the user.
	SelectedSecurityLevel uint8
	// ThreatMitigationLevel holds the security level
	// as selected by the auto-pilot.
	ThreatMitigationLevel uint8
}

// GetStatus returns the system status.
func GetStatus() *SystemStatus {
	statusLock.Lock()
	defer statusLock.Unlock()

	return status
}

func updateStatus(s *SystemStatus) {
	statusLock.Lock()
	defer statusLock.Unlock()

	status = s
}

func fmtSecurityLevel(level uint8) string {
	switch level {
	case SecurityLevelAutoDetect:
		return "AutoDetect"
	case SecurityLevelTrusted:
		return "Trusted"
	case SecurityLevelUntrusted:
		return "Untrusted"
	case SecurityLevelDanger:
		return "Danger"
	default:
		return "Unknown"
	}
}

func statusClient() {
	statusOp := apiClient.Qsub(fmt.Sprintf("query %s", systemStatusKey), handleSystemStatus)
	statusOp.EnableResuscitation()
}

func handleSystemStatus(m *client.Message) {
	switch m.Type {
	case client.MsgError:
	case client.MsgDone:
	case client.MsgSuccess:
	case client.MsgOk, client.MsgUpdate, client.MsgNew:

		newStatus := &SystemStatus{}
		_, err := dsd.Load(m.RawValue, newStatus)
		if err != nil {
			log.Warningf("status: failed to parse new status: %s", err)
			return
		}
		updateStatus(newStatus)
		triggerTrayUpdate()

	case client.MsgDelete:
	case client.MsgWarning:
	case client.MsgOffline:

		updateStatus(new(SystemStatus))

	}
}

// SelectSecurityLevel sets the selected security level
func SelectSecurityLevel(level uint8) {
	apiClient.Update(selectSecurityStatusKey, &SystemStatus{SelectedSecurityLevel: level}, nil)
}
