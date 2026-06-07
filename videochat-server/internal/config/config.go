package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	AppEnv            string
	ServerAddr        string
	ClientOrigin      string
	DatabaseURL       string
	SupabaseURL       string
	SupabaseJWKSURL   string
	SupabaseJWTSecret string
	AdminEmails       map[string]bool
	TurnURLs          []string
	TurnUsername      string
	TurnCredential    string
	AllowSelfMatch    bool
}

func Load() Config {
	loadDotEnv(".env")
	loadDotEnv(filepath.Join("..", ".env"))

	supabaseURL := strings.TrimRight(getenv("SUPABASE_URL", ""), "/")
	jwksURL := getenv("SUPABASE_JWKS_URL", "")
	if jwksURL == "" && supabaseURL != "" {
		jwksURL = supabaseURL + "/auth/v1/.well-known/jwks.json"
	}

	return Config{
		AppEnv:            getenv("APP_ENV", "development"),
		ServerAddr:        getenv("SERVER_ADDR", ":8080"),
		ClientOrigin:      getenv("CLIENT_ORIGIN", "http://127.0.0.1:5174,http://localhost:5173"),
		DatabaseURL:       getenv("DATABASE_URL", ""),
		SupabaseURL:       supabaseURL,
		SupabaseJWKSURL:   jwksURL,
		SupabaseJWTSecret: getenv("SUPABASE_JWT_SECRET", ""),
		AdminEmails:       emailSet(getenv("ADMIN_EMAILS", "")),
		TurnURLs:          csv(getenv("TURN_URLS", "stun:stun.l.google.com:19302")),
		TurnUsername:      getenv("TURN_USERNAME", ""),
		TurnCredential:    getenv("TURN_CREDENTIAL", ""),
		AllowSelfMatch:    boolenv("ALLOW_SELF_MATCH", false),
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
