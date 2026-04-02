"""Read operations from mf_raw schema."""

from datetime import date
from uuid import UUID

from psycopg.rows import class_row
from psycopg_pool import ConnectionPool

from transform.models import RawTransaction


def get_untransformed_transactions(
    pool: ConnectionPool,
    limit: int | None = None,
) -> list[RawTransaction]:
    """Get transactions from mf_raw that haven't been transformed yet.

    Args:
        pool: Database connection pool
        limit: Max transactions to fetch. None = no limit.
    """
    with pool.connection() as conn:
        with conn.cursor(row_factory=class_row(RawTransaction)) as cur:
            query = """
                SELECT r.hash, r.date, r.description, r.amount, r.category,
                       r.sub_category, r.account_name, r.memo, r.is_transfer, r.is_recurring
                FROM mf_raw.transactions r
                LEFT JOIN kanjo.transactions t ON t.raw_hash = r.hash
                WHERE t.hash IS NULL
                ORDER BY r.date DESC
            """
            if limit is not None:
                query += " LIMIT %s"
                cur.execute(query, (limit,))
            else:
                cur.execute(query)
            return cur.fetchall()


def get_all_raw_transactions(pool: ConnectionPool) -> list[RawTransaction]:
    """Get all transactions from mf_raw for backfill."""
    with pool.connection() as conn:
        with conn.cursor(row_factory=class_row(RawTransaction)) as cur:
            cur.execute(
                """
                SELECT hash, date, description, amount, category, sub_category,
                       account_name, memo, is_transfer, is_recurring
                FROM mf_raw.transactions
                ORDER BY date DESC
                """
            )
            return cur.fetchall()


def get_untransformed_daily_assets(
    pool: ConnectionPool,
) -> list[tuple[UUID, date, str, str, str, int]]:
    """Get daily assets from mf_raw that haven't been transformed yet."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.id, r.date, r.institution_name, r.account_name,
                       r.asset_type, r.balance
                FROM mf_raw.daily_assets r
                LEFT JOIN kanjo.daily_assets t ON t.raw_id = r.id
                WHERE t.id IS NULL
                ORDER BY r.date DESC
                """
            )
            return cur.fetchall()
