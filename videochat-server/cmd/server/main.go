package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"buckychat/videochat-server/internal/auth"
	"buckychat/videochat-server/internal/config"
	"buckychat/videochat-server/internal/db"
	"buckychat/videochat-server/internal/httpx"
	"buckychat/videochat-server/internal/matchmaking"
	"buckychat/videochat-server/internal/ratelimit"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// reportRequest is the JSON body the client sends when reporting another user.
type reportRequest struct {
	ReportedUserID string `json:"reportedUserID"`
	RoomID         string `json:"roomID"`
	Reason         string `json:"reason"`
	Details        string `json:"details"`
}

// banRequest is the JSON body for the admin ban endpoint. Reason is optional.
type banRequest struct {
	Reason string `json:"reason"`
}

// iceServer represents one STUN or TURN server sent to the browser for WebRTC.
// Username and Credential are only needed for TURN servers, so omitempty skips
// them in the JSON output when they are empty strings.
type iceServer struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}

// cloudflareTurnResponse matches the shape of the JSON that Cloudflare's
// TURN credentials API returns: { "iceServers": [...] }
type cloudflareTurnResponse struct {
	ICEServers []iceServer `json:"iceServers"`
}

func main() {
	// Load all configuration from environment variables.
	cfg := config.Load()

	// context.WithTimeout creates a context that cancels itself after 10 seconds.
	// We use it here so the DB connection attempt does not hang forever at startup.
	// defer cancel() releases the timer resources as soon as main returns or the
	// context is no longer needed.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to PostgreSQL. If this fails the process exits immediately — there
	// is no point starting the HTTP server without a database.
	store, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	// defer runs this line when main() returns, ensuring the connection pool is
	// always closed cleanly even if we return early due to an error.
	defer store.Close()

	// verifier validates JWT tokens issued by Supabase Auth.
	verifier := auth.NewVerifier(auth.VerifierConfig{
		SupabaseURL:       cfg.SupabaseURL,
		SupabaseJWKSURL:   cfg.SupabaseJWKSURL,
		SupabaseJWTSecret: cfg.SupabaseJWTSecret,
	})

	// limiter is a shared in-memory rate limiter used across multiple routes.
	limiter := ratelimit.New()

	// hub manages the matchmaking queue and all active WebSocket connections.
	hub := matchmaking.NewHub(verifier, store, limiter, cfg.AllowSelfMatch)

	// requireUser is a middleware function we attach to routes that need a
	// logged-in user. In Go, functions are first-class values so we can store
	// them in a variable and pass them around just like any other value.
	requireUser := auth.RequireActiveUser(verifier, store)

	// fiber.New creates the HTTP server. fiber.Config lets us set app-wide options.
	app := fiber.New(fiber.Config{
		AppName: "BuckyChat API",
		// ReadTimeout prevents slow clients from holding connections open forever.
		ReadTimeout: 10 * time.Second,
	})

	// app.Use registers middleware that runs on every request, in the order added.
	app.Use(recover.New()) // catches panics and returns 500 instead of crashing
	app.Use(logger.New())  // logs method, path, status, and latency for every request
	app.Use(cors.New(cors.Config{
		// Only the frontend origin is allowed to make cross-origin requests.
		AllowOrigins:     cfg.ClientOrigin,
		AllowMethods:     "GET,POST,OPTIONS",
		AllowHeaders:     "Authorization,Content-Type",
		AllowCredentials: true,
	}))

	// /healthz — always returns 200; used by load balancers to check the process is alive.
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	// /readyz — also pings the DB; used to hold traffic until the app is fully ready.
	app.Get("/readyz", func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), 2*time.Second)
		defer cancel()
		if err := store.Pool.Ping(ctx); err != nil {
			return httpx.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	// api is a route group — all routes registered on it will be prefixed with /api.
	api := app.Group("/api")

	// GET /api/me returns the currently authenticated user's profile.
	// requireUser runs first; if the token is missing or invalid it returns 401
	// and the handler function never executes.
	api.Get("/me", requireUser, func(c *fiber.Ctx) error {
		// auth.CurrentUser reads the user that requireUser already stored in the
		// request context. The blank identifier _ discards the ok boolean because
		// requireUser already guarantees the user is present.
		user, _ := auth.CurrentUser(c)
		return c.JSON(user)
	})

	// httpClient is shared across all /ice-config requests so connections are
	// reused (Go's http.Client maintains an internal connection pool).
	httpClient := &http.Client{Timeout: 10 * time.Second}

	// GET /api/ice-config returns STUN/TURN server credentials to the browser so
	// it can establish a WebRTC peer connection.
	api.Get("/ice-config", requireUser, func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), 5*time.Second)
		defer cancel()
		iceServers, err := buildICEServers(ctx, cfg, httpClient)
		if err != nil {
			log.Printf("ice config failed: %v", err)
			return httpx.Error(c, fiber.StatusBadGateway, "could not generate TURN credentials")
		}
		return c.JSON(fiber.Map{"iceServers": iceServers})
	})

	// POST /api/reports lets a user report another user they were matched with.
	api.Post("/reports", requireUser, func(c *fiber.Ctx) error {
		user, _ := auth.CurrentUser(c)

		// Rate limit: max 5 reports per user per 10 minutes.
		// The key "report:<userID>" scopes the limit to each individual user.
		if !limiter.Allow("report:"+user.ID, 5, 10*time.Minute) {
			return httpx.Error(c, fiber.StatusTooManyRequests, "too many reports")
		}

		// BodyParser reads the JSON request body and populates the struct.
		// & passes a pointer so BodyParser can write into our local variable.
		var body reportRequest
		if err := c.BodyParser(&body); err != nil {
			return httpx.Error(c, fiber.StatusBadRequest, "invalid report body")
		}

		// Trim whitespace before validating so " " is treated the same as "".
		body.ReportedUserID = strings.TrimSpace(body.ReportedUserID)
		body.RoomID = strings.TrimSpace(body.RoomID)
		body.Reason = strings.TrimSpace(body.Reason)
		body.Details = strings.TrimSpace(body.Details)
		reportedUserID, err := uuid.Parse(body.ReportedUserID)
		if err != nil {
			return httpx.Error(c, fiber.StatusBadRequest, "reportedUserID must be a valid user id")
		}
		roomID, err := uuid.Parse(body.RoomID)
		if err != nil {
			return httpx.Error(c, fiber.StatusBadRequest, "roomID must be a valid room id")
		}
		body.ReportedUserID = reportedUserID.String()
		body.RoomID = roomID.String()
		if body.ReportedUserID == user.ID {
			return httpx.Error(c, fiber.StatusBadRequest, "cannot report yourself")
		}
		if body.Reason == "" || len(body.Reason) > 80 {
			return httpx.Error(c, fiber.StatusBadRequest, "reason is required and must be under 80 characters")
		}
		if len(body.Details) > 1000 {
			return httpx.Error(c, fiber.StatusBadRequest, "details must be under 1000 characters")
		}
		if !hub.CanReportMatch(user.ID, body.ReportedUserID, body.RoomID) {
			return httpx.Error(c, fiber.StatusForbidden, "report must reference an active match")
		}

		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()
		report, err := store.CreateReport(ctx, user.ID, body.ReportedUserID, body.RoomID, body.Reason, body.Details)
		if err != nil {
			return httpx.Error(c, fiber.StatusInternalServerError, "could not create report")
		}
		// 201 Created is more accurate than 200 OK when a new resource was created.
		return c.Status(fiber.StatusCreated).JSON(report)
	})

	// admin is a sub-group under /api/admin. Both requireUser and requireAdmin
	// run as middleware on every route in this group.
	admin := api.Group("/admin", requireUser, requireAdmin(cfg.AdminEmails))

	// GET /api/admin/reports lists the most recent 50 reports.
	admin.Get("/reports", func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()
		reports, err := store.ListReports(ctx, 50)
		if err != nil {
			return httpx.Error(c, fiber.StatusInternalServerError, "could not list reports")
		}
		return c.JSON(fiber.Map{"reports": reports})
	})

	// POST /api/admin/users/:id/ban bans a user and immediately disconnects them.
	admin.Post("/users/:id/ban", func(c *fiber.Ctx) error {
		user, _ := auth.CurrentUser(c)
		// c.Params reads the :id segment from the URL path.
		targetID := strings.TrimSpace(c.Params("id"))
		parsedTargetID, err := uuid.Parse(targetID)
		if err != nil {
			return httpx.Error(c, fiber.StatusBadRequest, "user id must be valid")
		}
		targetID = parsedTargetID.String()
		var body banRequest
		if len(c.Body()) > 0 {
			if err := c.BodyParser(&body); err != nil {
				return httpx.Error(c, fiber.StatusBadRequest, "invalid ban body")
			}
		}
		body.Reason = strings.TrimSpace(body.Reason)
		if body.Reason == "" {
			body.Reason = "Admin ban"
		}

		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()
		if err := store.BanUser(ctx, targetID, user.ID, body.Reason); err != nil {
			// pgx.ErrNoRows means the target user ID does not exist in the database.
			// errors.Is unwraps wrapped errors to check the root cause.
			if errors.Is(err, pgx.ErrNoRows) {
				return httpx.Error(c, fiber.StatusNotFound, "user not found")
			}
			return httpx.Error(c, fiber.StatusInternalServerError, "could not ban user")
		}
		// Force-disconnect the user from the matchmaking hub if they are online.
		hub.Kick(targetID)
		return c.JSON(fiber.Map{"ok": true})
	})

	// GET /api/stats returns live online and waiting counts. No auth required so
	// the lobby can poll it before the WebSocket handshake completes.
	api.Get("/stats", func(c *fiber.Ctx) error {
		return c.JSON(hub.Stats())
	})

	// Reject plain HTTP requests to the /ws path before the upgrade handler sees them.
	// IsWebSocketUpgrade checks for the "Upgrade: websocket" header.
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// GET /ws/match upgrades the connection to WebSocket and hands it to the hub.
	app.Get("/ws/match", websocket.New(hub.Handler()))

	log.Printf("BuckyChat API listening on %s", cfg.ServerAddr)
	if err := app.Listen(cfg.ServerAddr); err != nil {
		log.Fatal(err)
	}
}

