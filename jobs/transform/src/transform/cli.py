"""CLI entry point for the transform pipeline."""

import argparse
import sys
from pathlib import Path
from uuid import UUID

import structlog
from dotenv import load_dotenv

from transform.config import Config
from transform.db.connection import close_pool, init_pool
from transform.db.events import JobCompletedEvent, listen_for_job_completed
from transform.pipeline.orchestrator import run_transform_pipeline
from transform.settings_db import load_settings_from_db


def configure_logging(level: str) -> None:
    """Configure structlog for the application."""
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def cmd_run(config: Config) -> int:
    """Run transform pipeline once."""
    log = structlog.get_logger()
    log.info("Running transform pipeline")

    pool = init_pool(config.database_url)
    try:
        stats = run_transform_pipeline(pool, config)
        log.info(
            "Transform completed",
            processed=stats.transactions_processed,
            transformed=stats.transactions_transformed,
            merchants_created=stats.merchants_created,
            llm_calls=stats.llm_calls_made,
        )
        return 0
    except Exception as e:
        log.error("Transform failed", error=str(e))
        return 1
    finally:
        close_pool()


def cmd_backfill(config: Config) -> int:
    """Backfill all historical transactions."""
    log = structlog.get_logger()
    log.info("Running backfill transform")

    pool = init_pool(config.database_url)
    try:
        stats = run_transform_pipeline(pool, config, backfill=True)
        log.info(
            "Backfill completed",
            processed=stats.transactions_processed,
            transformed=stats.transactions_transformed,
            merchants_created=stats.merchants_created,
            llm_calls=stats.llm_calls_made,
        )
        return 0
    except Exception as e:
        log.error("Backfill failed", error=str(e))
        return 1
    finally:
        close_pool()


def cmd_listen(config: Config) -> int:
    """Listen for scraper job completions and run transform."""
    log = structlog.get_logger()
    log.info("Starting transform listener")

    pool = init_pool(config.database_url)

    def handle_job_completed(event: JobCompletedEvent) -> None:
        log.info(
            "Processing job completion",
            job_id=event.job_id,
            job_type=event.job_type,
            transactions=event.transactions_count,
        )
        try:
            trigger_id = UUID(event.job_id) if event.job_id else None
            stats = run_transform_pipeline(pool, config, trigger_job_run_id=trigger_id)
            log.info(
                "Transform completed",
                processed=stats.transactions_processed,
                transformed=stats.transactions_transformed,
            )
        except Exception as e:
            log.error("Transform failed for job", job_id=event.job_id, error=str(e))

    try:
        listen_for_job_completed(config.database_url, handle_job_completed)
        return 0
    except KeyboardInterrupt:
        log.info("Listener stopped")
        return 0
    except Exception as e:
        log.error("Listener failed", error=str(e))
        return 1
    finally:
        close_pool()


def main() -> None:
    """Main entry point."""
    load_dotenv(Path(__file__).resolve().parents[4] / ".env")

    parser = argparse.ArgumentParser(description="Kanjo Transform Pipeline")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("run", help="Run transform once")
    subparsers.add_parser("backfill", help="Backfill all transactions")
    subparsers.add_parser("listen", help="Listen for scraper events")

    args = parser.parse_args()

    try:
        config = Config()  # type: ignore  # pydantic-settings loads from env
    except Exception as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        sys.exit(1)

    # Overlay DB settings (openrouter_api_key, llm_model) if available
    db_settings = load_settings_from_db(config.database_url)
    if "openrouter_api_key" in db_settings:
        config.openrouter_api_key = db_settings["openrouter_api_key"]
    if "llm_model" in db_settings:
        config.llm_model = db_settings["llm_model"]

    configure_logging(config.log_level)

    if args.command == "run":
        sys.exit(cmd_run(config))
    elif args.command == "backfill":
        sys.exit(cmd_backfill(config))
    elif args.command == "listen":
        sys.exit(cmd_listen(config))


if __name__ == "__main__":
    main()
