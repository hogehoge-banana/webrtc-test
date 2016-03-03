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
	"net/http"
	// add on
	"golang.org/x/net/websocket"
	"github.com/satori/go.uuid"
)

const (
	SERVE_WS = ":8092"
)

type wsMsg struct {
	Type string
	Msg string
  Channel string
}

type wsConn struct {
	Channel string
	Conn *websocket.Conn
	Send chan wsMsg
}

var connections map[string]wsConn

func main() {
	connections = make(map[string]wsConn)
	//	signaling.Run()
	launchSignaling()
	//	launchSocket()
}

func launchSignaling() {
	http.HandleFunc("/ws", func(w http.ResponseWriter, req *http.Request) {
		s := websocket.Server{Handler: websocket.Handler(wsHandler)}
		s.ServeHTTP(w, req)
	})
	if err := http.ListenAndServe(SERVE_WS, nil); err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}

func wsHandler(ws *websocket.Conn) {
	channel := uuid.NewV4().String()
	conn := wsConn{channel, ws, make(chan wsMsg)}
  connections[channel] = conn

  fmt.Printf("channel[%s] connected\n", channel)
	go wsChannelHandler(conn)
  msg := wsMsg{"connected", channel, channel}
  conn.Send <- msg
	wsMsgHandler(conn)

}

func wsChannelHandler(conn wsConn) {
	for msg := range conn.Send {
    fmt.Printf("Sending %s channel:%s\n", msg.Type, conn.Channel)
		websocket.JSON.Send(conn.Conn, msg)
	}
}

func wsMsgHandler(conn wsConn) {
	for {
		var data wsMsg
		err := websocket.JSON.Receive(conn.Conn, &data)
		if err == nil {
			fmt.Printf("Received: %s channel:[%s]\n",
        data.Type, conn.Channel)
			broadcast(data)
		} else {
			delete(connections, conn.Channel)
      fmt.Printf("channel[%s] connected\n", conn.Channel)
			return
		}
	}
}
func broadcast(msg wsMsg) {
  fmt.Println("broadcast msg")
	for _, conn := range connections {
//		if conn.Conn.IsClientConn() {
    conn.Send <- msg
//		}
	}
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
