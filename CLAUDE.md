# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanjo is a personal finance application that wraps MoneyForward ME, providing web and mobile interfaces for visualization and analysis. Data is ingested by a separate scraper service (mf-fetch) that writes to shared PostgreSQL tables.

**Tech Stack:**

- Backend: Go 1.23 with Gin framework, sqlc for database layer
- Frontend Web: React 19 + Vite + TypeScript (SPA, no SSR)
- Mobile: React Native via Expo with file-based routing
- Transform Job: Python 3.12 with uv for package management
- Database: PostgreSQL 17
- Package Managers: pnpm 9.15.4 (TypeScript), uv (Python)

## Commands

### Development

```bash
task dev              # Start all services (db + api + web)
task dev:api          # Start Go API with hot reload (air)
task dev:web          # Start Vite dev server
task dev:mobile       # Start Expo dev server
task dev:db           # Start Postgres via Docker Compose
```

### Build, Test, Lint

```bash
task build            # Build all packages (TS + Go)
task lint             # Lint everything (ESLint + golangci-lint)
task typecheck        # TypeScript type checking
task test             # Run all tests (Vitest + Go tests)
task format           # Format all code (prettier + gofmt + goimports)
task knip             # Find unused exports and dependencies
task check            # Run all checks (lint + typecheck + test + knip)
task ship             # Format, check, create PR, and merge to main
```

### Code Generation

```bash
task generate         # Generate OpenAPI spec and TS client
task generate:openapi # Generate OpenAPI YAML from Go code
task generate:client  # Generate TS client from OpenAPI (orval)
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

2. **Implement and commit** on the feature branch. Files are auto-formatted on every edit via hooks.

3. **Ship to main** after completing the implementation:

   ```bash
   task ship
   ```

   This will: rebase onto main → format → run all checks → push → create PR → squash-merge → return to main.

   If checks fail or rebase conflicts occur, fix them and run `task ship` again.

After completing any feature or bug fix on a feature branch, always run `task ship` to merge to main.

### Multi-Agent Concurrent Work

Multiple Claude Code agents can work on this project simultaneously. Each agent **must** work on its own branch:

1. **At session start**, if you land on a dirty feature branch, it belongs to another agent. Create your own branch from main:
   ```bash
   git checkout main && git pull origin main && git checkout -b feature/your-feature
   ```
2. **Never switch to or commit on** another agent's branch.
3. **Ship your work** with `task ship` before stopping — the stop hook blocks if unshipped work exists.

Hooks enforce this automatically via git state (no shared temp files).

### CI (GitHub Actions)

CI runs on all PRs and pushes to main:

- **typescript job**: lint, typecheck, knip, test
- **go job**: gofmt check, golangci-lint, test
- **openapi-check job**: verifies generated OpenAPI spec matches committed spec

## Architecture

### Monorepo Structure

```
apps/
  api/         # Go backend (Gin, sqlc) - NOT a pnpm package
  web/         # React SPA (Vite)
  mobile/      # React Native (Expo)
packages/
  api-client/  # Generated TypeScript API client (orval)
  shared/      # Shared utilities, validators, constants, hooks
  ui/          # Shared UI components
tooling/
  prettier/    # Shared Prettier config
  typescript/  # Shared TypeScript base configs
jobs/
  scraper/     # TypeScript - Playwright-based MoneyForward ME scraper
  transform/   # Python - LLM/ML-powered transaction categorization
  shared/      # TypeScript - Shared utilities for jobs
