# Data Principles

## Integer Yen

All financial amounts are **integer yen**. No floating point, no decimals. `1234` means ¥1,234.

```sql
amount INTEGER NOT NULL  -- correct
amount DECIMAL(10,2)     -- never do this
```

## Transaction Deduplication

Transactions are uniquely identified by SHA-256 hash of `date|amount|account_name|description`. This prevents duplicate imports when re-scraping.

## Schema Ownership

Two PostgreSQL schemas enforce clear data boundaries:

- **`mf_raw`** — Owned by the scraper. The API and transform job read but never write.
- **`kanjo`** — Owned by the app. Written by the transform job, read by the API.

This prevents conflicts and allows each component to evolve independently. See [architecture/data-flow.md](../architecture/data-flow.md) for details.

## Category Mapping

Category uses MoneyForward's 大項目 (main category). `sub_category` stores 中項目 (subcategory).

## ML/LLM Categorization Strategy

```
Phase 1 (Now):   Rules (high confidence) + LLM (fallback) → User reviews
Phase 2 (Later): Train lightweight model on accumulated user corrections
Phase 3 (Future): Custom model replaces LLM (faster, cheaper)
```

LLM solves the cold-start problem (no training data). User corrections become training data over time, reducing LLM dependency and cost.
