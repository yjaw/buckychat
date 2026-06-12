package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type Claims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
	Role  string `json:"role"`
}

type Verifier struct {
	issuer    string
	jwksURL   string
	hsSecret  string
	client    *http.Client
	mu        sync.RWMutex
	keys      map[string]any
	expiresAt time.Time
}

type VerifierConfig struct {
	SupabaseURL       string
	SupabaseJWKSURL   string
	SupabaseJWTSecret string
}

func NewVerifier(cfg VerifierConfig) *Verifier {
	issuer := strings.TrimRight(cfg.SupabaseURL, "/")
	if issuer != "" {
		issuer += "/auth/v1"
	}

	return &Verifier{
		issuer:   issuer,
		jwksURL:  cfg.SupabaseJWKSURL,
		hsSecret: cfg.SupabaseJWTSecret,
		client:   &http.Client{Timeout: 5 * time.Second},
		keys:     map[string]any{},
	}
}

func (v *Verifier) Verify(ctx context.Context, raw string) (User, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return User{}, errors.New("missing access token")
	}

	options := []jwt.ParserOption{
		jwt.WithExpirationRequired(),
		jwt.WithAudience("authenticated"),
		jwt.WithValidMethods([]string{"RS256", "ES256", "HS256"}),
	}
	if v.issuer != "" {
		options = append(options, jwt.WithIssuer(v.issuer))
	}

	claims := &Claims{}
	token, err := jwt.NewParser(options...).ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		return v.keyForToken(ctx, token)
	})
	if err != nil {
		return User{}, err
	}
	if !token.Valid {
		return User{}, errors.New("invalid access token")
	}
	if claims.Subject == "" || claims.Email == "" {
		return User{}, errors.New("token is missing required claims")
	}
	if claims.Role != "authenticated" {
		return User{}, errors.New("token does not have authenticated role")
	}
	if !strings.EqualFold(emailDomain(claims.Email), "wisc.edu") {
		return User{}, errors.New("only wisc.edu accounts are allowed")
	}

	return User{ID: claims.Subject, Email: strings.ToLower(claims.Email)}, nil
}

func (v *Verifier) keyForToken(ctx context.Context, token *jwt.Token) (any, error) {
	alg := token.Method.Alg()
	if alg == "HS256" {
		if v.hsSecret == "" {
			return nil, errors.New("HS256 token received but SUPABASE_JWT_SECRET is not configured")
		}
		return []byte(v.hsSecret), nil
	}

	kid, _ := token.Header["kid"].(string)
	if kid == "" {
		return nil, errors.New("token is missing kid header")
	}

	if key := v.cachedKey(kid); key != nil {
		return key, nil
	}
	if err := v.refreshKeys(ctx); err != nil {
		return nil, err
	}
	if key := v.cachedKey(kid); key != nil {
		return key, nil
	}
	return nil, fmt.Errorf("no JWKS key found for kid %q", kid)
}

func (v *Verifier) cachedKey(kid string) any {
	v.mu.RLock()
	defer v.mu.RUnlock()
	if time.Now().After(v.expiresAt) {
		return nil
	}
	return v.keys[kid]
}

func (v *Verifier) refreshKeys(ctx context.Context) error {
	if v.jwksURL == "" {
		return errors.New("SUPABASE_JWKS_URL is required for asymmetric JWT verification")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("jwks fetch failed with status %d", resp.StatusCode)
	}

	var set struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return err
	}

	keys := map[string]any{}
	for _, raw := range set.Keys {
		key, err := raw.key()
		if err == nil && raw.Kid != "" {
			keys[raw.Kid] = key
		}
	}
	if len(keys) == 0 {
		return errors.New("jwks response did not contain usable keys")
	}

	v.mu.Lock()
	v.keys = keys
	v.expiresAt = time.Now().Add(10 * time.Minute)
	v.mu.Unlock()

	return nil
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	Crv string `json:"crv"`
	N   string `json:"n"`
	E   string `json:"e"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

func (j jwk) key() (any, error) {
	switch j.Kty {
	case "RSA":
		nBytes, err := base64.RawURLEncoding.DecodeString(j.N)
		if err != nil {
			return nil, err
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(j.E)
		if err != nil {
			return nil, err
		}
		e := 0
		for _, b := range eBytes {
			e = e<<8 + int(b)
		}
		return &rsa.PublicKey{N: new(big.Int).SetBytes(nBytes), E: e}, nil
	case "EC":
		if j.Crv != "P-256" {
			return nil, fmt.Errorf("unsupported EC curve %q", j.Crv)
		}
		xBytes, err := base64.RawURLEncoding.DecodeString(j.X)
		if err != nil {
			return nil, err
		}
		yBytes, err := base64.RawURLEncoding.DecodeString(j.Y)
		if err != nil {
			return nil, err
		}
		return &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported jwk type %q", j.Kty)
	}
}

func emailDomain(email string) string {
	_, domain, ok := strings.Cut(strings.TrimSpace(email), "@")
	if !ok {
		return ""
	}
	if strings.Contains(domain, "@") {
		return ""
	}
	return strings.ToLower(domain)
}
