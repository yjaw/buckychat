package main

import (
	"context"
	"io"
	"net/http"
	"reflect"
	"strings"
	"testing"

	"madfriends/videochat-server/internal/config"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestBuildICEServersUsesStaticConfig(t *testing.T) {
	servers, err := buildICEServers(context.Background(), config.Config{
		TurnURLs: []string{
			"stun:stun.l.google.com:19302",
			"turn:turn.example.com:3478?transport=udp",
			"turns:turn.example.com:443?transport=tcp",
		},
		TurnUsername:   "test-user",
		TurnCredential: "test-secret",
	})
	if err != nil {
		t.Fatalf("buildICEServers returned error: %v", err)
	}

	want := []iceServer{
		{URLs: []string{"stun:stun.l.google.com:19302"}},
		{
			URLs: []string{
				"turn:turn.example.com:3478?transport=udp",
				"turns:turn.example.com:443?transport=tcp",
			},
			Username:   "test-user",
			Credential: "test-secret",
		},
	}
	if !reflect.DeepEqual(servers, want) {
		t.Fatalf("buildICEServers() = %#v, want %#v", servers, want)
	}
}

func TestBuildICEServersGeneratesCloudflareConfig(t *testing.T) {
	originalClient := http.DefaultClient
	defer func() {
		http.DefaultClient = originalClient
	}()

	var sawRequest bool
	http.DefaultClient = &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		sawRequest = true
		if req.Method != http.MethodPost {
			t.Fatalf("method = %s, want %s", req.Method, http.MethodPost)
		}
		wantURL := "https://rtc.live.cloudflare.com/v1/turn/keys/test-key/credentials/generate-ice-servers"
		if req.URL.String() != wantURL {
			t.Fatalf("url = %s, want %s", req.URL.String(), wantURL)
		}
		if got := req.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Fatalf("authorization = %q, want bearer token", got)
		}
		if got := req.Header.Get("Content-Type"); got != "application/json" {
			t.Fatalf("content-type = %q, want application/json", got)
		}

		body, err := io.ReadAll(req.Body)
		if err != nil {
			t.Fatalf("reading request body: %v", err)
		}
		if strings.TrimSpace(string(body)) != `{"ttl":120}` {
			t.Fatalf("body = %s, want ttl json", body)
		}

		return &http.Response{
			StatusCode: http.StatusCreated,
			Header:     make(http.Header),
			Body: io.NopCloser(strings.NewReader(`{
				"iceServers": [
					{
						"urls": ["turn:turn.cloudflare.com:3478?transport=udp"],
						"username": "issued-user",
						"credential": "issued-secret"
					}
				]
			}`)),
		}, nil
	})}

	servers, err := buildICEServers(context.Background(), config.Config{
		TurnURLs:               []string{"stun:stun.l.google.com:19302"},
		CloudflareTurnKeyID:    "test-key",
		CloudflareTurnAPIToken: "test-token",
		CloudflareTurnTTL:      120,
	})
	if err != nil {
		t.Fatalf("buildICEServers returned error: %v", err)
	}
	if !sawRequest {
		t.Fatal("expected Cloudflare credentials request")
	}

	want := []iceServer{
		{
			URLs:       []string{"turn:turn.cloudflare.com:3478?transport=udp"},
			Username:   "issued-user",
			Credential: "issued-secret",
		},
	}
	if !reflect.DeepEqual(servers, want) {
		t.Fatalf("buildICEServers() = %#v, want %#v", servers, want)
	}
}
