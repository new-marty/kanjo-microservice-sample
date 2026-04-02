"""Load app settings from the kanjo.app_settings table."""

import psycopg


def load_settings_from_db(database_url: str) -> dict[str, str]:
    """Query kanjo.app_settings and return non-empty values as a dict."""
    settings: dict[str, str] = {}
    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT key, value FROM kanjo.app_settings WHERE value != ''"
                )
                for row in cur.fetchall():
                    settings[row[0]] = row[1]
    except Exception:
        pass
    return settings
