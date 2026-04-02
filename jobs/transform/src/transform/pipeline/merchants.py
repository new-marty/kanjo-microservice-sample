"""Merchant resolution in the transform pipeline."""

from dataclasses import dataclass

import structlog
from psycopg_pool import ConnectionPool

from transform.db.kanjo import create_merchant, get_merchant_by_description
from transform.llm.provider import LLMProvider
from transform.models import Merchant, RawTransaction
from transform.rules.merchants import match_merchant_by_rules

log = structlog.get_logger()


@dataclass
class MerchantResult:
    """Result of merchant resolution."""

    merchant: Merchant | None
    llm_called: bool
    is_new: bool


def resolve_merchant(
    pool: ConnectionPool,
    tx: RawTransaction,
    llm: LLMProvider | None,
) -> MerchantResult:
    """Resolve merchant for a transaction.

    Order of resolution:
    1. Check cache (existing merchant in DB)
    2. Apply rules
    3. Call LLM (if available)
    4. Fall back to raw description
    """
    # 1. Check if merchant already exists
    existing = get_merchant_by_description(pool, tx.description)
    if existing:
        return MerchantResult(merchant=existing, llm_called=False, is_new=False)

    # 2. Try rule-based matching
    rule_result = match_merchant_by_rules(tx.description)
    if rule_result:
        log.debug(
            "Merchant matched by rule",
            description=tx.description,
            normalized=rule_result.normalized_name,
        )
        merchant = create_merchant(
            pool,
            raw_description=tx.description,
            normalized_name=rule_result.normalized_name,
            display_name=rule_result.display_name,
            icon=rule_result.icon,
        )
        return MerchantResult(merchant=merchant, llm_called=False, is_new=True)

    # 3. Try LLM if available
    if llm:
        try:
            llm_result = llm.normalize_merchant(
                description=tx.description,
                amount=tx.amount,
                category=tx.category,
            )
            log.debug(
                "Merchant normalized by LLM",
                description=tx.description,
                normalized=llm_result.normalized_name,
            )
            merchant = create_merchant(
                pool,
                raw_description=tx.description,
                normalized_name=llm_result.normalized_name,
                display_name=llm_result.display_name,
                icon=llm_result.icon,
            )
            return MerchantResult(merchant=merchant, llm_called=True, is_new=True)
        except Exception as e:
            log.warning(
                "LLM merchant normalization failed",
                description=tx.description,
                error=str(e),
            )

    # 4. Fall back to raw description
    merchant = create_merchant(
        pool,
        raw_description=tx.description,
        normalized_name=tx.description,
    )
    return MerchantResult(merchant=merchant, llm_called=llm is not None, is_new=True)
