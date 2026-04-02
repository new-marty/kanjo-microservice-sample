package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/applog"
)

// ErrorResponse represents an error response body.
type ErrorResponse struct {
	Error  string            `json:"error"`
	Code   string            `json:"code,omitempty"`
	Fields map[string]string `json:"fields,omitempty"`
}

// handleError maps application errors to HTTP responses.
func handleError(c *gin.Context, err error) {
	log := applog.Logger(c.Request.Context())

	// Check for context deadline/cancellation first
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		log.Warn("request timeout", "method", c.Request.Method, "path", c.Request.URL.Path, "error", err)
		c.JSON(http.StatusGatewayTimeout, ErrorResponse{
			Error: "request timed out",
			Code:  string(apperror.CodeTimeout),
		})
		return
	}

	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		status := mapErrorCodeToStatus(appErr.Code)
		resp := ErrorResponse{
			Error:  appErr.Message,
			Code:   string(appErr.Code),
			Fields: appErr.Fields,
		}
		if status >= 500 {
			log.Error("server error", "code", appErr.Code, "message", appErr.Message, "error", appErr.Err, "method", c.Request.Method, "path", c.Request.URL.Path)
		}
		c.JSON(status, resp)
		return
	}

	// Handle pgx not found
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error: "resource not found",
			Code:  string(apperror.CodeNotFound),
		})
		return
	}

	log.Error("unexpected error", "error", err, "method", c.Request.Method, "path", c.Request.URL.Path)
	c.JSON(http.StatusInternalServerError, ErrorResponse{
		Error: "internal server error",
		Code:  string(apperror.CodeInternal),
	})
}

func mapErrorCodeToStatus(code apperror.ErrorCode) int {
	switch code {
	case apperror.CodeNotFound:
		return http.StatusNotFound
	case apperror.CodeInvalidInput:
		return http.StatusBadRequest
	case apperror.CodeTimeout:
		return http.StatusGatewayTimeout
	case apperror.CodeInternal:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}
