/*
Package main implements ise server

listen 8092

handle as signaling on /ws

*/
package main

import (
	// built in
	"fmt"
	"net"
	"os"
	//	"io"
	// add on
  // my package
  "./signaling"
)


func main() {
  signaling.Run()
}

// ------------------------

func launchTcpSocket() {
	port := ":9001"
	tcpAddr, err := net.ResolveTCPAddr("tcp", port)
	checkError(err)
	listener, err := net.ListenTCP("tcp", tcpAddr)
	checkError(err)

	for {
		conn, err := listener.Accept()

		if err != nil {
			fmt.Println(err.Error())
			continue
		}
		go handleTcpClient(conn)
	}
}
func handleTcpClient(conn net.Conn) {
	defer conn.Close()
}


func checkError(e error) {
	if e != nil {
		fmt.Fprintf(os.Stderr, "fatal: error: %s", e.Error())
		os.Exit(1)
	}
}
