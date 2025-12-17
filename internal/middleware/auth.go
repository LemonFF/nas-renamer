package middleware

import (
	"nas-renamer/design"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SessionStore is a simple in-memory session manager.
type SessionStore struct {
	sessions map[string]design.Session
	mu       sync.RWMutex
}

var Store = &SessionStore{
	sessions: make(map[string]design.Session),
}

func (s *SessionStore) CreateSession() string {
	s.mu.Lock()
	defer s.mu.Unlock()

	token := uuid.New().String()
	s.sessions[token] = design.Session{
		Token:     token,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	return token
}

func (s *SessionStore) Validate(token string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, ok := s.sessions[token]
	if !ok {
		return false
	}
	if time.Now().After(sess.ExpiresAt) {
		delete(s.sessions, token) // lazy cleanup
		return false
	}
	return true
}

// AuthMiddleware ensures the request has a valid token.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Check Authorization header: Bearer <token>
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization header"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization format"})
			return
		}

		token := parts[1]
		if !Store.Validate(token) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Next()
	}
}
