"""Rule-based and LLM-powered insight generators.

Each generator queries kanjo.* tables and inserts insights with dedup_keys
to prevent duplicates across runs.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import structlog
from psycopg_pool import ConnectionPool

from transform.llm.provider import LLMProvider, _extract_json

log = structlog.get_logger()


def generate_insights(
    pool: ConnectionPool, run_id: str, llm: LLMProvider | None = None
) -> int:
    """Run all insight generators. Returns total insights created."""
    rule_generators = [
        _generate_category_overspend,
        _generate_savings_rate_change,
        _generate_large_transactions,
        _generate_recurring_total,
        _generate_spending_decrease,
    ]

    total = 0
    for gen in rule_generators:
        try:
            count = gen(pool)
            total += count
        except Exception:
            log.exception("Insight generator failed", generator=gen.__name__)

    llm_generators = [
        _generate_spending_patterns_llm,
        _generate_merchant_anomalies_llm,
        _generate_financial_health_llm,
    ]

    for gen in llm_generators:
        try:
            count = gen(pool, llm)
            total += count
        except Exception:
            log.exception("Insight generator failed", generator=gen.__name__)

    log.info("Insight generation complete", total_created=total, run_id=run_id)
    return total


def _insert_insight(
    pool: ConnectionPool,
    *,
    type: str,
    title: str,
    description: str,
    dedup_key: str,
    action_url: str | None = None,
    expires_days: int = 30,
) -> bool:
    """Insert an insight with dedup. Returns True if inserted (not duplicate)."""
    expires_at = date.today() + timedelta(days=expires_days)
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kanjo.insights
                    (type, title, description, action_url, expires_at, dedup_key)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
                RETURNING id
                """,
                (type, title, description, action_url, expires_at, dedup_key),
            )
            result = cur.fetchone()
            conn.commit()
            return result is not None


def _current_month() -> str:
    return date.today().strftime("%Y-%m")