// requireAdmin returns a middleware that allows the request only if the current
// user's email is in the admins map. It is a function that returns a function —
// this pattern is called a closure and is common in Go middleware.
func requireAdmin(admins map[string]bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := auth.CurrentUser(c)
		// admins[key] returns false (the zero value for bool) if the key is absent,
		// so this doubles as both a "not found" and "not an admin" check.
		if !ok || !admins[strings.ToLower(user.Email)] {
			return httpx.Error(c, fiber.StatusForbidden, "admin access required")
		}
		return c.Next()
	}
}

// buildICEServers returns the list of STUN/TURN servers for WebRTC.
// If Cloudflare credentials are configured it fetches short-lived credentials
// from their API; otherwise it falls back to the static URLs in config.
func buildICEServers(ctx context.Context, cfg config.Config, client *http.Client) ([]iceServer, error) {
	if cfg.CloudflareTurnKeyID != "" && cfg.CloudflareTurnAPIToken != "" {
		return cloudflareTurnCredentials(ctx, cfg, client)
	}

	// Split the raw URL list from config into STUN and TURN buckets.
	// TURN URLs need credentials attached; STUN URLs do not.
	var stunURLs, turnURLs []string
	for _, raw := range cfg.TurnURLs {
		url := strings.TrimSpace(raw)
		if strings.HasPrefix(url, "turn:") || strings.HasPrefix(url, "turns:") {
			turnURLs = append(turnURLs, url)
		} else if url != "" {
			stunURLs = append(stunURLs, url)
		}
	}

	// Build one iceServer entry per group. We keep STUN and TURN separate because
	// TURN entries carry credentials that STUN entries must not expose.
	var servers []iceServer
	if len(stunURLs) > 0 {
		servers = append(servers, iceServer{URLs: stunURLs})
	}
	if len(turnURLs) > 0 {
		servers = append(servers, iceServer{
			URLs:       turnURLs,
			Username:   cfg.TurnUsername,
			Credential: cfg.TurnCredential,
		})
	}
	return servers, nil
}

