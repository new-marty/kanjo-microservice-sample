# Architecture

## System Overview

Kanjo is built as a monorepo containing multiple applications and shared packages. The system integrates with an external data scraper (mf-fetch) that populates transaction and asset data from MoneyForward ME.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Devices                              │
│  ┌─────────────┐                          ┌─────────────┐       │
│  │   Web App   │                          │ Mobile App  │       │
│  │  (React)    │                          │   (Expo)    │       │
│  └──────┬──────┘                          └──────┬──────┘       │
└─────────┼────────────────────────────────────────┼──────────────┘
          │                                        │
          └────────────────┬───────────────────────┘
                           │ HTTP/REST
                           ▼
              ┌────────────────────────┐
              │      Go API Server     │
              │    (Gin Framework)     │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │     PostgreSQL 17      │
              │                        │
              │  ┌──────────────────┐  │
              │  │ mf-fetch tables  │◄─┼──── mf-fetch scraper
              │  │ (read-only)      │  │     (external)
              │  └──────────────────┘  │
              │  ┌──────────────────┐  │
              │  │ kanjo tables     │  │
              │  │ (read-write)     │  │
              │  └──────────────────┘  │
              └────────────────────────┘
```

## Monorepo Structure

```
kanjo/
├── apps/
│   ├── api/                 # Go backend
│   │   ├── api/             # OpenAPI spec
│   │   ├── cmd/             # Entry points
│   │   ├── config/          # Configuration
│   │   ├── db/              # Migrations & queries
│   │   └── internal/        # Application code
│   │       ├── handler/     # HTTP handlers
│   │       ├── middleware/  # HTTP middleware
│   │       ├── model/       # Domain models
│   │       ├── repository/  # Generated sqlc code
│   │       └── service/     # Business logic
│   │
│   ├── web/                 # React SPA
│   │   └── src/
│   │       ├── components/  # UI components
│   │       ├── hooks/       # Custom hooks
│   │       ├── mocks/       # Mock data
│   │       ├── routes/      # TanStack Router pages
│   │       └── stores/      # Zustand stores
│   │
│   └── mobile/              # Expo app (deferred)
│
├── packages/
│   ├── api-client/          # Generated TypeScript client
│   ├── shared/              # Shared utilities
│   └── ui/                  # Shared UI components
│
├── tooling/
│   ├── prettier/            # Prettier config
│   └── typescript/          # TypeScript configs
│
└── jobs/
    └── scraper/             # Placeholder for future scraper
```

## Data Flow

### 1. Data Ingestion (External)

The mf-fetch scraper (separate service) handles:

- Authentication with MoneyForward ME
- CSV export and parsing
- Deduplication by transaction hash
- Writing to `transactions` and `daily_assets` tables

### 2. API Layer

The Go API provides:

- RESTful endpoints for all data
- Analytics aggregation
- User-specific enrichments (budgets, goals, metadata)
- OpenAPI specification for client generation

### 3. Frontend Layer

The React web app:

- Fetches data via generated React Query hooks
- Manages UI state with Zustand
- Uses URL state (nuqs) for filters
- Renders with shadcn/ui components

## Code Generation Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SQL Queries    │     │   Go Handlers   │     │   TypeScript    │
│  (db/queries/)  │     │   (handler/)    │     │   Client        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
    ┌─────────┐            ┌───────────┐           ┌─────────┐
    │  sqlc   │            │ openapi-  │           │  orval  │
    │         │            │   gen     │           │         │
    └────┬────┘            └─────┬─────┘           └────┬────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Go Repository  │     │  openapi.yaml   │────▶│  React Query    │
│  Code           │     │                 │     │  Hooks          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Key Design Decisions

See [decisions/schema-separation.md](../decisions/schema-separation.md) for the full rationale behind schema separation, integer yen, transaction deduplication, file-based routing, and light mode only.

## Security

See [principles/engineering.md](../principles/engineering.md#security) for security guidelines.
