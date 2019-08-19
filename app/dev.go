// +build dev

package main

import "flag"

func init() {
	flag.StringVar(&urlFlag, "url", "", "set custom url")
}
