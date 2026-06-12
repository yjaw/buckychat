package matchmaking

import (
	"testing"

	"buckychat/videochat-server/internal/auth"
)

func TestCanReportMatchRequiresActiveRoomParticipants(t *testing.T) {
	h := &Hub{
		clients: map[string]*Client{
			"client-a": {ID: "client-a", User: auth.User{ID: "reporter"}},
			"client-b": {ID: "client-b", User: auth.User{ID: "reported"}},
		},
		rooms: map[string]Room{
			"room-1": {ID: "room-1", UserA: "client-a", UserB: "client-b"},
		},
	}

	if !h.CanReportMatch("reporter", "reported", "room-1") {
		t.Fatal("expected reporter to be able to report active match partner")
	}
	if h.CanReportMatch("reporter", "stranger", "room-1") {
		t.Fatal("did not expect reporter to report a non-partner user")
	}
	if h.CanReportMatch("reporter", "reported", "missing-room") {
		t.Fatal("did not expect reporter to report outside an active room")
	}
}

func TestSendMessageAfterCloseDoesNotPanic(t *testing.T) {
	client := &Client{send: make(chan Outgoing, 1)}

	client.closeSendAndConn()
	client.sendMessage(Outgoing{Type: "ignored"})
}

func TestSendMessageFullBufferClosesClientOnce(t *testing.T) {
	client := &Client{send: make(chan Outgoing)}

	client.sendMessage(Outgoing{Type: "first"})
	client.sendMessage(Outgoing{Type: "second"})
}