def _generate_category_overspend(pool: ConnectionPool) -> int:
    """Detect categories where spending exceeds budget."""
    month = _current_month()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    bc.category_name,
                    bc.monthly_budget,
                    COALESCE(bp.spent, 0) AS spent
                FROM kanjo.budget_categories bc
                LEFT JOIN kanjo.budget_periods bp
                    ON bp.category_name = bc.category_name
                    AND bp.period = date_trunc('month', CURRENT_DATE)::date
                WHERE bc.monthly_budget > 0
                    AND COALESCE(bp.spent, 0) > bc.monthly_budget
                """
            )
            rows = cur.fetchall()

    count = 0
    for category_name, budget, spent in rows:
        pct = round((spent / budget - 1) * 100)
        inserted = _insert_insight(
            pool,
            type="alert",
            title=f"{category_name}: over budget",
            description=f"You've spent {pct}% more than your {category_name} budget this month.",
            dedup_key=f"overspend:{category_name}:{month}",
            action_url="/cash-flow",
        )
        if inserted:
            count += 1

    return count


def _generate_savings_rate_change(pool: ConnectionPool) -> int:
    """Compare this month's savings rate vs last month."""
    month = _current_month()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH monthly AS (
                    SELECT
                        date_trunc('month', date)::date AS month,
                        COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) AS income,
                        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) END), 0) AS expenses
                    FROM kanjo.transactions
                    WHERE is_transfer = FALSE
                        AND date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                    GROUP BY 1
                )
                SELECT month, income, expenses
                FROM monthly
                ORDER BY month
                """
            )
            rows = cur.fetchall()

    if len(rows) < 2:
        return 0

    prev_month, prev_income, prev_expenses = rows[0]
    curr_month, curr_income, curr_expenses = rows[1]

    prev_rate = ((prev_income - prev_expenses) / prev_income * 100) if prev_income > 0 else 0
    curr_rate = ((curr_income - curr_expenses) / curr_income * 100) if curr_income > 0 else 0
    diff = curr_rate - prev_rate

    if abs(diff) < 3:
        return 0

    if diff > 0:
        inserted = _insert_insight(
            pool,
            type="positive",
            title="Savings rate improved",
            description=(
                f"Your savings rate is {curr_rate:.0f}%,"
                f" up from {prev_rate:.0f}% last month."
            ),
            dedup_key=f"savings-rate:{month}",
        )
    else:
        inserted = _insert_insight(
            pool,
            type="alert",
            title="Savings rate declined",
            description=(
                f"Your savings rate dropped to {curr_rate:.0f}%"
                f" from {prev_rate:.0f}% last month."
            ),
            dedup_key=f"savings-rate:{month}",
        )

    return 1 if inserted else 0


def _generate_large_transactions(pool: ConnectionPool) -> int:
    """Flag transactions that are >2x the category average."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH category_avg AS (
                    SELECT
                        category_id,
                        AVG(ABS(amount)) AS avg_amount
                    FROM kanjo.transactions
                    WHERE is_transfer = FALSE
                        AND date >= CURRENT_DATE - INTERVAL '90 days'
                    GROUP BY category_id
                    HAVING COUNT(*) >= 5
                )
                SELECT
                    t.hash,
                    t.description,
                    ABS(t.amount) AS abs_amount,
                    ca.avg_amount,
                    c.display_name AS category_name
                FROM kanjo.transactions t
                JOIN category_avg ca ON t.category_id = ca.category_id
                JOIN kanjo.categories c ON t.category_id = c.id
                WHERE t.is_transfer = FALSE
                    AND t.date >= date_trunc('month', CURRENT_DATE)::date
                    AND ABS(t.amount) > ca.avg_amount * 2
                    AND ca.avg_amount > 1000
                ORDER BY ABS(t.amount) DESC
                LIMIT 5
                """
            )
            rows = cur.fetchall()

    count = 0
    for tx_hash, description, abs_amount, avg_amount, category_name in rows:
        multiple = abs_amount / avg_amount
        inserted = _insert_insight(
            pool,
            type="anomaly",
            title=f"Unusual {category_name} transaction",
            description=f'"{description}" is {multiple:.1f}x your average for {category_name}.',
            dedup_key=f"large-txn:{tx_hash}",
            action_url="/transactions",
        )
        if inserted:
            count += 1

    return count


def _generate_recurring_total(pool: ConnectionPool) -> int:
    """Surface total recurring expenses for the month."""
    month = _current_month()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) AS num_recurring,
                    SUM(ABS(amount)) AS total
                FROM kanjo.transactions
                WHERE is_recurring = TRUE
                    AND is_transfer = FALSE
                    AND amount < 0
                    AND date >= date_trunc('month', CURRENT_DATE)::date
                    AND date < date_trunc('month', CURRENT_DATE)::date + INTERVAL '1 month'
                """
            )
            row = cur.fetchone()

    if not row or not row[0] or row[0] == 0:
        return 0

    num_recurring, total = row
    inserted = _insert_insight(
        pool,
        type="optimize",
        title=f"{num_recurring} recurring expenses",
        description=f"Your recurring expenses total \u00a5{total:,.0f} this month.",
        dedup_key=f"recurring-total:{month}",
        action_url="/transactions",
    )
    return 1 if inserted else 0


def _current_week() -> str:
    return date.today().strftime("%Y-W%W")


def _llm_complete(llm: LLMProvider, prompt: str) -> dict[str, Any]:
    """Call LLM and extract JSON response."""
    response = llm.client.chat.completions.create(
        model=llm.model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=400,
    )
    content = response.choices[0].message.content
    if not content:
        return {}
    return _extract_json(content)