docs/                 # See docs/README.md for navigation
```

### API Backend (apps/api/)

- Handlers in `internal/handler/` - HTTP endpoints
- Services in `internal/service/` - Business logic
- Repository in `internal/repository/` - Generated sqlc code
- Migrations in `db/migrations/` - Goose SQL migrations
- SQL queries in `db/queries/` - Source for sqlc generation
- OpenAPI spec at `api/openapi.yaml`

### Frontend Web (apps/web/)

- **Routing:** TanStack Router with file-based routing in `src/routes/`
  - Routes auto-generated via `@tanstack/router-plugin` Vite plugin
  - Type-safe navigation with `<Link to="/path" />` and `useNavigate()`
  - Route tree generated to `src/routeTree.gen.ts`
- Path alias: `@/` resolves to `src/`
- State management: Zustand (UI preferences only)
- Data fetching: TanStack React Query (via orval-generated hooks)
- URL state: nuqs for filter/view state
- UI components: shadcn/ui in `src/components/ui/`

### Frontend Mobile (apps/mobile/)

- Uses Expo Router file-based routing in `app/`
- Deferred until Phase 10 of implementation

### Code Generation Flow

1. SQL queries (`db/queries/*.sql`) → sqlc → Go repository code
2. Go handler annotations → swaggo/swag → OpenAPI 3.0 spec (`api/openapi.yaml`)
3. OpenAPI spec → Orval → TypeScript client (`packages/api-client/`)

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

## Design System

**Kanjo is a UI/UX-first application.** Every frontend change must meet the quality bar set by best-in-class finance apps like Copilot Money, Monarch Money, and Lunch Money. When in doubt, prioritize visual polish and responsiveness over feature velocity.

References (read all three before any frontend work):

- [docs/principles/ui.md](docs/principles/ui.md) — Colors, typography, component patterns
- [docs/principles/ux.md](docs/principles/ux.md) — Accessibility, AI UX patterns
- [docs/principles/ui-reference.md](docs/principles/ui-reference.md) — Design references, per-feature pattern guide, general principles

Quick reference:

- Green (`#16A34A`): income | Red (`#DC2626`): expenses | Purple (`#7C3AED`): AI | Cyan (`#0891B2`): savings
- Body: Inter | Financial numbers: JetBrains Mono (`font-mono`)
- `formatYen()`, `formatYenSigned()`, `formatYenCompact()` from `@repo/shared`

## UI/UX Standards

### Frontend Task Completion Criteria

A frontend task is NOT done until:

1. `task check` passes
2. Visually verified every affected route using the Playwright CLI (`npx @playwright/mcp@latest`) — snapshot + screenshot saved to `.screenshots/`
3. Desktop (1280x800) AND mobile (390x844) viewports look correct
4. No spacing inconsistencies, missing empty states, or broken layouts

**Treat each task with care and attention to detail.** Check every component against its spec individually. Responsiveness is critical — never skip the mobile viewport check.

### Visual Verification Workflow

1. Navigate to route with `browser_navigate`
2. `browser_snapshot` with filename — check semantic structure (saved to `.screenshots/`)
3. `browser_take_screenshot` with filename — evaluate visually (saved to `.screenshots/`)
4. `browser_take_screenshot` with `fullPage: true` — capture below-the-fold content
5. `browser_resize` to 390x844 — mobile check
6. `browser_take_screenshot` with filename — mobile screenshot (both viewport and fullPage)
7. Fix any overflow, truncation, or layout issues found on either viewport
8. Re-verify after fixes — do not assume a fix works without visual confirmation

### Design Principles

- Cards: shadow-sm hover:shadow-md base. Card tint variants for semantic coloring.
- Empty states: Always use EmptyState component.
- Financial numbers: font-mono with formatYen/formatYenSigned/formatYenCompact.
- Animations: Guard with prefers-reduced-motion. Use useAnimatedCounter for numbers.
- Charts: ChartTooltip for all tooltips. TimeRangeToggle for time filtering.
- Balance visibility: Respect balanceVisible from usePreferencesStore.

### Reusable Components (added in UI overhaul)

- `EmptyState` — apps/web/src/components/empty-state.tsx
- `ChartTooltip` — apps/web/src/components/charts/chart-tooltip.tsx
- `TimeRangeToggle` — apps/web/src/components/charts/time-range-toggle.tsx
- Card tint classes — .card-tint-income, .card-tint-expense, .card-tint-savings, .card-tint-ai
- `getCategoryEmoji()`, `getCategoryColor()` — packages/shared

### Periodic UI Review

A UI review is required after every 3 frontend tasks. `task ship` warns when a review is overdue.

To run a review: `/check-ui` or follow `docs/reviews/ui-review-prompt.md` exactly. Fill out every audit table — one pass at a time, one concern per pass. Save the completed review to `docs/reviews/review-{date}.md`. Create taskmaster tasks for findings (one per finding). Commit with `[ui-review]` prefix.

Do not skip passes. Do not combine passes. Each pass examines one concern across all routes. The review is only complete when all tables are filled and `docs/reviews/review-log.md` is updated.

Reviews are also triggered by: design system changes, milestone prep, or manual request (`/check-ui`).

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

- **Trustworthy and production-proven:** Backed by a reputable org or well-established community—avoid solo-maintainer projects that aren't battle-tested in production
- **Actively maintained:** Regular releases, responsive issue tracking, not stale or abandoned
- **Popular and widely adopted:** Strong download numbers, large user base, good ecosystem support
- **Safe to use:** No known security vulnerabilities, good security track record
- **Modern over legacy:** Prefer newer libraries over legacy alternatives—they tend to be better maintained and designed for the current ecosystem
- **Maintainable after adoption:** Clean API that produces readable, type-safe, clean code—the resulting codebase should be easy to understand and maintain

## Key Patterns

- **Result types:** Use neverthrow for error handling in shared package
- **Validation:** Use Valibot for runtime validation (TS), Pydantic for Python
- **Workspace imports:** Use `workspace:*` in package.json dependencies
- **Generated code:** Kept in git (api-client) to avoid CI tool dependencies
- **Environment:** API expects `DATABASE_URL` for PostgreSQL connection
- **ESLint configs:** Per-app (not shared) to avoid tsconfig resolution issues
- **Accessibility:** Semantic HTML, ARIA landmarks, focus management on route changes, skip links
- **Python jobs:** Use uv for package management, structlog for logging, pydantic-settings for config

## Shared Code Strategy

### 100% Shared (packages/api-client + packages/shared)

- API types and react-query hooks
- Currency/date utilities
- Valibot validators
- Constants (categories, currencies)
- Zustand stores

### NOT Shared

- Charts (web: Recharts, mobile: Victory Native)
- Navigation/routing
- Transaction list (web: TanStack Table, mobile: FlatList)
- Screen layouts

## Web Routes

| Path            | Page                                         |
| --------------- | -------------------------------------------- |
| `/`             | Dashboard                                    |
| `/transactions` | Transaction list (filterable via URL params) |
| `/cash-flow`    | Cash flow analysis                           |
| `/assets`       | Asset breakdown                              |
| `/goals`        | Savings goals                                |
| `/settings`     | App settings                                 |

## Adding a New API Endpoint

1. Add Go handler in `apps/api/internal/handler/` with swag annotations (`@ID`, `@Summary`, `@Tags`, `@Param`, `@Success`, `@Router`)
2. Add SQL query in `apps/api/db/queries/` (if needed)
3. Run `task generate:sqlc` (if SQL changed)
4. Register route in `apps/api/cmd/server/main.go`
5. Run `task generate` to regenerate OpenAPI spec and TS client
6. Import the new hook from `@repo/api-client`
