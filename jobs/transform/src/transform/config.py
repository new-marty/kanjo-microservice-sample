"""Configuration management for transform pipeline.

All settings can be configured via environment variables or .env file.

Example .env:
    DATABASE_URL=postgresql://user:pass@localhost:5432/kanjo
    OPENROUTER_API_KEY=sk-or-...
    LLM_MODEL=anthropic/claude-haiku-4.5
    BATCH_SIZE=1000  # Optional: limit for debugging
"""

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    """Transform pipeline configuration."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = Field(..., description="PostgreSQL connection URL")
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO", description="Logging level"
    )

    # LLM configuration (via OpenRouter)
    openrouter_api_key: str | None = Field(default=None)
    llm_model: str = Field(
        default="anthropic/claude-haiku-4.5",
        description="OpenRouter model ID (e.g., anthropic/claude-haiku-4.5, openai/gpt-4o-mini)",
    )

    # Pipeline configuration
    batch_size: int | None = Field(
        default=None,
        ge=1,
        description="Max transactions per run. None = no limit.",
    )
    max_llm_calls_per_run: int | None = Field(
        default=None,
        ge=1,
        description="Max LLM calls per run. None = no limit.",
    )
