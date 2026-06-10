package auth

import (
	"context"
	"strings"
	"time"

	"buckychat/videochat-server/internal/db"
	"buckychat/videochat-server/internal/httpx"

	"github.com/gofiber/fiber/v2"
)

const userLocalKey = "madfriends.user"

type AuthenticatedUser struct {
	User
	Status string `json:"status"`
}

func RequireActiveUser(verifier *Verifier, store *db.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := bearerToken(c.Get("Authorization"))
		user, err := verifier.Verify(c.UserContext(), token)
		if err != nil {
			return httpx.Error(c, fiber.StatusUnauthorized, "invalid or expired session")
		}

		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()

		profile, err := store.EnsureProfile(ctx, user.ID, user.Email)
		if err != nil {
			return httpx.Error(c, fiber.StatusInternalServerError, "could not load profile")
		}
		if profile.Status != "active" {
			return httpx.Error(c, fiber.StatusForbidden, "account is not active")
		}

		c.Locals(userLocalKey, AuthenticatedUser{
			User:   user,
			Status: profile.Status,
		})
		return c.Next()
	}
}

func CurrentUser(c *fiber.Ctx) (AuthenticatedUser, bool) {
	user, ok := c.Locals(userLocalKey).(AuthenticatedUser)
	return user, ok
}

func bearerToken(header string) string {
	header = strings.TrimSpace(header)
	rest, ok := strings.CutPrefix(strings.ToLower(header), "bearer ")
	if !ok {
		return ""
	}
	// Slice the original header to preserve token casing.
	return strings.TrimSpace(header[len(header)-len(rest):])
}
