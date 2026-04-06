# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanjo is a standalone backend microservice for personal finance. It wraps MoneyForward ME, providing a REST API for visualization and analysis. Data is ingested by a scraper and enriched by an LLM-powered transform pipeline.

**Tech Stack:**

- Backend: Go 1.24 with Gin framework, sqlc for database layer
- Scraper: TypeScript with Playwright
- Transform Job: Python 3.12 with uv for package management
- Database: PostgreSQL 17
- Package Managers: pnpm 9.15.4 (TypeScript jobs), uv (Python)

## Commands

### Development

```bash
task dev              # Start all services (db + api)
task dev:api          # Start Go API with hot reload (air)
task dev:db           # Start Postgres via Docker Compose
```

### Build, Test, Lint

```bash
task build            # Build Go API server and CLI
task lint             # Lint Go code (golangci-lint)
task test             # Run Go tests
task format           # Format Go code (gofmt + goimports)
task check            # Run all checks (lint + test)
task ship             # Format, check, create PR, and merge to main
```

### Code Generation

```bash
task generate         # Generate OpenAPI spec and sqlc code
task generate:openapi # Generate OpenAPI YAML from Go code
task generate:sqlc    # Generate Go DB code from SQL queries
```

### Database

```bash
task migrate          # Run database migrations
task migrate:create   # Create new migration file
```

### Scraper

```bash
task scraper:login    # Interactive login for initial 2FA setup
task scraper:initial  # Run initial backfill (downloads CSV history)
task scraper:fetch    # Run daily fetch job
task scraper:refresh  # Trigger MoneyForward account refresh
```

### Transform

```bash
task transform:run      # Run transform pipeline once
task transform:backfill # Backfill all historical transactions
task transform:listen   # Listen for scraper events and transform
```

## Git Workflow

### AI-Automated Ship Flow

When implementing features or fixes:

1. **Create a feature branch** before starting work:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement and commit** on the feature branch.

3. **Ship to main** after completing the implementation:

   ```bash
   task ship
   ```

   This will: rebase onto main → format → run all checks → push → create PR → squash-merge → return to main.

   If checks fail or rebase conflicts occur, fix them and run `task ship` again.

### Multi-Agent Concurrent Work

Multiple Claude Code agents can work on this project simultaneously. Each agent **must** work on its own branch:

1. **At session start**, if you land on a dirty feature branch, it belongs to another agent. Create your own branch from main:
   ```bash
   git checkout main && git pull origin main && git checkout -b feature/your-feature
   ```
2. **Never switch to or commit on** another agent's branch.
3. **Ship your work** with `task ship` before stopping — the stop hook blocks if unshipped work exists.

### CI (GitHub Actions)

CI runs on all PRs and pushes to main:

- **go job**: gofmt check, golangci-lint, test
- **openapi-check job**: verifies generated OpenAPI spec matches committed spec

## Architecture

### Repository Structure

```
apps/
  api/         # Go backend (Gin, sqlc) - NOT a pnpm package
jobs/
  scraper/     # TypeScript - Playwright-based MoneyForward ME scraper
  transform/   # Python - LLM/ML-powered transaction categorization
  shared/      # TypeScript - Shared utilities for jobs
docs/          # See docs/README.md for navigation
```

### API Backend (apps/api/)

- `cmd/server/` - API server entry point
- `cmd/kanjo/` - CLI entry point (cobra)
- `internal/handler/` - HTTP endpoints
- `internal/service/` - Business logic
- `internal/repository/` - Generated sqlc code
- `internal/cli/` - CLI commands (thin HTTP client wrapping API)
- `db/migrations/` - Goose SQL migrations
- `db/queries/` - Source for sqlc generation
- `api/openapi.yaml` - OpenAPI spec

### Code Generation Flow

1. SQL queries (`db/queries/*.sql`) → sqlc → Go repository code
2. Go handler annotations → openapi-gen → OpenAPI 3.0 spec (`api/openapi.yaml`)

## Data Architecture

```
Scraper (TS) → mf_raw.* → NOTIFY → Transform (Python) → kanjo.* → API (Go)
```

- **`mf_raw` schema**: Scraper-owned, read-only for API
- **`kanjo` schema**: App-owned, written by transform, read by API
- All financial amounts are **integer yen** (no floating point)
- Transaction deduplication by SHA-256 hash of `date|amount|account|description`
- LLM categorization via [OpenRouter](https://openrouter.ai) — set `OPENROUTER_API_KEY` in `jobs/transform/.env`

See [docs/architecture/data-flow.md](docs/architecture/data-flow.md) for the full pipeline, [docs/principles/data.md](docs/principles/data.md) for data constraints and ML strategy.

## Documentation

- Use Mermaid for diagrams, never ASCII art
- Keep docs minimal and easy to read—include only what's necessary, but ensure all necessary info is present
- When decisions are made or patterns established, document them in this file (CLAUDE.md) and/or [docs/](docs/README.md)
- See [docs/principles/documentation.md](docs/principles/documentation.md) for full documentation guidelines

## Code Style

- **TypeScript package manager:** Always use `pnpm`, never `npm` or `yarn`.
- **Python package manager:** Always use `uv` with `pyproject.toml`. Never use `pip`, `requirements.txt`, or `setup.py`.
- **Comments:** Only comment _why_, not _what_. Do not add comments that restate the code.
- **Clean PRs:** Remove excessive logs, debug statements, and unnecessary comments before sending a PR.
- **Clean code:** Keep the codebase clean. No overengineering—only build what's needed.
- **Ask for help:** If stuck or unsure, ask the human rather than guessing.

### Python Projects

All Python code uses `uv` for package management:

```bash
cd jobs/transform
uv sync              # Install dependencies
uv run transform     # Run the CLI
uv add <package>     # Add a dependency
```

Configuration is in `pyproject.toml`. Do not create `requirements.txt`, `setup.py`, or use `pip install`.

## Architecture Principles

- No overengineering—build only what's needed now
- No backwards-compatibility shims—don't keep dead code around for compatibility
- When refactoring, remove anything unnecessary
- Delete unused code completely—never comment it out or prefix with underscore to silence linters

### Library Selection

When choosing new dependencies, prioritize:

- **Trustworthy and production-proven:** Backed by a reputable org or well-established community
- **Actively maintained:** Regular releases, responsive issue tracking
- **Popular and widely adopted:** Strong download numbers, large user base
- **Safe to use:** No known security vulnerabilities
- **Modern over legacy:** Prefer newer libraries over legacy alternatives
- **Maintainable after adoption:** Clean API that produces readable, type-safe, clean code

## Key Patterns

- **Validation:** Pydantic for Python
- **Environment:** API expects `DATABASE_URL` for PostgreSQL connection
- **Python jobs:** Use uv for package management, structlog for logging, pydantic-settings for config

## API-CLI Parity Rule

**Every API endpoint must have exactly one CLI command, and every CLI command must map to exactly one API endpoint.** No endpoint without a CLI command, no CLI command without an endpoint.

The CLI (`cmd/kanjo/`) is a thin HTTP client that calls the API server. It uses cobra for command structure.

## Adding a New API Endpoint

1. Add Go handler in `apps/api/internal/handler/` with swag annotations (`@ID`, `@Summary`, `@Tags`, `@Param`, `@Success`, `@Router`)
2. Add SQL query in `apps/api/db/queries/` (if needed)
3. Run `task generate:sqlc` (if SQL changed)
4. Register route in `apps/api/cmd/server/main.go`
5. Run `task generate:openapi` to regenerate OpenAPI spec
6. Add corresponding CLI command in `apps/api/internal/cli/`
