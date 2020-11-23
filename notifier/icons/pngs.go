//+build !windows

package icons

// Colored Icon IDs
const (
	GreenID  = 0
	YellowID = 1
	RedID    = 2
)

// ColoredIcons holds all the security level icons as .PNGs
var ColoredIcons = [3][]byte{
	GreenID:  GreenPNG,
	YellowID: YellowPNG,
	RedID:    RedPNG,
}
