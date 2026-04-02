# Schema Separation and Core Data Decisions

## Two PostgreSQL Schemas

**Decision:** Use two schemas — `mf_raw` (scraper-owned) and `kanjo` (app-owned).

**Why:** The scraper and the app have different lifecycles and concerns. The scraper writes raw MoneyForward data; the app writes transformed, enriched data. Separate schemas prevent accidental cross-writes and let each component evolve independently.

**What it means:** Never write to `mf_raw` from the API or transform job (except transform reads). Never write to `kanjo` from the scraper. Communication between them goes through PostgreSQL LISTEN/NOTIFY.

## Integer Yen

**Decision:** All financial amounts are stored as integer yen. No floating point.

**Why:** Japanese yen has no subunit (no cents). Floating point introduces precision bugs that are unacceptable for financial data. Integer math is exact.

**What it means:** `amount INTEGER NOT NULL` everywhere. `1234` means ¥1,234. Use `formatYen()` from `@repo/shared` for display.

## Transaction Deduplication by Hash

**Decision:** Transactions are uniquely identified by SHA-256 hash of `date|amount|account_name|description`.

**Why:** MoneyForward exports don't have stable IDs. Re-scraping the same date range would create duplicates without this.

**What it means:** The hash is the primary key. Same transaction scraped twice produces the same hash, so upserts naturally deduplicate.

## File-Based Routing

**Decision:** Use TanStack Router file-based routing for the web app.

**Why:** Type-safe navigation, automatic code splitting, and co-located route definitions. Reduces boilerplate and catches routing errors at build time.

## Light Mode Only

**Decision:** No dark mode in initial release.

**Why:** Reduces UI surface area significantly. Every color, chart, and component would need dark variants. Can be added later if needed.
