package signaling

const (
  DestTypeUnicast = "uni"
  DestTypeBroadcast = "bro"
  DestTypeRoom = "room"
)

type MessageFrame struct {
  Type string
  Dest string
	Message Message
}