// cloudflareTurnCredentials calls the Cloudflare TURN REST API to get short-lived
// credentials. TTL controls how long the returned credentials stay valid (seconds).
func cloudflareTurnCredentials(ctx context.Context, cfg config.Config, client *http.Client) ([]iceServer, error) {
	// json.Marshal converts a Go value to a JSON byte slice.
	body, err := json.Marshal(fiber.Map{"ttl": cfg.CloudflareTurnTTL})
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf(
		"https://rtc.live.cloudflare.com/v1/turn/keys/%s/credentials/generate-ice-servers",
		cfg.CloudflareTurnKeyID,
	)

	// http.NewRequestWithContext attaches the context so the request is cancelled
	// automatically if the deadline expires or the caller cancels.
	// bytes.NewReader wraps the byte slice so it implements io.Reader, which
	// NewRequestWithContext requires for the body.
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.CloudflareTurnAPIToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	// defer ensures the response body is always closed, which releases the
	// underlying TCP connection back to the pool.
	defer resp.Body.Close()

	// Any status outside 2xx is treated as an error.
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("cloudflare turn credentials failed with status %d", resp.StatusCode)
	}

	// json.NewDecoder streams the response body directly into the struct without
	// reading the whole thing into memory first.
	var payload cloudflareTurnResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if len(payload.ICEServers) == 0 {
		return nil, errors.New("cloudflare turn credentials response did not include iceServers")
	}
	return payload.ICEServers, nil
}
