"""Prompt templates for LLM categorization and merchant normalization."""

from transform.models import Category


def build_categorize_prompt(
    description: str,
    amount: int,
    mf_category: str,
    mf_sub_category: str | None,
    account_name: str,
    categories: list[Category],
) -> str:
    """Build prompt for transaction categorization."""
    category_list = "\n".join(
        f"- {c.id}: {c.display_name} (MF: {c.mf_category})" for c in categories
    )

    amount_str = f"¥{abs(amount):,}"
    direction = "expense" if amount < 0 else "income"
    sub_cat = f" / {mf_sub_category}" if mf_sub_category else ""

    return f"""You are a financial transaction categorizer for a Japanese personal finance app.

Given a transaction, determine the most appropriate category from the available list.

Transaction:
- Description: {description}
- Amount: {amount_str} ({direction})
- MoneyForward Category: {mf_category}{sub_cat}
- Account: {account_name}

Available Categories:
{category_list}

Instructions:
1. Match primarily based on the MoneyForward category (mfCategory)
2. Use the description and amount for additional context
3. For ambiguous cases, prefer more specific categories over generic ones
4. Confidence should reflect certainty (0-100)

Respond with JSON in this exact format:
{{"categoryId": "the-category-id", "confidence": 85, "reasoning": "Brief explanation"}}"""


def build_merchant_prompt(
    description: str,
    amount: int,
    category: str,
) -> str:
    """Build prompt for merchant name normalization."""
    amount_str = f"¥{abs(amount):,}"

    return f"""You are a merchant name normalizer for a Japanese personal finance app.

Given a transaction description, extract and normalize the merchant/payee name.

Transaction:
- Description: {description}
- Amount: {amount_str}
- Category: {category}

Instructions:
1. Extract the merchant/store/payee name from the description
2. Normalize Japanese company names (e.g., "株式会社" → omit, "ｱﾏｿﾞﾝ" → "Amazon")
3. Remove transaction IDs, dates, branch numbers
4. Keep brand names recognizable (e.g., "セブンイレブン", "スターバックス")
5. For card payments, extract the actual merchant name
6. Confidence reflects certainty about the extraction (0-100)

Respond with JSON in this exact format:
{{
  "normalizedName": "Merchant Name",
  "displayName": "Display Name (optional)",
  "icon": "emoji (optional)",
  "confidence": 90
}}"""
