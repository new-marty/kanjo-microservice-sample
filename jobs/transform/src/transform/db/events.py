"""PostgreSQL LISTEN/NOTIFY event handling."""

import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import psycopg
import structlog

log = structlog.get_logger()


@dataclass
class JobCompletedEvent:
    """Event emitted when a scraper job completes."""

    job_id: str
    job_type: str
    transactions_count: int
    assets_count: int


def listen_for_job_completed(
    conn_string: str,
    handler: Callable[[JobCompletedEvent], None],
) -> None:
    """Listen for mf_job_completed notifications and call handler.

    This is a blocking function that listens indefinitely.
    """
    with psycopg.connect(conn_string, autocommit=True) as conn:
        conn.execute("LISTEN mf_job_completed")
        log.info("Listening for mf_job_completed events")

        for notify in conn.notifies():
            try:
                payload: dict[str, Any] = json.loads(notify.payload) if notify.payload else {}
                event = JobCompletedEvent(
                    job_id=payload.get("job_id", ""),
                    job_type=payload.get("job_type", ""),
                    transactions_count=payload.get("transactions_count", 0),
                    assets_count=payload.get("assets_count", 0),
                )
                log.info("Received job completed event", event=event)
                handler(event)
            except json.JSONDecodeError as e:
                log.error("Failed to parse notification payload", error=str(e))
            except Exception as e:
                log.error("Error handling notification", error=str(e))
