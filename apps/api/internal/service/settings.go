package service

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/repository"
)

// SettingsService handles business logic for app settings.
type SettingsService struct {
	queries *repository.Queries
}

// NewSettingsService creates a new SettingsService.
func NewSettingsService(queries *repository.Queries) *SettingsService {
	return &SettingsService{queries: queries}
}

// Setting represents an app setting with its value masked if secret.
type Setting struct {
	Key         string    `json:"key"`
	Value       string    `json:"value"`
	IsSecret    bool      `json:"is_secret"`
	Description string    `json:"description"`
	Configured  bool      `json:"configured"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// List returns all settings with secret values masked.
func (s *SettingsService) List(ctx context.Context) ([]Setting, error) {
	rows, err := s.queries.ListSettings(ctx)
	if err != nil {
		return nil, apperror.InternalWithErr("failed to list settings", err)
	}

	result := make([]Setting, len(rows))
	for i, r := range rows {
		result[i] = Setting{
			Key:         r.Key,
			Value:       maskIfSecret(r.Value, r.IsSecret),
			IsSecret:    r.IsSecret,
			Description: r.Description,
			Configured:  r.Value != "",
			UpdatedAt:   r.UpdatedAt.Time,
		}
	}
	return result, nil
}

// GetPlaintext returns the plaintext value of a setting (for internal use).
func (s *SettingsService) GetPlaintext(ctx context.Context, key string) (string, error) {
	row, err := s.queries.GetSetting(ctx, key)
	if err != nil {
		return "", apperror.InternalWithErr("failed to get setting", err)
	}
	return row.Value, nil
}

// Update sets the value of a setting.
func (s *SettingsService) Update(ctx context.Context, key, value string) error {
	// Verify the key exists first
	existing, err := s.queries.GetSetting(ctx, key)
	if err != nil {
		return apperror.NotFoundWithErr("setting", err)
	}

	err = s.queries.UpsertSetting(ctx, repository.UpsertSettingParams{
		Key:         key,
		Value:       value,
		IsSecret:    existing.IsSecret,
		Description: existing.Description,
	})
	if err != nil {
		return apperror.InternalWithErr("failed to update setting", err)
	}
	return nil
}

// SeedFromEnv seeds empty settings from environment variables on first startup.
func (s *SettingsService) SeedFromEnv(ctx context.Context) {
	envMap := map[string]string{
		"openrouter_api_key":   "OPENROUTER_API_KEY",
		"llm_model":            "DEFAULT_CHAT_MODEL",
		"mf_email":             "MF_EMAIL",
		"mf_password":          "MF_PASSWORD",
		"gmail_user":           "GMAIL_USER",
		"gmail_app_password":   "GMAIL_APP_PASSWORD",
		"bluebubbles_url":      "BLUEBUBBLES_URL",
		"bluebubbles_password": "BLUEBUBBLES_PASSWORD",
	}

	rows, err := s.queries.ListSettings(ctx)
	if err != nil {
		slog.Warn("failed to list settings for seeding", "error", err)
		return
	}

	for _, row := range rows {
		if row.Value != "" {
			continue
		}
		envVar, ok := envMap[row.Key]
		if !ok {
			continue
		}
		envVal := os.Getenv(envVar)
		if envVal == "" {
			continue
		}
		err := s.queries.UpsertSetting(ctx, repository.UpsertSettingParams{
			Key:         row.Key,
			Value:       envVal,
			IsSecret:    row.IsSecret,
			Description: row.Description,
		})
		if err != nil {
			slog.Warn("failed to seed setting from env", "key", row.Key, "error", err)
			continue
		}
		slog.Info("seeded setting from env", "key", row.Key, "env", envVar)
	}
}

func maskIfSecret(value string, isSecret bool) string {
	if !isSecret || value == "" {
		return value
	}
	if len(value) <= 4 {
		return "****"
	}
	return "****" + value[len(value)-4:]
}
