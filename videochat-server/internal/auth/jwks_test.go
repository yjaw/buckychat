package auth

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestVerifyAcceptsAuthenticatedUserToken(t *testing.T) {
	verifier := testVerifier()
	user, err := verifier.Verify(context.Background(), signedToken(t, validClaims()))
	if err != nil {
		t.Fatalf("Verify returned error: %v", err)
	}
	if user.ID != "00000000-0000-0000-0000-000000000001" || user.Email != "student@wisc.edu" {
		t.Fatalf("Verify returned user %#v", user)
	}
}

func TestVerifyRejectsWrongAudience(t *testing.T) {
	claims := validClaims()
	claims.Audience = jwt.ClaimStrings{"anon"}

	if _, err := testVerifier().Verify(context.Background(), signedToken(t, claims)); err == nil {
		t.Fatal("expected Verify to reject token with wrong audience")
	}
}

func TestVerifyRejectsNonAuthenticatedRole(t *testing.T) {
	claims := validClaims()
	claims.Role = "service_role"

	if _, err := testVerifier().Verify(context.Background(), signedToken(t, claims)); err == nil {
		t.Fatal("expected Verify to reject token with non-authenticated role")
	}
}

func testVerifier() *Verifier {
	return NewVerifier(VerifierConfig{
		SupabaseURL:       "https://example.supabase.co",
		SupabaseJWTSecret: "test-secret",
	})
}

func validClaims() Claims {
	return Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "00000000-0000-0000-0000-000000000001",
			Issuer:    "https://example.supabase.co/auth/v1",
			Audience:  jwt.ClaimStrings{"authenticated"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
		Email: "student@wisc.edu",
		Role:  "authenticated",
	}
}

func signedToken(t *testing.T, claims Claims) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	raw, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("signing token: %v", err)
	}
	return raw
}
