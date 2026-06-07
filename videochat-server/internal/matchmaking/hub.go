package matchmaking

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"

	"madfriends/videochat-server/internal/auth"
	"madfriends/videochat-server/internal/db"
	"madfriends/videochat-server/internal/ratelimit"

	"github.com/gofiber/contrib/websocket"
	"github.com/google/uuid"
)

type Hub struct {
	verifier       *auth.Verifier
	store          *db.Store
	limiter        *ratelimit.Limiter
	allowSelfMatch bool

	mu          sync.Mutex
	clients     map[string]*Client
	waiting     []string
	rooms       map[string]Room
	clientRooms map[string]string
}

type Client struct {
	ID   string
	User auth.User
	conn *websocket.Conn
	send chan Outgoing
	hub  *Hub
}

type Room struct {
	ID    string
	UserA string
	UserB string
}

type Incoming struct {
	Type    string          `json:"type"`
	Token   string          `json:"token,omitempty"`
	RoomID  string          `json:"roomID,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type Outgoing struct {
	Type      string `json:"type"`
	Message   string `json:"message,omitempty"`
	UserID    string `json:"userID,omitempty"`
	RoomID    string `json:"roomID,omitempty"`
	PartnerID string `json:"partnerID,omitempty"`
	Role      string `json:"role,omitempty"`
	From      string `json:"from,omitempty"`
	Payload   any    `json:"payload,omitempty"`
}

func NewHub(verifier *auth.Verifier, store *db.Store, limiter *ratelimit.Limiter, allowSelfMatch bool) *Hub {
	return &Hub{
		verifier:       verifier,
		store:          store,
		limiter:        limiter,
		allowSelfMatch: allowSelfMatch,
		clients:        map[string]*Client{},
		rooms:          map[string]Room{},
		clientRooms:    map[string]string{},
	}
}

func (h *Hub) Handler() func(*websocket.Conn) {
	return func(conn *websocket.Conn) {
		h.handleConn(conn)
	}
}

func (h *Hub) handleConn(conn *websocket.Conn) {
	conn.SetReadLimit(128 * 1024)
	_ = conn.SetReadDeadline(time.Now().Add(10 * time.Second))

	var first Incoming
	if err := conn.ReadJSON(&first); err != nil || first.Type != "auth" {
		_ = conn.WriteJSON(Outgoing{Type: "error", Message: "first websocket message must authenticate"})
		_ = conn.Close()
		return
	}

	user, err := h.authenticate(first.Token)
	if err != nil {
		_ = conn.WriteJSON(Outgoing{Type: "error", Message: "invalid or inactive account"})
		_ = conn.Close()
		return
	}

	_ = conn.SetReadDeadline(time.Time{})
	client := &Client{
		ID:   uuid.NewString(),
		User: user,
		conn: conn,
		send: make(chan Outgoing, 16),
		hub:  h,
	}

	h.register(client)
	defer h.unregister(client)

	go client.writeLoop()
	client.sendMessage(Outgoing{Type: "connected", UserID: user.ID})

	for {
		var msg Incoming
		if err := conn.ReadJSON(&msg); err != nil {
			return
		}
		h.handleMessage(client, msg)
	}
}

func (h *Hub) authenticate(token string) (auth.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := h.verifier.Verify(ctx, token)
	if err != nil {
		return auth.User{}, err
	}

	profile, err := h.store.EnsureProfile(ctx, user.ID, user.Email)
	if err != nil {
		return auth.User{}, err
	}
	if profile.Status != "active" {
		return auth.User{}, errors.New("inactive profile")
	}

	return user, nil
}

func (h *Hub) register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if !h.allowSelfMatch {
		h.closeUserConnectionsLocked(client.User.ID)
	}
	h.clients[client.ID] = client
}

func (h *Hub) unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[client.ID] != client {
		return
	}
	delete(h.clients, client.ID)
	h.removeWaitingLocked(client.ID)
	h.endRoomLocked(client.ID, "partner_left")
	close(client.send)
	_ = client.conn.Close()
}

func (h *Hub) Kick(userID string) {
	h.mu.Lock()
	clients := h.clientsForUserLocked(userID)
	if len(clients) == 0 {
		h.mu.Unlock()
		return
	}
	for _, client := range clients {
		h.removeWaitingLocked(client.ID)
		h.endRoomLocked(client.ID, "partner_left")
		delete(h.clients, client.ID)
	}
	h.mu.Unlock()

	for _, client := range clients {
		client.sendMessage(Outgoing{Type: "banned", Message: "Your account has been banned."})
		client.close()
	}
}

func (h *Hub) handleMessage(client *Client, msg Incoming) {
	switch msg.Type {
	case "join":
		h.join(client)
	case "leave":
		h.leave(client)
	case "offer", "answer", "ice-candidate":
		h.relay(client, msg)
	case "skip", "hangup":
		h.endRoom(client, "partner_left")
	default:
		client.sendMessage(Outgoing{Type: "error", Message: "unknown message type"})
	}
}

func (h *Hub) join(client *Client) {
	key := "match:" + client.User.ID
	if !h.limiter.Allow(key, 30, time.Minute) {
		client.sendMessage(Outgoing{Type: "error", Message: "too many matchmaking actions"})
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if _, inRoom := h.clientRooms[client.ID]; inRoom {
		return
	}
	if h.waitingContainsLocked(client.ID) {
		client.sendMessage(Outgoing{Type: "waiting"})
		return
	}

	for len(h.waiting) > 0 {
		partnerClientID := h.waiting[0]
		h.waiting = h.waiting[1:]

		partner := h.clients[partnerClientID]
		if partner == nil || partner.ID == client.ID || (!h.allowSelfMatch && partner.User.ID == client.User.ID) {
			continue
		}

		room := Room{
			ID:    uuid.NewString(),
			UserA: partner.ID,
			UserB: client.ID,
		}
		h.rooms[room.ID] = room
		h.clientRooms[room.UserA] = room.ID
		h.clientRooms[room.UserB] = room.ID

		partner.sendMessage(Outgoing{
			Type:      "matched",
			RoomID:    room.ID,
			PartnerID: client.User.ID,
			Role:      "initiator",
		})
		client.sendMessage(Outgoing{
			Type:      "matched",
			RoomID:    room.ID,
			PartnerID: partner.User.ID,
			Role:      "receiver",
		})
		return
	}

	h.waiting = append(h.waiting, client.ID)
	client.sendMessage(Outgoing{Type: "waiting"})
}

func (h *Hub) leave(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeWaitingLocked(client.ID)
	client.sendMessage(Outgoing{Type: "idle"})
}

func (h *Hub) relay(client *Client, msg Incoming) {
	if len(msg.Payload) > 96*1024 {
		client.sendMessage(Outgoing{Type: "error", Message: "message is too large"})
		return
	}

	h.mu.Lock()
	room, ok := h.rooms[msg.RoomID]
	if !ok || !room.has(client.ID) {
		h.mu.Unlock()
		client.sendMessage(Outgoing{Type: "error", Message: "room not found"})
		return
	}
	partnerClientID := room.other(client.ID)
	partner := h.clients[partnerClientID]
	h.mu.Unlock()

	if partner == nil {
		client.sendMessage(Outgoing{Type: "partner_left", RoomID: room.ID})
		return
	}

	var payload any
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		client.sendMessage(Outgoing{Type: "error", Message: "invalid signaling payload"})
		return
	}

	partner.sendMessage(Outgoing{
		Type:    msg.Type,
		RoomID:  room.ID,
		From:    client.User.ID,
		Payload: payload,
	})
}

func (h *Hub) endRoom(client *Client, messageType string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.endRoomLocked(client.ID, messageType)
}

func (h *Hub) endRoomLocked(clientID, messageType string) {
	roomID, ok := h.clientRooms[clientID]
	if !ok {
		return
	}
	room := h.rooms[roomID]
	delete(h.rooms, roomID)
	delete(h.clientRooms, room.UserA)
	delete(h.clientRooms, room.UserB)

	partnerID := room.other(clientID)
	if partner := h.clients[partnerID]; partner != nil {
		partner.sendMessage(Outgoing{Type: messageType, RoomID: roomID})
	}
}

func (h *Hub) removeWaitingLocked(userID string) {
	next := h.waiting[:0]
	for _, queued := range h.waiting {
		if queued != userID {
			next = append(next, queued)
		}
	}
	h.waiting = next
}

func (h *Hub) waitingContainsLocked(userID string) bool {
	for _, queued := range h.waiting {
		if queued == userID {
			return true
		}
	}
	return false
}

func (h *Hub) closeUserConnectionsLocked(userID string) {
	for _, client := range h.clientsForUserLocked(userID) {
		h.removeWaitingLocked(client.ID)
		h.endRoomLocked(client.ID, "partner_left")
		delete(h.clients, client.ID)
		client.close()
	}
}

func (h *Hub) clientsForUserLocked(userID string) []*Client {
	clients := []*Client{}
	for _, client := range h.clients {
		if client.User.ID == userID {
			clients = append(clients, client)
		}
	}
	return clients
}

func (r Room) has(userID string) bool {
	return r.UserA == userID || r.UserB == userID
}

func (r Room) other(userID string) string {
	if r.UserA == userID {
		return r.UserB
	}
	return r.UserA
}

func (c *Client) writeLoop() {
	for msg := range c.send {
		if err := c.conn.WriteJSON(msg); err != nil {
			c.close()
			return
		}
	}
}

func (c *Client) sendMessage(msg Outgoing) {
	select {
	case c.send <- msg:
	default:
		c.close()
	}
}

func (c *Client) close() {
	_ = c.conn.Close()
}

func CleanSignalType(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
