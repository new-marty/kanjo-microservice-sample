"""Database connection pool management."""

from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def init_pool(database_url: str) -> ConnectionPool:
    """Initialize the connection pool."""
    global _pool
    _pool = ConnectionPool(database_url, min_size=1, max_size=10)
    return _pool


def get_pool() -> ConnectionPool:
    """Get the connection pool."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_pool first.")
    return _pool


def close_pool() -> None:
    """Close the connection pool."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