def _generate_spending_decrease(pool: ConnectionPool) -> int:
    """Celebrate categories where spending dropped >20% vs last month."""
    month = _current_month()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH monthly_spending AS (
                    SELECT
                        category_id,
                        date_trunc('month', date)::date AS month,
                        SUM(ABS(amount)) AS total
                    FROM kanjo.transactions
                    WHERE is_transfer = FALSE
                        AND amount < 0
                        AND date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                    GROUP BY category_id, date_trunc('month', date)::date
                )
                SELECT
                    c.display_name,
                    prev.total AS prev_total,
                    curr.total AS curr_total
                FROM monthly_spending curr
                JOIN monthly_spending prev
                    ON curr.category_id = prev.category_id
                    AND prev.month = date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month'
                JOIN kanjo.categories c ON curr.category_id = c.id
                WHERE curr.month = date_trunc('month', CURRENT_DATE)::date
                    AND prev.total > 5000
                    AND curr.total < prev.total * 0.8
                ORDER BY (prev.total - curr.total) DESC
                LIMIT 3
                """
            )
            rows = cur.fetchall()

    count = 0
    for category_name, prev_total, curr_total in rows:
        pct = round((1 - curr_total / prev_total) * 100)
        inserted = _insert_insight(
            pool,
            type="positive",
            title=f"{category_name} spending down",
            description=f"You're spending {pct}% less on {category_name} compared to last month.",
            dedup_key=f"spending-decrease:{category_name}:{month}",
            action_url="/cash-flow",
        )
        if inserted:
            count += 1

    return count


# --- LLM-powered generators ---


def _generate_spending_patterns_llm(
    pool: ConnectionPool, llm: LLMProvider | None
) -> int:
    """Use LLM to identify spending optimization opportunities."""
    if llm is None:
        return 0

    month = _current_month()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH monthly AS (
                    SELECT
                        c.display_name AS category,
                        date_trunc('month', t.date)::date AS month,
                        SUM(ABS(t.amount)) AS total
                    FROM kanjo.transactions t
                    JOIN kanjo.categories c ON t.category_id = c.id
                    WHERE t.is_transfer = FALSE
                        AND t.amount < 0
                        AND t.date >= date_trunc('month', CURRENT_DATE) - INTERVAL '3 months'
                    GROUP BY c.display_name, date_trunc('month', t.date)::date
                )
                SELECT
                    category,
                    SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE)::date
                        THEN total ELSE 0 END) AS current_month,
                    SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE)::date
                        - INTERVAL '1 month'
                        THEN total ELSE 0 END) AS previous_month,
                    AVG(total) AS avg_3m
                FROM monthly
                GROUP BY category
                ORDER BY avg_3m DESC
                LIMIT 10
                """
            )
            rows = cur.fetchall()

    if not rows:
        return 0

    categories_text = "\n".join(
        f"- {cat}: this month ¥{curr:,.0f}, last month ¥{prev:,.0f}, "
        f"3-month avg ¥{avg:,.0f}"
        for cat, curr, prev, avg in rows
    )

    prompt = (
        "You are a personal finance advisor analyzing Japanese yen spending.\n\n"
        f"Top expense categories:\n{categories_text}\n\n"
        "Identify the single highest-impact optimization opportunity. "
        'Return JSON: {"title": "short title", '
        '"description": "1-2 sentence actionable advice", '
        '"category": "category name"}'
    )

    data = _llm_complete(llm, prompt)
    if not data.get("title"):
        return 0

    inserted = _insert_insight(
        pool,
        type="optimize",
        title=data["title"],
        description=data.get("description", ""),
        dedup_key=f"llm-spending-pattern:{month}",
        action_url="/cash-flow",
    )
    return 1 if inserted else 0


