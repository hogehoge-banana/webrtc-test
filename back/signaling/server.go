package signaling

import (
	// built in
	"fmt"
	//	"io"
	"net/http"
	// add on
	"golang.org/x/net/websocket"
)

const (
	SERVE_WS = ":8092"
  GLOBALROOM = ":global"
  TYPE_ENTER = "enter"
  TYPE_LEAVE = "leave"
)

var conns map[string]*Connection

func Run() {
  conns = make(map[string]*Connection)
	http.HandleFunc("/ws", func(w http.ResponseWriter, req *http.Request) {
		s := websocket.Server{Handler: websocket.Handler(wsHandler)}
		s.ServeHTTP(w, req)
	})
	if err := http.ListenAndServe(SERVE_WS, nil); err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}

func wsHandler(ws *websocket.Conn) {
  fmt.Println("connected")
	conn := NewConnection(ws)
  conn.Unicast("connected", conn.Channel, conn)
	wsMsgHandler(conn)
}

func wsMsgHandler(conn *Connection) {
	for {
		var msg Message
		err := websocket.JSON.Receive(conn.Conn, &msg)
		if err != nil {
      onDisconnected(conn)
			return
    }
    fmt.Printf("Received: %s channel:[%s]\n", msg.Type, conn.Channel)
    switch msg.DestType {
    case DestTypeUnicast:
      conns[msg.Dest].SendMessage(msg)
    case DestTypeBroadcast:
      broadcast(msg)
    default:
      broadcastInRoom(msg)
    }
	}
}

func onEnter(conn *Connection, msg Message) {
  fmt.Printf("channel[%s] entered. room:%s\n", conn.Channel, msg.Msg)
  conn.EnterRoom(msg.Msg)
  broadcastInRoom(msg)
}

func onDisconnected(conn *Connection) {
  fmt.Printf("channel[%s] dicconnected\n", conn.Channel)
  msg := Message{
    Type: TYPE_LEAVE,
    Msg: conn.Channel,
    From: conn.Channel,
  }
  broadcastInRoom(msg)
  delete (conns, conn.Channel)
}

func broadcast(msg Message) {
  for _, conn := range conns {
    conn.SendMessage(msg)
  }
}

func broadcastInRoom(msg Message) {
  for _, conn := range conns {
    if conn.isJoiningRoom(msg.Dest) {
      conn.SendMessage(msg)
    }
  }
}
