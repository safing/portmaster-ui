package main

import (
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/formats/dsd"
	"github.com/safing/portbase/log"
)

// Security Level constants
const (
	SecurityLevelOffline uint8 = 0
	SecurityLevelNormal  uint8 = 1
	SecurityLevelHigh    uint8 = 2
	SecurityLevelExtreme uint8 = 4

	systemStatusKey = "core:status/status"
)

var (
	activeStatus     *SystemStatus
	activeStatusLock sync.Mutex
)

// SystemStatus saves basic information about the Portmasters system status.
type SystemStatus struct {
	ActiveSecurityLevel   uint8
	SelectedSecurityLevel uint8

	// PortmasterStatus    uint8
	// PortmasterStatusMsg string

	// Gate17Status    uint8
	// Gate17StatusMsg string

	// ThreatMitigationLevel uint8
	Threats map[string]*Threat

	// UpdateStatus string
}

// ThreatList is a slice of Threats
type ThreatList []*Threat

// Len is the number of elements in the collection.
func (t ThreatList) Len() int {
	return len(t)
}

// Less reports whether the element with
// index i should sort before the element with index j.
func (t ThreatList) Less(i, j int) bool {
	return t[i].ID < t[j].ID
}

// Swap swaps the elements with indexes i and j.
func (t ThreatList) Swap(i, j int) {
	t[i], t[j] = t[j], t[i]
}

// Threat describes a detected threat.
type Threat struct {
	ID string // A unique ID chosen by reporting module (eg. modulePrefix-incident) to periodically check threat existence
	// Name            string      // Descriptive (human readable) name for detected threat
	Description string // Simple description
	// AdditionalData  interface{} // Additional data a module wants to make available for the user
	// MitigationLevel uint8       // Recommended Security Level to switch to for mitigation
	// Started         int64
	// Ended           int64
}

// FmtThreats returns the current threats in a readable format.
func (s *SystemStatus) FmtThreats() string {
	if s == nil || len(s.Threats) == 0 {
		return "No threats detected."
	}

	// transform to slice
	threats := make(ThreatList, 0, len(s.Threats))
	for _, item := range s.Threats {
		threats = append(threats, item)
	}

	// sort
	sort.Sort(threats)

	var messages []string
	for _, threat := range threats {
		messages = append(messages, threat.Description)
	}
	return strings.Join(messages, "\n")
}

func fmtLevel(level uint8, active bool) string {
	switch level {
	case SecurityLevelOffline:
		if active {
			return "Offline"
		}
		return "Autopilot"
	case SecurityLevelNormal:
		return "Normal"
	case SecurityLevelHigh:
		return "High"
	case SecurityLevelExtreme:
		return "Extreme"
	}
	return "Unknown"
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

		activeStatusLock.Lock()
		defer activeStatusLock.Unlock()

		newStatus := &SystemStatus{}
		_, err := dsd.Load(m.RawValue, newStatus)
		if err != nil {
			log.Warningf("status: failed to parse new status: %s", err)
			return
		}

		updateActiveLevel := activeStatus == nil || newStatus.ActiveSecurityLevel != activeStatus.ActiveSecurityLevel
		updateSelectedLevel := activeStatus == nil || newStatus.SelectedSecurityLevel != activeStatus.SelectedSecurityLevel
		newThreatInfo := newStatus.FmtThreats()
		updateThreatInfo := activeStatus == nil || newThreatInfo != activeStatus.FmtThreats()

		go func() {
			if updateActiveLevel {
				displayActiveLevel(newStatus.ActiveSecurityLevel)
			}
			if updateSelectedLevel {
				displaySelectedLevel(newStatus.SelectedSecurityLevel)
			}
			if updateThreatInfo {
				displayThreatInfo(newThreatInfo)
			}
		}()

		activeStatus = newStatus

	case client.MsgDelete:
	case client.MsgWarning:
	case client.MsgOffline:
		go displayActiveLevel(SecurityLevelOffline)
	}
}

// SelectSecurityLevel sets the selected security level
func SelectSecurityLevel(level uint8) {
	apiClient.Update(systemStatusKey, &SystemStatus{SelectedSecurityLevel: level}, nil)
}
