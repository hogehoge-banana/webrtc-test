package signaling

const (
  DestTypeUnicast = "uni"
  DestTypeBroadcast = "bro"
  DestTypeRoom = "room"
)

type Message struct {
  DestType string
  Dest string
	Type string
	Msg string
  From string
}