def _generate_merchant_anomalies_llm(
    pool: ConnectionPool, llm: LLMProvider | None
) -> int:
    """Use LLM to evaluate suspicious merchant patterns."""
    if llm is None:
        return 0

    week = _current_week()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH recent AS (
                    SELECT
                        m.display_name AS merchant,
                        t.date,
                        ABS(t.amount) AS abs_amount
                    FROM kanjo.transactions t
                    JOIN kanjo.merchants m ON t.merchant_id = m.id
                    WHERE t.is_transfer = FALSE
                        AND t.amount < 0
                        AND t.date >= CURRENT_DATE - INTERVAL '7 days'
                ),
                merchant_stats AS (
                    SELECT
                        merchant,
                        COUNT(*) AS tx_count,
                        COUNT(DISTINCT date) AS distinct_days,
                        AVG(abs_amount) AS avg_amount,
                        STDDEV(abs_amount) AS stddev_amount,
                        ARRAY_AGG(abs_amount ORDER BY date) AS amounts
                    FROM recent
                    GROUP BY merchant
                    HAVING COUNT(*) >= 2
                )
                SELECT merchant, tx_count, distinct_days,
                       avg_amount, stddev_amount, amounts
                FROM merchant_stats
                WHERE tx_count > distinct_days
                    OR (stddev_amount > avg_amount * 0.5 AND avg_amount > 0)
                ORDER BY tx_count DESC
                LIMIT 5
                """
            )
            rows = cur.fetchall()

    if not rows:
        return 0

    merchants_text = "\n".join(
        f"- {merchant}: {tx_count} transactions over {days} days, "
        f"avg ¥{avg:,.0f}, stddev ¥{stddev or 0:,.0f}, amounts: {amounts}"
        for merchant, tx_count, days, avg, stddev, amounts in rows
    )

    prompt = (
        "You are a personal finance advisor reviewing recent merchant activity "
        "(amounts in Japanese yen).\n\n"
        f"Merchants with unusual patterns:\n{merchants_text}\n\n"
        "Pick the most suspicious pattern (if any are genuinely concerning). "
        'If all patterns look normal, set severity to "none". '
        'Return JSON: {"title": "short title", '
        '"description": "1-2 sentence explanation", '
        '"severity": "high"|"medium"|"low"|"none"}'
    )

    data = _llm_complete(llm, prompt)
    if not data.get("title") or data.get("severity") == "none":
        return 0

    inserted = _insert_insight(
        pool,
        type="anomaly",
        title=data["title"],
        description=data.get("description", ""),
        dedup_key=f"llm-merchant-anomaly:{week}",
        action_url="/transactions",
    )
    return 1 if inserted else 0


def _generate_financial_health_llm(
    pool: ConnectionPool, llm: LLMProvider | None
) -> int:
    """Use LLM to generate a holistic financial health assessment."""
    if llm is None:
        return 0

    month = _current_month()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH monthly AS (
                    SELECT
                        date_trunc('month', date)::date AS month,
                        COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0)
                            AS income,
                        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) END), 0)
                            AS expenses
                    FROM kanjo.transactions
                    WHERE is_transfer = FALSE
                        AND date >= date_trunc('month', CURRENT_DATE)
                            - INTERVAL '1 month'
                    GROUP BY 1
                    ORDER BY 1
                )
                SELECT month, income, expenses FROM monthly
                """
            )
            monthly_rows = cur.fetchall()

            if len(monthly_rows) < 2:
                return 0

            cur.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN date >= date_trunc('month',
                        CURRENT_DATE)::date THEN amount END), 0) AS month_net
                FROM kanjo.transactions
                WHERE is_transfer = FALSE
                """
            )
            asset_row = cur.fetchone()

            cur.execute(
                """
                SELECT c.display_name, SUM(ABS(t.amount)) AS total
                FROM kanjo.transactions t
                JOIN kanjo.categories c ON t.category_id = c.id
                WHERE t.is_transfer = FALSE
                    AND t.amount < 0
                    AND t.date >= date_trunc('month', CURRENT_DATE)::date
                GROUP BY c.display_name
                ORDER BY total DESC
                LIMIT 3
                """
            )
            top_categories = cur.fetchall()

    prev_income, prev_expenses = monthly_rows[0][1], monthly_rows[0][2]
    curr_income, curr_expenses = monthly_rows[1][1], monthly_rows[1][2]
    month_net = asset_row[0] if asset_row else 0

    summary = (
        f"Current month: income ¥{curr_income:,.0f}, "
        f"expenses ¥{curr_expenses:,.0f}\n"
        f"Previous month: income ¥{prev_income:,.0f}, "
        f"expenses ¥{prev_expenses:,.0f}\n"
        f"Net change this month: ¥{month_net:+,.0f}\n"
        f"Top spending: "
        + ", ".join(f"{cat} ¥{total:,.0f}" for cat, total in top_categories)
    )

    prompt = (
        "You are a personal finance advisor reviewing a monthly snapshot "
        "(amounts in Japanese yen).\n\n"
        f"{summary}\n\n"
        "Give a 1-2 sentence financial health assessment. "
        'Return JSON: {"type": "positive"|"alert", '
        '"title": "short title", '
        '"description": "1-2 sentence assessment"}'
    )

    data = _llm_complete(llm, prompt)
    if not data.get("title"):
        return 0

    insight_type = data.get("type", "positive")
    if insight_type not in ("positive", "alert"):
        insight_type = "positive"

    inserted = _insert_insight(
        pool,
        type=insight_type,
        title=data["title"],
        description=data.get("description", ""),
        dedup_key=f"llm-health:{month}",
    )
    return 1 if inserted else 0
