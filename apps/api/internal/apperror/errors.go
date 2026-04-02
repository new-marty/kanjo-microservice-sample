package apperror

import (
	"errors"
	"fmt"
)

// ErrorCode represents application error codes.
type ErrorCode string

const (
	CodeNotFound     ErrorCode = "NOT_FOUND"
	CodeInvalidInput ErrorCode = "INVALID_INPUT"
	CodeInternal     ErrorCode = "INTERNAL_ERROR"
	CodeTimeout      ErrorCode = "TIMEOUT"
)

// AppError represents an application error with code and message.
type AppError struct {
	Code    ErrorCode
	Message string
	Err     error
	Fields  map[string]string
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// NotFound creates a not found error.
func NotFound(resource string) *AppError {
	return &AppError{
		Code:    CodeNotFound,
		Message: fmt.Sprintf("%s not found", resource),
	}
}

// NotFoundWithErr creates a not found error with underlying error.
func NotFoundWithErr(resource string, err error) *AppError {
	return &AppError{
		Code:    CodeNotFound,
		Message: fmt.Sprintf("%s not found", resource),
		Err:     err,
	}
}

// InvalidInput creates an invalid input error.
func InvalidInput(message string) *AppError {
	return &AppError{
		Code:    CodeInvalidInput,
		Message: message,
	}
}

// InvalidInputWithErr creates an invalid input error with underlying error.
func InvalidInputWithErr(message string, err error) *AppError {
	return &AppError{
		Code:    CodeInvalidInput,
		Message: message,
		Err:     err,
	}
}

// InvalidInputFields creates an invalid input error with per-field messages.
func InvalidInputFields(fields map[string]string) *AppError {
	return &AppError{
		Code:    CodeInvalidInput,
		Message: "validation failed",
		Fields:  fields,
	}
}

// Internal creates an internal error.
func Internal(message string) *AppError {
	return &AppError{
		Code:    CodeInternal,
		Message: message,
	}
}

// InternalWithErr creates an internal error with underlying error.
func InternalWithErr(message string, err error) *AppError {
	return &AppError{
		Code:    CodeInternal,
		Message: message,
		Err:     err,
	}
}

// Timeout creates a timeout error.
func Timeout(message string) *AppError {
	return &AppError{
		Code:    CodeTimeout,
		Message: message,
	}
}

// IsNotFound checks if error is a not found error.
func IsNotFound(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Code == CodeNotFound
	}
	return false
}

// IsInvalidInput checks if error is an invalid input error.
func IsInvalidInput(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Code == CodeInvalidInput
	}
	return false
}
