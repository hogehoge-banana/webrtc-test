/*
Package main implements ise server

listen 8092

handle as signaling on /ws

*/
package main

import (
	"./signaling"
)

func main() {
	signaling.Run()
}

// ------------------------
