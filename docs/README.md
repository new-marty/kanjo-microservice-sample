# Kanjo Documentation

## Principles

_Why we do things the way we do._

- [Core Principles](./principles/overview.md) — Build only what's needed, single-user tool
- [Data](./principles/data.md) — Integer yen, deduplication, schema ownership, ML strategy
- [Engineering](./principles/engineering.md) — Package managers, error handling, validation, security
- [Documentation](./principles/documentation.md) — How and what we document

## Architecture

_How the system works._

- [Overview](./architecture/overview.md) — System diagram, monorepo structure, data flow
- [Data Flow](./architecture/data-flow.md) — Full pipeline from MoneyForward to API
- **Apps:**
  - [API](./architecture/apps/api/overview.md) — Go backend structure and code generation
  - [API Endpoints](../apps/api/api/openapi.yaml) — REST API reference (OpenAPI spec)
  - [Database](./architecture/apps/api/database.md) — Schema, tables, migrations
- **Jobs:**
  - [Scraper](./architecture/jobs/scraper/overview.md) — MoneyForward data ingestion
  - [Transform](./architecture/jobs/transform/overview.md) — LLM-powered categorization pipeline

## Decisions

_What we decided and why._

- [Schema Separation](./decisions/schema-separation.md) — Two schemas, integer yen, dedup, routing, light mode

## Development

_How to work on the project._

- [Getting Started](./development/getting-started.md) — Setup guide for local development
- [Contributing](./development/contributing.md) — Workflow, code generation, adding endpoints
