//go:build !windows

package icons

import (
	_ "embed"
)

// Colored Icon IDs.
const (
	GreenID  = 0
	YellowID = 1
	RedID    = 2
	BlueID   = 3
)

// Icons.
var (
	//go:embed icons/pm_light_green_512.png
	GreenPNG []byte

	//go:embed icons/pm_light_yellow_512.png
	YellowPNG []byte

	//go:embed icons/pm_light_red_512.png
	RedPNG []byte

	//go:embed icons/pm_light_blue_512.png
	BluePNG []byte

	// ColoredIcons holds all the icons as .PNGs
	ColoredIcons = [4][]byte{
		GreenID:  GreenPNG,
		YellowID: YellowPNG,
		RedID:    RedPNG,
		BlueID:   BluePNG,
	}
)
