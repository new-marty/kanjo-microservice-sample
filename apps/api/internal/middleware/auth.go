package middleware

import (
	"github.com/gin-gonic/gin"
)

// Auth is a placeholder middleware for future authentication.
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement authentication
		c.Next()
	}
}
