"""Category resolution in the transform pipeline."""

from dataclasses import dataclass

import structlog
from psycopg_pool import ConnectionPool

from transform.llm.provider import LLMProvider
from transform.models import Category, RawTransaction
from transform.rules.categories import map_mf_category_to_kanjo

log = structlog.get_logger()


@dataclass
class CategoryResult:
    """Result of category resolution."""

    category_id: str
    confidence: int
    llm_called: bool


def resolve_category(
    pool: ConnectionPool,
    tx: RawTransaction,
    categories: list[Category],
    llm: LLMProvider | None,
) -> CategoryResult:
    """Resolve category for a transaction.

    Order of resolution:
    1. Apply rules (high confidence mappings)
    2. Call LLM (if available and rules aren't confident)
    3. Fall back to uncategorized
    """
    # 1. Try rule-based mapping
    rule_result = map_mf_category_to_kanjo(
        mf_category=tx.category,
        mf_sub_category=tx.sub_category,
        categories=categories,
    )

    if rule_result and rule_result.confidence >= 85:
        log.debug(
            "Category resolved by rule (high confidence)",
            description=tx.description,
            mf_category=tx.category,
            category_id=rule_result.category_id,
            confidence=rule_result.confidence,
        )
        return CategoryResult(
            category_id=rule_result.category_id,
            confidence=rule_result.confidence,
            llm_called=False,
        )

    # 2. Try LLM if available
    if llm:
        try:
            llm_result = llm.categorize(
                description=tx.description,
                amount=tx.amount,
                mf_category=tx.category,
                mf_sub_category=tx.sub_category,
                account_name=tx.account_name,
                categories=categories,
            )

            # Validate that the returned category exists
            valid_ids = {c.id for c in categories}
            if llm_result.category_id in valid_ids:
                log.debug(
                    "Category resolved by LLM",
                    description=tx.description,
                    mf_category=tx.category,
                    category_id=llm_result.category_id,
                    confidence=llm_result.confidence,
                )
                return CategoryResult(
                    category_id=llm_result.category_id,
                    confidence=llm_result.confidence,
                    llm_called=True,
                )
            else:
                log.warning(
                    "LLM returned invalid category",
                    category_id=llm_result.category_id,
                )
        except Exception as e:
            log.warning(
                "LLM categorization failed",
                description=tx.description,
                error=str(e),
            )

    # 3. Use rule result if available, even with lower confidence
    if rule_result:
        return CategoryResult(
            category_id=rule_result.category_id,
            confidence=rule_result.confidence,
            llm_called=llm is not None,
        )

    # 4. Fall back to uncategorized
    return CategoryResult(
        category_id="expense-uncategorized",
        confidence=50,
        llm_called=llm is not None,
    )
