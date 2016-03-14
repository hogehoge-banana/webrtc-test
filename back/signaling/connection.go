package signaling

import (
	// built in
	"fmt"
	// add on
	"golang.org/x/net/websocket"
	"github.com/satori/go.uuid"
)

type Connection struct {
	Channel string
	Conn *websocket.Conn
  Room string
	sendChannel chan Message
}

func NewConnection(conn *websocket.Conn) *Connection {
	channel := uuid.NewV4().String()
  connection := &Connection{
    Channel: channel,
    Conn: conn,
    sendChannel: make(chan Message)}
  go channelHandler(connection)
  return connection
}

func channelHandler(self *Connection) {
	for msg := range self.sendChannel {
    fmt.Printf("Sending %s channel:%s\n", msg.Type, self.Channel)
    websocket.JSON.Send(self.Conn, msg)
	}
}

func (self *Connection) EnterRoom(roomname string) {
  self.Room = roomname
}

func (self *Connection) LeaveRoom(roomname string) {
  self.Room = ""
}
func (self *Connection) isJoiningRoom(targetRoom string) bool {
  return self.Room == targetRoom
}

func (self *Connection) SendMessage(msg Message) {
  self.sendChannel <- msg
}

func (self *Connection) Unicast(msgType, msg string, from *Connection) {
  message := Message{
    DestType: DestTypeUnicast,
    Dest: self.Channel,
    Type: msgType,
    Msg: msg,
    From: from.Channel,
  }
  self.SendMessage(message)
}
