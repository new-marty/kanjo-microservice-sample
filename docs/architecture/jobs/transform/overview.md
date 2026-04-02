# Transform Job

The transform job is a Python service that processes raw transactions from `mf_raw` and writes normalized, categorized data to the `kanjo` schema.

## Processing Flow

1. **Trigger:** LISTEN for `mf_job_completed` event or manual CLI invocation
2. **Fetch:** Get untransformed transactions (those in `mf_raw` but not in `kanjo`)
3. **Transform each transaction:**
   - Resolve merchant (cache → rules → LLM)
   - Resolve category (rules → LLM)
   - Record confidence scores
4. **Post-processing:** Match transfer pairs
5. **Persist:** Upsert to `kanjo.transactions`

## Merchant Resolution

Order of resolution:

1. **Cache:** Check if merchant already exists for this description
2. **Rules:** Apply pattern matching (regex-based)
3. **LLM:** Call LLM for normalization (if enabled)
4. **Fallback:** Use raw description as-is

## Category Resolution

Order of resolution:

1. **Direct mapping:** Map MoneyForward 大項目 to Kanjo category
2. **Subcategory rules:** Use 中項目 for finer classification
3. **LLM:** Call LLM for ambiguous cases (if enabled)
4. **Fallback:** Mark as uncategorized

## LLM Configuration

Uses [OpenRouter](https://openrouter.ai) for LLM access. See [data-flow.md](../../data-flow.md) for model options and configuration.

## Commands

```bash
task transform:run      # Run transform pipeline once
task transform:backfill # Backfill all historical transactions
task transform:listen   # Listen for scraper events and transform
```

All commands use `uv run` internally. See [data principles](../../../principles/data.md) for the ML/LLM phasing strategy.
