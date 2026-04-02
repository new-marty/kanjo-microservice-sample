# Architecture

## System Overview

Kanjo is a standalone backend microservice for personal finance data. It provides a REST API backed by PostgreSQL, with data ingested from MoneyForward ME via a scraper and enriched by an LLM-powered transform pipeline.

```
                           HTTP/REST
                              │
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
                │  │   mf_raw schema  │◄─┼──── Scraper (TS/Playwright)
                │  │   (read-only)    │  │
                │  └──────────────────┘  │
                │  ┌──────────────────┐  │
                │  │   kanjo schema   │◄─┼──── Transform (Python/LLM)
                │  │   (read-write)   │  │
                │  └──────────────────┘  │
                └────────────────────────┘
```

## Repository Structure

```
kanjo/
├── apps/
│   └── api/                 # Go backend
│       ├── api/             # OpenAPI spec
│       ├── cmd/             # Entry points
│       ├── config/          # Configuration
│       ├── db/              # Migrations & queries
│       └── internal/        # Application code
│           ├── handler/     # HTTP handlers
│           ├── middleware/   # HTTP middleware
│           ├── model/       # Domain models
│           ├── repository/  # Generated sqlc code
│           └── service/     # Business logic
│
├── jobs/
│   ├── scraper/             # TS Playwright scraper
│   ├── transform/           # Python LLM categorization
│   └── shared/              # Shared job utilities
│
└── docs/                    # Documentation
```

## Data Flow

### 1. Data Ingestion (Scraper)

The TypeScript scraper handles:

- Authentication with MoneyForward ME
- CSV export and parsing
- Deduplication by transaction hash
- Writing to `mf_raw` schema tables

### 2. Transform Pipeline

The Python transform job:

- Listens for new scraper data (NOTIFY/LISTEN)
- Categorizes transactions using LLM (OpenRouter)
- Writes enriched data to `kanjo` schema

### 3. API Layer

The Go API provides:

- RESTful endpoints for all data
- Analytics aggregation
- User-specific enrichments (budgets, goals, metadata)
- OpenAPI specification

## Code Generation Pipeline

```
┌─────────────────┐     ┌─────────────────┐
│  SQL Queries    │     │   Go Handlers   │
│  (db/queries/)  │     │   (handler/)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
    ┌─────────┐            ┌───────────┐
    │  sqlc   │            │ openapi-  │
    │         │            │   gen     │
    └────┬────┘            └─────┬─────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Go Repository  │     │  openapi.yaml   │
│  Code           │     │                 │
└─────────────────┘     └─────────────────┘
```

## Key Design Decisions

See [decisions/schema-separation.md](../decisions/schema-separation.md) for the full rationale behind schema separation, integer yen, and transaction deduplication.

## Security

See [principles/engineering.md](../principles/engineering.md#security) for security guidelines.
