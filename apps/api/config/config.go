package config

import (
	"os"
)

type Config struct {
	DatabaseURL   string
	Port          string
	LogFormat     string
	CORSOrigins   string
	OpenRouterURL string
}

func Load() *Config {
	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://dev:dev@localhost:5432/kanjo?sslmode=disable"),
		Port:          getEnv("PORT", "8080"),
		LogFormat:     getEnv("LOG_FORMAT", "text"),
		CORSOrigins:   getEnv("CORS_ORIGINS", "http://localhost:3000"),
		OpenRouterURL: getEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
