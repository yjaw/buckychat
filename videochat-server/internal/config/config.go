package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv                 string
	ServerAddr             string
	ClientOrigin           string
	DatabaseURL            string
	SupabaseURL            string
	SupabaseJWKSURL        string
	SupabaseJWTSecret      string
	AdminEmails            map[string]bool
	TurnURLs               []string
	TurnUsername           string
	TurnCredential         string
	CloudflareTurnKeyID    string
	CloudflareTurnAPIToken string
	CloudflareTurnTTL      int
	AllowSelfMatch         bool
}

func Load() Config {
	loadDotEnv(".env")
	loadDotEnv(filepath.Join("..", ".env"))

	serverAddr := getenv("SERVER_ADDR", "")
	if serverAddr == "" {
		if port := getenv("PORT", ""); port != "" {
			serverAddr = ":" + port
		} else {
			serverAddr = ":8080"
		}
	}

	supabaseURL := strings.TrimRight(getenv("SUPABASE_URL", ""), "/")
	jwksURL := getenv("SUPABASE_JWKS_URL", "")
	if jwksURL == "" && supabaseURL != "" {
		jwksURL = supabaseURL + "/auth/v1/.well-known/jwks.json"
	}

	return Config{
		AppEnv:                 getenv("APP_ENV", "development"),
		ServerAddr:             serverAddr,
		ClientOrigin:           getenv("CLIENT_ORIGIN", "http://127.0.0.1:5174,http://localhost:5173"),
		DatabaseURL:            getenv("DATABASE_URL", ""),
		SupabaseURL:            supabaseURL,
		SupabaseJWKSURL:        jwksURL,
		SupabaseJWTSecret:      getenv("SUPABASE_JWT_SECRET", ""),
		AdminEmails:            emailSet(getenv("ADMIN_EMAILS", "")),
		TurnURLs:               csv(getenv("TURN_URLS", "stun:stun.l.google.com:19302")),
		TurnUsername:           getenv("TURN_USERNAME", ""),
		TurnCredential:         getenv("TURN_CREDENTIAL", ""),
		CloudflareTurnKeyID:    getenv("CLOUDFLARE_TURN_KEY_ID", ""),
		CloudflareTurnAPIToken: getenv("CLOUDFLARE_TURN_API_TOKEN", ""),
		CloudflareTurnTTL:      intenv("CLOUDFLARE_TURN_TTL", 86400),
		AllowSelfMatch:         boolenv("ALLOW_SELF_MATCH", false),
	}
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func boolenv(key string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func intenv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func csv(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func emailSet(value string) map[string]bool {
	set := map[string]bool{}
	for _, email := range csv(value) {
		set[strings.ToLower(email)] = true
	}
	return set
}

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if key != "" && os.Getenv(key) == "" {
			_ = os.Setenv(key, value)
		}
	}
}
