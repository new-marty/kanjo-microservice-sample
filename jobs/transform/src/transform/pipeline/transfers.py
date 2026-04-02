"""Transfer pair matching in the transform pipeline."""

from collections import defaultdict

import structlog
from psycopg_pool import ConnectionPool

from transform.db.kanjo import create_transfer_pair
from transform.models import TransformedTransaction

log = structlog.get_logger()


def match_transfer_pairs(
    pool: ConnectionPool,
    transactions: list[TransformedTransaction],
) -> int:
    """Match transfer pairs among transformed transactions.

    Transfers should have:
    - Same date
    - Opposite amounts (one negative, one positive with same absolute value)
    - Both marked as is_transfer

    Returns the number of pairs matched.
    """
    # Filter to transfers only
    transfers = [t for t in transactions if t.is_transfer]

    if len(transfers) < 2:
        return 0

    # Group by date
    by_date: dict[str, list[TransformedTransaction]] = defaultdict(list)
    for tx in transfers:
        date_key = tx.date.isoformat()
        by_date[date_key].append(tx)

    matched_count = 0

    for date_key, day_transfers in by_date.items():
        outflows = [t for t in day_transfers if t.amount < 0]
        inflows = [t for t in day_transfers if t.amount > 0]

        for outflow in outflows:
            for inflow in inflows:
                if abs(outflow.amount) == inflow.amount:
                    # Found a matching pair
                    confidence = 90

                    log.debug(
                        "Matched transfer pair",
                        from_desc=outflow.description,
                        to_desc=inflow.description,
                        amount=abs(outflow.amount),
                    )

                    create_transfer_pair(
                        pool,
                        from_hash=outflow.hash,
                        to_hash=inflow.hash,
                        confidence=confidence,
                    )
                    matched_count += 1

    return matched_count


def detect_potential_transfers(
    transactions: list[TransformedTransaction],
) -> list[TransformedTransaction]:
    """Detect transactions that might be transfers based on keywords.

    This helps identify transfers that weren't marked by MoneyForward.
    """
    transfer_keywords = ["振込", "送金", "transfer", "入金", "出金", "振替"]

    potential = []
    for tx in transactions:
        if tx.is_transfer:
            potential.append(tx)
            continue

        desc_lower = tx.description.lower()
        if any(kw in desc_lower for kw in transfer_keywords):
            potential.append(tx)

    return potential
