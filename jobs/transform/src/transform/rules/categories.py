"""Rule-based category mapping from MoneyForward to Kanjo."""

from dataclasses import dataclass

from transform.models import Category


@dataclass
class CategoryMatch:
    """Result of category mapping."""

    category_id: str
    confidence: int


# Direct mapping from MoneyForward 大項目 to Kanjo category ID
MF_CATEGORY_MAP: dict[str, str] = {
    "日用品": "expense-daily",
    "水道・光熱費": "expense-utilities",
    "交通費": "expense-transport",
    "自動車": "expense-car",
    "通信費": "expense-communication",
    "健康・医療": "expense-health",
    "衣服・美容": "expense-fashion",
    "教育・教養": "expense-education",
    "特別な支出": "expense-special",
    "保険": "expense-insurance",
    "税・社会保障": "expense-tax",
    "その他": "expense-other",
    "未分類": "expense-uncategorized",
    "振替": "transfer",
}


def map_mf_category_to_kanjo(
    mf_category: str,
    mf_sub_category: str | None,
    categories: list[Category],
) -> CategoryMatch | None:
    """Map a MoneyForward category to a Kanjo category.

    Uses rules based on main category and subcategory.
    Returns None if no confident mapping is found (should use LLM).
    """
    # Handle income
    if mf_category == "収入":
        return _map_income_category(mf_sub_category)

    # Handle food categories (have subcategories)
    if mf_category == "食費":
        return _map_food_category(mf_sub_category)

    # Handle housing categories
    if mf_category == "住宅":
        return _map_housing_category(mf_sub_category)

    # Handle entertainment
    if mf_category == "趣味・娯楽":
        return _map_entertainment_category(mf_sub_category)

    # Direct mapping for simple categories
    if mf_category in MF_CATEGORY_MAP:
        # Lower confidence for uncategorized to trigger LLM
        confidence = 40 if mf_category == "未分類" else 85
        return CategoryMatch(
            category_id=MF_CATEGORY_MAP[mf_category],
            confidence=confidence,
        )

    # No confident mapping found
    return None


def _map_income_category(sub_category: str | None) -> CategoryMatch:
    """Map income subcategories."""
    if not sub_category:
        return CategoryMatch(category_id="income-other", confidence=80)

    sub_lower = sub_category.lower()

    if "給与" in sub_lower or "給料" in sub_lower:
        return CategoryMatch(category_id="income-salary", confidence=95)

    if "賞与" in sub_lower or "ボーナス" in sub_lower:
        return CategoryMatch(category_id="income-bonus", confidence=95)

    if "投資" in sub_lower or "配当" in sub_lower or "利息" in sub_lower:
        return CategoryMatch(category_id="income-investment", confidence=90)

    return CategoryMatch(category_id="income-other", confidence=80)


def _map_food_category(sub_category: str | None) -> CategoryMatch:
    """Map food subcategories."""
    if not sub_category:
        return CategoryMatch(category_id="expense-food", confidence=85)

    sub_lower = sub_category.lower()

    if "食料品" in sub_lower or "スーパー" in sub_lower or "コンビニ" in sub_lower:
        return CategoryMatch(category_id="expense-groceries", confidence=90)

    if "外食" in sub_lower or "レストラン" in sub_lower:
        return CategoryMatch(category_id="expense-restaurant", confidence=90)

    if "カフェ" in sub_lower or "喫茶" in sub_lower:
        return CategoryMatch(category_id="expense-cafe", confidence=90)

    return CategoryMatch(category_id="expense-food", confidence=85)


def _map_housing_category(sub_category: str | None) -> CategoryMatch:
    """Map housing subcategories."""
    if not sub_category:
        return CategoryMatch(category_id="expense-housing", confidence=85)

    sub_lower = sub_category.lower()

    if "家賃" in sub_lower or "賃貸" in sub_lower:
        return CategoryMatch(category_id="expense-rent", confidence=95)

    return CategoryMatch(category_id="expense-housing", confidence=85)


def _map_entertainment_category(sub_category: str | None) -> CategoryMatch:
    """Map entertainment subcategories."""
    if not sub_category:
        return CategoryMatch(category_id="expense-entertainment", confidence=85)

    sub_lower = sub_category.lower()

    if "サブスク" in sub_lower or "動画" in sub_lower or "音楽" in sub_lower:
        return CategoryMatch(category_id="expense-subscription", confidence=90)

    return CategoryMatch(category_id="expense-entertainment", confidence=85)
