package signaling

import (
	// built in
	"fmt"
	// add on
	"github.com/satori/go.uuid"
	"golang.org/x/net/websocket"
)

type Connection struct {
	Channel     string
	Conn        *websocket.Conn
	Room        string
	sendChannel chan Message
}

func NewConnection(ws *websocket.Conn) *Connection {
	channel := uuid.NewV4().String()
	connection := &Connection{
		Channel:     channel,
		Conn:        ws,
		sendChannel: make(chan Message)}
	go channelHandler(connection)
	msg := Message{
		Type: TYPE_CONNECTED,
		Msg:  channel}
	connection.SendMessage(msg, connection)
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
func (self *Connection) IsJoiningRoom(targetRoom string) bool {
	return self.Room == targetRoom
}

func (self *Connection) SendMessage(msg Message, from *Connection) {
	msg.From = from.Channel
	self.sendChannel <- msg
}
