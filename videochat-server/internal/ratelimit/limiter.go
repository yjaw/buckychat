package ratelimit

import (
	"sync"
	"time"
)

type entry struct {
	count     int
	expiresAt time.Time
}

type Limiter struct {
	mu      sync.Mutex
	entries map[string]entry
}

func New() *Limiter {
	return &Limiter{entries: map[string]entry{}}
}

func (l *Limiter) Allow(key string, limit int, window time.Duration) bool {
	now := time.Now()

	l.mu.Lock()
	defer l.mu.Unlock()

	current := l.entries[key]
	if current.expiresAt.Before(now) {
		// Evict all stale entries when the current key has expired.
		// This keeps the map from growing unboundedly.
		for k, e := range l.entries {
			if e.expiresAt.Before(now) {
				delete(l.entries, k)
			}
		}
		current = entry{expiresAt: now.Add(window)}
	}

	current.count++
	l.entries[key] = current

	return current.count <= limit
}
