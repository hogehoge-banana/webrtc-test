package signaling

import (
	// built in
	"fmt"
	"net/http"
	// add on
	"golang.org/x/net/websocket"
)

const (
	SERVE_WS       = ":8092"
	TYPE_CONNECTED = "connected"
	TYPE_ENTER     = "enter"
	TYPE_LEAVE     = "leave"
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
	conn := NewConnection(ws)
	conns[conn.Channel] = conn
	wsMsgHandler(conn)
}

func wsMsgHandler(conn *Connection) {
	for {
		var frame MessageFrame
		err := websocket.JSON.Receive(conn.Conn, &frame)
		if err != nil {
			fmt.Println(err)
			onDisconnected(conn)
			return
		}

		fmt.Printf("Received: %s from[%s]\n", frame.Type, conn.Channel)

		if frame.Message.Type == TYPE_ENTER {
			onEnter(conn, frame)
		} else {
			frame.Message.From = conn.Channel
			switch frame.Type {
			case DestTypeUnicast:
				conns[frame.Dest].SendMessage(frame.Message, conn)
			default:
				broadcastRoom(frame.Message, frame.Dest, conn)
			}
		}
	}
}

func onEnter(conn *Connection, frame MessageFrame) {
	fmt.Printf("channel[%s] entered room[%s]\n", conn.Channel, frame.Dest)
	conn.EnterRoom(frame.Dest)
	broadcastRoom(frame.Message, frame.Dest, conn)
}

func onDisconnected(conn *Connection) {
	fmt.Printf("channel[%s] dicconnected\n", conn.Channel)
	delete(conns, conn.Channel)
	msg := Message{
		Type: TYPE_LEAVE,
		Msg:  conn.Channel,
		From: conn.Channel,
	}
	broadcastRoom(msg, conn.Room, conn)
}

func broadcastRoom(msg Message, room string, from *Connection) {
	fmt.Printf("------ broadcast room:[%s] from:[%s] type[%s] --------\n", room, from.Channel, msg.Type)
	for _, conn := range conns {
		if conn.IsJoiningRoom(room) {
			conn.SendMessage(msg, from)
		}
	}
}
