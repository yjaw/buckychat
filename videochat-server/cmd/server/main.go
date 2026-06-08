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

	"madfriends/videochat-server/internal/auth"
	"madfriends/videochat-server/internal/config"
	"madfriends/videochat-server/internal/db"
	"madfriends/videochat-server/internal/httpx"
	"madfriends/videochat-server/internal/matchmaking"
	"madfriends/videochat-server/internal/ratelimit"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5"
)

type reportRequest struct {
	ReportedUserID string `json:"reportedUserID"`
	RoomID         string `json:"roomID"`
	Reason         string `json:"reason"`
	Details        string `json:"details"`
}

type banRequest struct {
	Reason string `json:"reason"`
}

type iceServer struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}

type cloudflareTurnResponse struct {
	ICEServers []iceServer `json:"iceServers"`
}

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	store, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer store.Close()

	verifier := auth.NewVerifier(auth.VerifierConfig{
		SupabaseURL:       cfg.SupabaseURL,
		SupabaseJWKSURL:   cfg.SupabaseJWKSURL,
		SupabaseJWTSecret: cfg.SupabaseJWTSecret,
	})
	limiter := ratelimit.New()
	hub := matchmaking.NewHub(verifier, store, limiter, cfg.AllowSelfMatch)
	requireUser := auth.RequireActiveUser(verifier, store)

	app := fiber.New(fiber.Config{
		AppName:     "BuckyChat API",
		ReadTimeout: 10 * time.Second,
	})
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.ClientOrigin,
		AllowMethods:     "GET,POST,OPTIONS",
		AllowHeaders:     "Authorization,Content-Type",
		AllowCredentials: true,
	}))

	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	app.Get("/readyz", func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), 2*time.Second)
		defer cancel()
		if err := store.Pool.Ping(ctx); err != nil {
			return httpx.Error(c, fiber.StatusServiceUnavailable, "database unavailable")
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	api := app.Group("/api")
	api.Get("/me", requireUser, func(c *fiber.Ctx) error {
		user, _ := auth.CurrentUser(c)
		return c.JSON(user)
	})
	api.Get("/ice-config", requireUser, func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), 5*time.Second)
		defer cancel()
		iceServers, err := buildICEServers(ctx, cfg)
		if err != nil {
			log.Printf("ice config failed: %v", err)
			return httpx.Error(c, fiber.StatusBadGateway, "could not generate TURN credentials")
		}
		return c.JSON(fiber.Map{"iceServers": iceServers})
	})
	api.Post("/reports", requireUser, func(c *fiber.Ctx) error {
		user, _ := auth.CurrentUser(c)
		if !limiter.Allow("report:"+user.ID, 5, 10*time.Minute) {
			return httpx.Error(c, fiber.StatusTooManyRequests, "too many reports")
		}

		var body reportRequest
		if err := c.BodyParser(&body); err != nil {
			return httpx.Error(c, fiber.StatusBadRequest, "invalid report body")
		}

		body.Reason = strings.TrimSpace(body.Reason)
		body.Details = strings.TrimSpace(body.Details)
		if body.Reason == "" || len(body.Reason) > 80 {
			return httpx.Error(c, fiber.StatusBadRequest, "reason is required and must be under 80 characters")
		}
		if len(body.Details) > 1000 {
			return httpx.Error(c, fiber.StatusBadRequest, "details must be under 1000 characters")
		}

		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()
		report, err := store.CreateReport(ctx, user.ID, body.ReportedUserID, body.RoomID, body.Reason, body.Details)
		if err != nil {
			return httpx.Error(c, fiber.StatusInternalServerError, "could not create report")
		}
		return c.Status(fiber.StatusCreated).JSON(report)
	})

	admin := api.Group("/admin", requireUser, requireAdmin(cfg.AdminEmails))
	admin.Get("/reports", func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()
		reports, err := store.ListReports(ctx, 50)
		if err != nil {
			return httpx.Error(c, fiber.StatusInternalServerError, "could not list reports")
		}
		return c.JSON(fiber.Map{"reports": reports})
	})
	admin.Post("/users/:id/ban", func(c *fiber.Ctx) error {
		user, _ := auth.CurrentUser(c)
		targetID := c.Params("id")
		var body banRequest
		_ = c.BodyParser(&body)
		body.Reason = strings.TrimSpace(body.Reason)
		if body.Reason == "" {
			body.Reason = "Admin ban"
		}

		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()
		if err := store.BanUser(ctx, targetID, user.ID, body.Reason); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return httpx.Error(c, fiber.StatusNotFound, "user not found")
			}
			return httpx.Error(c, fiber.StatusInternalServerError, "could not ban user")
		}
		hub.Kick(targetID)
		return c.JSON(fiber.Map{"ok": true})
	})

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws/match", websocket.New(hub.Handler()))

	log.Printf("BuckyChat API listening on %s", cfg.ServerAddr)
	if err := app.Listen(cfg.ServerAddr); err != nil {
		log.Fatal(err)
	}
}

func requireAdmin(admins map[string]bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := auth.CurrentUser(c)
		if !ok || !admins[strings.ToLower(user.Email)] {
			return httpx.Error(c, fiber.StatusForbidden, "admin access required")
		}
		return c.Next()
	}
}

func buildICEServers(ctx context.Context, cfg config.Config) ([]iceServer, error) {
	if cfg.CloudflareTurnKeyID != "" && cfg.CloudflareTurnAPIToken != "" {
		return cloudflareTurnCredentials(ctx, cfg)
	}

	stunURLs := []string{}
	turnURLs := []string{}
	for _, raw := range cfg.TurnURLs {
		url := strings.TrimSpace(raw)
		if strings.HasPrefix(url, "turn:") || strings.HasPrefix(url, "turns:") {
			turnURLs = append(turnURLs, url)
		} else if url != "" {
			stunURLs = append(stunURLs, url)
		}
	}

	servers := []iceServer{}
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

func cloudflareTurnCredentials(ctx context.Context, cfg config.Config) ([]iceServer, error) {
	body, err := json.Marshal(fiber.Map{"ttl": cfg.CloudflareTurnTTL})
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf(
		"https://rtc.live.cloudflare.com/v1/turn/keys/%s/credentials/generate-ice-servers",
		cfg.CloudflareTurnKeyID,
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.CloudflareTurnAPIToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("cloudflare turn credentials failed with status %d", resp.StatusCode)
	}

	var payload cloudflareTurnResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if len(payload.ICEServers) == 0 {
		return nil, errors.New("cloudflare turn credentials response did not include iceServers")
	}
	return payload.ICEServers, nil
}
