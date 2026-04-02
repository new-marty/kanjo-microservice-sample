"""Write operations to kanjo schema."""

from datetime import date
from uuid import UUID

import structlog
from psycopg.rows import class_row
from psycopg_pool import ConnectionPool

from transform.models import Category, Merchant, TransformedTransaction

log = structlog.get_logger()


def get_categories(pool: ConnectionPool) -> list[Category]:
    """Get all categories from kanjo schema."""
    with pool.connection() as conn:
        with conn.cursor(row_factory=class_row(Category)) as cur:
            cur.execute(
                """
                SELECT id, mf_category, display_name, icon, color, is_income, sort_order
                FROM kanjo.categories
                ORDER BY sort_order
                """
            )
            return cur.fetchall()


def get_merchant_by_description(
    pool: ConnectionPool,
    raw_description: str,
) -> Merchant | None:
    """Look up existing merchant by raw description."""
    with pool.connection() as conn:
        with conn.cursor(row_factory=class_row(Merchant)) as cur:
            cur.execute(
                """
                SELECT id, raw_description, normalized_name, display_name, icon
                FROM kanjo.merchants
                WHERE raw_description = %s
                """,
                (raw_description,),
            )
            return cur.fetchone()


def create_merchant(
    pool: ConnectionPool,
    raw_description: str,
    normalized_name: str,
    display_name: str | None = None,
    icon: str | None = None,
) -> Merchant:
    """Create or update a merchant."""
    with pool.connection() as conn:
        with conn.cursor(row_factory=class_row(Merchant)) as cur:
            cur.execute(
                """
                INSERT INTO kanjo.merchants (raw_description, normalized_name, display_name, icon)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (raw_description) DO UPDATE SET
                    normalized_name = EXCLUDED.normalized_name,
                    display_name = COALESCE(EXCLUDED.display_name, kanjo.merchants.display_name),
                    icon = COALESCE(EXCLUDED.icon, kanjo.merchants.icon),
                    updated_at = NOW()
                RETURNING id, raw_description, normalized_name, display_name, icon
                """,
                (raw_description, normalized_name, display_name, icon),
            )
            result = cur.fetchone()
            conn.commit()
            log.debug("Created/updated merchant", merchant=result)
            return result  # type: ignore


def upsert_transformed_transaction(
    pool: ConnectionPool,
    tx: TransformedTransaction,
) -> None:
    """Insert or update a transformed transaction."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kanjo.transactions (
                    hash, raw_hash, date, amount, account_name, description,
                    merchant_id, category_id, is_transfer, is_recurring, transfer_pair_hash,
                    category_confidence, merchant_confidence, transform_version
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (hash) DO UPDATE SET
                    date = EXCLUDED.date,
                    amount = EXCLUDED.amount,
                    account_name = EXCLUDED.account_name,
                    description = EXCLUDED.description,
                    merchant_id = EXCLUDED.merchant_id,
                    category_id = EXCLUDED.category_id,
                    is_transfer = EXCLUDED.is_transfer,
                    is_recurring = EXCLUDED.is_recurring,
                    transfer_pair_hash = EXCLUDED.transfer_pair_hash,
                    category_confidence = EXCLUDED.category_confidence,
                    merchant_confidence = EXCLUDED.merchant_confidence,
                    transform_version = EXCLUDED.transform_version,
                    transformed_at = NOW(),
                    updated_at = NOW()
                """,
                (
                    tx.hash,
                    tx.raw_hash,
                    tx.date,
                    tx.amount,
                    tx.account_name,
                    tx.description,
                    tx.merchant_id,
                    tx.category_id,
                    tx.is_transfer,
                    tx.is_recurring,
                    tx.transfer_pair_hash,
                    tx.category_confidence,
                    tx.merchant_confidence,
                    tx.transform_version,
                ),
            )
            conn.commit()


def ensure_institution(pool: ConnectionPool, institution_name: str) -> None:
    """Ensure an institution exists in kanjo schema."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kanjo.institutions (institution_name)
                VALUES (%s)
                ON CONFLICT (institution_name) DO NOTHING
                """,
                (institution_name,),
            )
            conn.commit()


def upsert_daily_asset(
    pool: ConnectionPool,
    raw_id: UUID,
    asset_date: date,
    institution_name: str,
    account_name: str,
    asset_type: str,
    balance: int,
) -> None:
    """Insert or update a daily asset snapshot."""
    ensure_institution(pool, institution_name)
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kanjo.daily_assets
                    (raw_id, date, institution_name, account_name, asset_type, balance)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (date, institution_name, account_name, asset_type) DO UPDATE SET
                    balance = EXCLUDED.balance
                """,
                (raw_id, asset_date, institution_name, account_name, asset_type, balance),
            )
            conn.commit()


def create_transform_run(
    pool: ConnectionPool,
    trigger_job_run_id: UUID | None = None,
) -> UUID:
    """Create a new transform run record."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kanjo.transform_runs (trigger_job_run_id, status, started_at)
                VALUES (%s, 'running', NOW())
                RETURNING id
                """,
                (trigger_job_run_id,),
            )
            result = cur.fetchone()
            conn.commit()
            return result[0]  # type: ignore


def update_transform_run(
    pool: ConnectionPool,
    run_id: UUID,
    status: str,
    transactions_processed: int = 0,
    transactions_transformed: int = 0,
    merchants_created: int = 0,
    transfers_matched: int = 0,
    llm_calls_made: int = 0,
    error: str | None = None,
) -> None:
    """Update a transform run with final statistics."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE kanjo.transform_runs SET
                    status = %s,
                    completed_at = CASE
                        WHEN %s IN ('completed', 'failed') THEN NOW()
                        ELSE completed_at
                    END,
                    transactions_processed = %s,
                    transactions_transformed = %s,
                    merchants_created = %s,
                    transfers_matched = %s,
                    llm_calls_made = %s,
                    error = %s
                WHERE id = %s
                """,
                (
                    status,
                    status,
                    transactions_processed,
                    transactions_transformed,
                    merchants_created,
                    transfers_matched,
                    llm_calls_made,
                    error,
                    run_id,
                ),
            )
            conn.commit()


def create_transfer_pair(
    pool: ConnectionPool,
    from_hash: str,
    to_hash: str,
    confidence: int,
) -> None:
    """Create a transfer pair record."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kanjo.transfer_pairs (from_hash, to_hash, confidence)
                VALUES (%s, %s, %s)
                ON CONFLICT (from_hash, to_hash) DO UPDATE SET
                    confidence = EXCLUDED.confidence
                """,
                (from_hash, to_hash, confidence),
            )
            conn.commit()
