"""Transform pipeline orchestrator."""

import hashlib
from uuid import UUID

import structlog
from psycopg_pool import ConnectionPool

from transform.config import Config
from transform.db.kanjo import (
    create_transform_run,
    get_categories,
    update_transform_run,
    upsert_transformed_transaction,
)
from transform.db.raw import get_all_raw_transactions, get_untransformed_transactions
from transform.llm.provider import LLMProvider
from transform.models import Category, RawTransaction, TransformedTransaction, TransformStats
from transform.pipeline.categories import resolve_category
from transform.pipeline.merchants import resolve_merchant
from transform.pipeline.insights import generate_insights
from transform.pipeline.transfers import match_transfer_pairs

log = structlog.get_logger()


def run_transform_pipeline(
    pool: ConnectionPool,
    config: Config,
    trigger_job_run_id: UUID | None = None,
    backfill: bool = False,
) -> TransformStats:
    """Run the transform pipeline.

    Args:
        pool: Database connection pool
        config: Pipeline configuration
        trigger_job_run_id: Optional ID of the scraper job that triggered this run
        backfill: If True, process all transactions; if False, only untransformed ones

    Returns:
        Statistics about the transform run
    """
    # Create transform run record
    run_id = create_transform_run(pool, trigger_job_run_id)
    log.info("Starting transform run", run_id=str(run_id), backfill=backfill)

    stats = TransformStats()

    try:
        # Initialize LLM provider if configured
        llm: LLMProvider | None = None
        if config.openrouter_api_key:
            llm = LLMProvider(config.openrouter_api_key, config.llm_model)
            log.info("LLM provider initialized", model=config.llm_model)
        else:
            log.warning("LLM provider not configured, running rules-only")

        # Get categories for mapping
        categories = get_categories(pool)
        if not categories:
            raise RuntimeError("No categories found in database. Run migrations first.")

        # Get transactions to process
        if backfill:
            raw_transactions = get_all_raw_transactions(pool)
        else:
            raw_transactions = get_untransformed_transactions(pool, limit=config.batch_size)

        stats.transactions_processed = len(raw_transactions)
        log.info("Fetched transactions to process", count=stats.transactions_processed)

        if not raw_transactions:
            log.info("No transactions to process")
            update_transform_run(pool, run_id, "completed", **stats.__dict__)
            return stats

        # Process transactions in batches
        transformed: list[TransformedTransaction] = []

        for i, raw_tx in enumerate(raw_transactions):
            try:
                tx_result = _transform_transaction(
                    pool=pool,
                    raw_tx=raw_tx,
                    categories=categories,
                    llm=llm,
                    stats=stats,
                    max_llm_calls=config.max_llm_calls_per_run,
                )
                transformed.append(tx_result)
                stats.transactions_transformed += 1

                if (i + 1) % 50 == 0:
                    log.info("Transform progress", processed=i + 1, total=len(raw_transactions))

            except Exception as e:
                log.error(
                    "Failed to transform transaction",
                    hash=raw_tx.hash,
                    error=str(e),
                )

        # Match transfer pairs
        if transformed:
            stats.transfers_matched = match_transfer_pairs(pool, transformed)
            log.info("Matched transfer pairs", count=stats.transfers_matched)

        # Generate insights
        insights_created = generate_insights(pool, str(run_id), llm=llm)
        log.info("Generated insights", count=insights_created)

        # Update run status
        update_transform_run(pool, run_id, "completed", **stats.__dict__)
        log.info("Transform run completed", stats=stats)

    except Exception as e:
        log.error("Transform run failed", error=str(e))
        update_transform_run(pool, run_id, "failed", error=str(e), **stats.__dict__)
        raise

    return stats


def _transform_transaction(
    pool: ConnectionPool,
    raw_tx: RawTransaction,
    categories: list[Category],
    llm: LLMProvider | None,
    stats: TransformStats,
    max_llm_calls: int | None,
) -> TransformedTransaction:
    """Transform a single transaction."""
    # Resolve merchant
    should_use_llm = llm is not None and (
        max_llm_calls is None or stats.llm_calls_made < max_llm_calls
    )
    merchant_result = resolve_merchant(
        pool,
        raw_tx,
        llm if should_use_llm else None,
    )
    if merchant_result.llm_called:
        stats.llm_calls_made += 1
    if merchant_result.is_new:
        stats.merchants_created += 1

    # Resolve category
    should_use_llm = llm is not None and (
        max_llm_calls is None or stats.llm_calls_made < max_llm_calls
    )
    category_result = resolve_category(
        pool,
        raw_tx,
        categories,
        llm if should_use_llm else None,
    )
    if category_result.llm_called:
        stats.llm_calls_made += 1

    # Create transformed transaction
    transformed = TransformedTransaction(
        hash=_generate_hash(raw_tx),
        raw_hash=raw_tx.hash,
        date=raw_tx.date,
        amount=raw_tx.amount,
        account_name=raw_tx.account_name,
        description=raw_tx.description,
        merchant_id=merchant_result.merchant.id if merchant_result.merchant else None,
        category_id=category_result.category_id,
        is_transfer=raw_tx.is_transfer,
        is_recurring=raw_tx.is_recurring,
        category_confidence=category_result.confidence,
        merchant_confidence=None,  # Merchant model doesn't track confidence
    )

    # Save to database
    upsert_transformed_transaction(pool, transformed)

    return transformed


def _generate_hash(tx: RawTransaction) -> str:
    """Generate a unique hash for a transformed transaction.

    Uses the raw hash plus a version prefix to allow re-transformation.
    """
    content = f"v1:{tx.hash}"
    return hashlib.sha256(content.encode()).hexdigest()[:32]
