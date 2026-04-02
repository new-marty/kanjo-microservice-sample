# Kanjo UI/UX Reference Guide

> **Purpose**: Reference for the Claude Code agent when implementing Kanjo's UI overhaul.
> This document maps real-world finance apps to specific Kanjo features with concrete, actionable design patterns to follow.

---

## Tier 1: Primary References (Study These Closely)

### Copilot Money

**Why it matters**: Best-in-class personal finance UI. Apple Editor's Choice. Founded by ex-Google engineer. Closest match to what Kanjo should feel like.

**What to reference per Kanjo feature**:

| Kanjo Feature                                | Copilot Pattern to Follow                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard / Net Worth Hero**               | Hero card with large net worth number, area sparkline beneath, and month-over-month delta shown as colored percentage badge                             |
| **Monthly Summary (income/expense/savings)** | "Net This Month" section: income, spend, and net displayed as a compact triptych with trend arrows and previous-month comparison                        |
| **Transaction Review**                       | "To Review" section at top of dashboard with light-blue unreviewed indicator dot on each transaction row. "Mark as Reviewed" bulk action button         |
| **Budget/Category Progress**                 | Category rows with horizontal progress bars. Spent amount vs budgeted amount. Overages highlighted in red. Compact view showing top trending categories |
| **Cash Flow**                                | Dedicated tab showing income vs expenses as bar chart with net line overlay. Monthly comparison toggles                                                 |
| **Transaction List**                         | Clean ledger with category color dots, merchant name, amount right-aligned in mono font. Filter by Account, Category, Date, Tag, Review Status          |

**Key design principles from Copilot**:

- Large, confident typography for primary numbers (net worth, monthly totals)
- Muted secondary text for labels and comparisons
- Smooth transitions between summary → detail views
- Notification-worthy events surfaced on dashboard (transactions to review, budget overages)
- Native-feeling, no visual clutter — "every pixel earns its place"

**Visual references**: ![Copilot dashboard](../../references/screenshots/dashboard-copilot.png) ![Copilot transactions](../../references/screenshots/transactions-copilot.png) ![Copilot budget](../../references/screenshots/budget-copilot.png) ![Copilot cash flow](../../references/screenshots/cashflow-copilot.png)

---

### Monarch Money

**Why it matters**: Best financial dashboard customization. Strong web experience (Kanjo is web-first). Praised for "intuitive customization with powerful pre-built functionality."

**What to reference per Kanjo feature**:

| Kanjo Feature             | Monarch Pattern to Follow                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard layout**      | Customizable card grid — each section (net worth, cash flow, budgets, investments) is a distinct card with consistent padding, shadow, and header style |
| **Net Worth / Assets**    | Net worth chart with time range selector (1M, 3M, 6M, 1Y, ALL). Breakdown by asset type (cash, investments, property) as stacked area or horizontal bar |
| **Budget Overview**       | Balance-sheet-style view: budgets vs actuals per category. Monthly and yearly forecast toggles                                                          |
| **Subscription Tracking** | Recurring transaction detection with next-bill-date display and annual cost rollup                                                                      |
| **Cash Flow**             | Income vs spending monthly comparison with net savings overlay line. Green for surplus months, red for deficit                                          |

**Key design principles from Monarch**:

- Cards as the primary content container with consistent spacing
- White/light backgrounds, subtle shadows, no heavy borders
- Charts use green for positive (income, gains), red for negative (overspend, losses)
- Progressive disclosure: summary on dashboard → detail on dedicated page
- Cross-device: designed to work well on both web and mobile simultaneously

**Visual references**: ![Monarch dashboard](../../references/screenshots/dashboard-monarch.png) ![Monarch net worth](../../references/screenshots/networth-monarch.png) ![Monarch cash flow](../../references/screenshots/cashflow-monarch.png)

---

### Lunch Money

**Why it matters**: Solo-developer web-first finance app. Closest operational model to Kanjo (one person building it). Won praise for "delightfully simple" and "aesthetically simple without clutter." Multi-currency support (relevant for yen-denominated app).

**What to reference per Kanjo feature**:

| Kanjo Feature            | Lunch Money Pattern to Follow                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Transaction table**    | Clean table with category color tags, split/group/tag actions. Zebra striping for readability. Swipe-to-review on mobile companion |
| **Budget page**          | Category rows with progress bars, rollover indicators, and historical spending context (average vs current)                        |
| **Charts/Reports**       | Monthly spending breakdown charts, category pie/donut charts, trend lines. Clear visual format without over-decoration             |
| **Empty states**         | Simple, encouraging messaging when no data exists yet — not just "no data" but actionable prompts                                  |
| **Settings/Preferences** | Minimal, functional settings page. No bloat                                                                                        |

**Key design principles from Lunch Money**:

- Web-first: designed for keyboard and mouse, not retrofitted from mobile
- "Simple and to-the-point, yet powerful" — complexity behind the scenes, simplicity on surface
- Color-coded tags for categories (exactly what Kanjo needs)
- Flexible budget periods (monthly default but customizable)
- Developer API and extensibility built in (relevant mindset for Kanjo's architecture)

**Visual references**: ![Lunch Money transactions](../../references/screenshots/transactions-lunchmoney.png) ![Lunch Money budget](../../references/screenshots/budget-lunchmoney.png)

---

## Tier 2: Pattern-Specific References

### Moneytree (Japan)

**Why it matters**: Apple App of the Year in Japan (2013, 2014). Built for Japanese financial institutions. Best reference for Japanese-market finance UX.

**Specific patterns to reference**:

- **Japanese financial institution UX**: How to display yen amounts clearly (no decimal points, proper comma grouping for thousands)
- **AI categorization UI**: How auto-categorized transactions are presented with confidence indicators
- **Multi-account aggregation**: Clean display of bank accounts, credit cards, digital money (Suica, etc.), and loyalty points in a unified view
- **Notification design**: Balance alerts, spending alerts, credit card charge notifications

**Key takeaway for Kanjo**: Moneytree proves you can build a clean, modern finance UI specifically for the Japanese market. Their emphasis on reducing complexity while maintaining data richness is the target.

**Visual reference**: ![Moneytree dashboard](../../references/screenshots/dashboard-moneytree.png)

---

### YNAB (You Need A Budget)

**Why it matters**: Gold standard for zero-based budgeting UX. Strong data visualization patterns even if the overall approach is different from Kanjo.

**Specific patterns to reference**:

- **Budget category visualization**: Color-coded bars that shift from green → yellow → red as spending approaches/exceeds budget
- **"Age of Money" concept**: Novel metric displayed as a large, prominent number — inspiration for Kanjo's savings rate or spending pace display
- **Goal progress**: Visual progress indicators for savings goals with target date and amount remaining

**Anti-pattern to avoid**: YNAB's complicated interface and steep learning curve. Multiple users cite difficulty navigating. Kanjo should be the opposite — immediately intuitive.

**Visual references**: ![YNAB budget](../../references/screenshots/budget-ynab.png) ![YNAB goals](../../references/screenshots/goals-ynab.png)

---

## Tier 3: Specific UI Pattern Libraries

### Mobbin

**How to use**: Search these specific patterns when implementing each Kanjo task.

| Kanjo Task        | Mobbin Search Query                                                 |
| ----------------- | ------------------------------------------------------------------- |
| Dashboard layout  | Finance category — filter for "Dashboard" pattern                   |
| Net worth display | Mobile screens — wallet & balance patterns                          |
| Empty states      | Mobile screens — finance app empty states                           |
| Transaction list  | Search "transaction list" or "timeline-history" in finance category |
| Budget progress   | Search "progress" in finance category — budget breakdown patterns   |
| Charts/data viz   | Search "charts" + "dashboard" in finance category                   |
| Settings page     | Search "settings" in finance category                               |

### Dribbble

**How to use**: Visual inspiration only (many Dribbble designs are concept-only and not production-tested). Search these terms:

- "personal finance dashboard" — for dashboard layout inspiration
- "budget tracker UI" — for budget visualization patterns
- "net worth tracker" — for asset/wealth display patterns
- "transaction list design" — for table/list patterns

---

## Design Patterns Mapped to Kanjo Tasks

### Task 1: Design System Polish (Cards, Shadows, Gradients)

**Reference**: Copilot's card system — `shadow-sm` base with `hover:shadow-md` transition. Monarch's consistent card grid spacing. Both use white cards on subtle gray (`bg-gray-50` or `bg-slate-50`) page backgrounds.

### Task 2: Category Emoji

**Reference**: Lunch Money's color-coded category tags. Copilot's category color dots in transaction lists. Combine emoji (from Kanjo's DB) + color background circle for maximum scannability.

### Task 3: Chart Tooltip

**Reference**: Copilot's chart tooltips — white card with subtle shadow, colored indicator dot matching the data series, values in mono font, formatted currency. Monarch's chart tooltips follow the same pattern.

### Task 4: Time Range Toggle

**Reference**: Monarch's time range selector on net worth chart — segmented control with [1M][3M][6M][1Y][ALL]. Copilot uses similar toggles on their cash flow charts. Style: `bg-muted` unselected, `bg-primary text-white` selected, pill-shaped segments.

### Task 5: Empty State

**Reference**: Lunch Money's encouraging empty states — icon + headline + description + CTA button. Copilot shows empty states with illustration and action text. Pattern: centered content, muted icon (large, in a circle), short title, one-line description, primary action button.

### Task 6: Net Worth Hero

**Reference**: Copilot's hero section — large formatted number (prominent, bold), small trend badge (green up arrow or red down arrow with percentage), area sparkline below with gradient fill. Monarch's net worth card with time range toggle.

### Task 7: Monthly Summary Triptych

**Reference**: Copilot's "Net This Month" — three values (income, spend, net) in a horizontal row with previous-month comparison beneath each. Use card-tint variants: green tint for income, red tint for expenses, blue/neutral tint for net.

### Task 8: Spending Pace

**Reference**: Copilot's dashboard spending chart — cumulative area chart with "today" vertical marker. Green gradient when under pace, red when over. Monarch's monthly cash flow chart for the bar-chart-with-net-line pattern.

### Task 9: Category Budgets + AI Insights

**Reference**: Copilot's category budget rows (progress bar with spent/budgeted labels). For AI insights: card with subtle gradient border or left accent, staggered fade-in animation. Think of Copilot's "Intelligence" features — presented as helpful suggestions, not overwhelming data dumps.

### Task 10: Recent Transactions

**Reference**: Copilot's transaction review UX — light indicator dot for unreviewed items, clean list with category dot + merchant name + amount. Lunch Money's swipe actions and color-coded tags. Key: right-align amounts in `font-mono`, left-align merchant/category info.

### Task 11: Assets Page

**Reference**: Monarch's investment tracking — portfolio by asset type as allocation bar or donut. Copilot's investment holdings aggregated by ticker with gain/loss coloring. For daily movers: stock-ticker-style green/red with arrows.

### Task 12: Cash Flow Page

**Reference**: Monarch's cash flow view — grouped bar chart (income green, expenses red) with net savings line overlay. Copilot's cash flow tab with income/spend/net comparison. Add summary cards with tinted backgrounds above the chart.

### Task 13: Transactions Page

**Reference**: Lunch Money's full transaction table — clean headers with `bg-muted/50`, zebra striping, category color tags as pills, filter bar at top. Copilot's filter system: Account, Category, Date, Tag, Review Status.

### Task 14: AI Chat FAB

**Reference**: Standard Material Design FAB pattern — 48-56px circle, fixed position bottom-right, elevated shadow, brand-colored gradient. Hide when chat panel is open. Subtle entrance animation (scale from 0 to 1 with spring easing).

---

## Information Hierarchy by Screen

For each screen, elements are ranked Primary (largest, boldest, first thing the eye lands on), Secondary (supporting context, seen after primary), and Tertiary (available on inspection, de-emphasized).

### Dashboard (/)

| Tier      | Element                                  | Visual Treatment                                         |
| --------- | ---------------------------------------- | -------------------------------------------------------- |
| Primary   | Net worth number                         | `text-4xl font-bold font-mono`, gradient text, hero card |
| Primary   | Monthly income/expenses/savings triptych | Large mono numbers in tinted cards                       |
| Secondary | Spending pace chart                      | Area chart with today marker, below hero section         |
| Secondary | Month-over-month delta badge             | Small badge with trend arrow on net worth card           |
| Tertiary  | Category budgets list                    | Progress bars within card, below chart                   |
| Tertiary  | AI insights                              | Purple-tinted card, right column                         |
| Tertiary  | Recent transactions                      | Table at bottom of page                                  |

### Transactions (/transactions)

| Tier      | Element                  | Visual Treatment                                |
| --------- | ------------------------ | ----------------------------------------------- |
| Primary   | Transaction table rows   | Full-width table, amounts right-aligned in mono |
| Secondary | Filter bar               | Above table, compact controls                   |
| Secondary | Page title + description | `text-2xl font-bold` header                     |
| Tertiary  | Category color tags      | Small colored indicators per row                |
| Tertiary  | Pagination controls      | Below table                                     |

### Cash Flow (/cash-flow)

| Tier      | Element                                  | Visual Treatment                                  |
| --------- | ---------------------------------------- | ------------------------------------------------- |
| Primary   | Bar chart (income vs expenses)           | Full-width composed chart, tallest element        |
| Secondary | Summary cards (income/expenses/net/rate) | 4-column grid above chart with icon + mono number |
| Secondary | Time range toggle                        | Segmented control on chart card header            |
| Tertiary  | Page title + description                 | Standard page header                              |
| Tertiary  | Chart legend                             | Below chart axes                                  |

### Assets (/assets)

| Tier      | Element                    | Visual Treatment                                         |
| --------- | -------------------------- | -------------------------------------------------------- |
| Primary   | Total assets number        | `text-4xl font-bold font-mono`, gradient text, hero card |
| Primary   | Change percentage badge    | Colored badge with trend arrow                           |
| Secondary | Asset composition bar      | Horizontal stacked bar showing allocation                |
| Secondary | Asset trend line chart     | Line chart with time range toggle                        |
| Tertiary  | Composition breakdown list | Type + percentage + amount per row                       |
| Tertiary  | Daily gainers/decliners    | Split cards with green/red amounts                       |

### Goals (/goals)

| Tier      | Element                         | Visual Treatment                              |
| --------- | ------------------------------- | --------------------------------------------- |
| Primary   | Progress bars on each goal card | Colored progress bar, percentage badge        |
| Primary   | Current amount                  | `text-2xl font-bold font-mono`                |
| Secondary | Goal icon + name + deadline     | Card header with emoji, title, days remaining |
| Secondary | Monthly required amount         | Muted background row at bottom of card        |
| Tertiary  | Add goal button                 | Top-right of page header                      |
| Tertiary  | Goal management menu            | Kebab dropdown per card                       |

### Settings (/settings)

| Tier      | Element                | Visual Treatment                              |
| --------- | ---------------------- | --------------------------------------------- |
| Primary   | Budget table           | Grid with category names, amounts, controls   |
| Secondary | Institution list       | Cards with icons, toggle visibility           |
| Secondary | Sync status            | Status badge with last-sync timestamp         |
| Tertiary  | Language/theme selects | Simple select dropdowns in cards              |
| Tertiary  | Total budget summary   | Muted background row at bottom of budget card |

---

## General Design Principles (Synthesized from All References)

1. **Numbers are the UI**: In finance apps, the primary content IS the numbers. Make them large, readable, and formatted correctly (`font-mono`, proper yen formatting with `¥` prefix and comma grouping).

2. **Color means something**: Green = income/positive/gains. Red = expense/negative/losses. Blue/neutral = informational. Never use color arbitrarily.

3. **Progressive disclosure**: Dashboard shows summary → clicking any card goes to detail page. Never overwhelm with all data at once.

4. **Review-driven interaction**: The core UX loop is "see what's new → review → move on." Copilot's transaction review flow is the gold standard for this.

5. **Charts serve the question**: Every chart should answer one specific question (How much did I spend? Am I on pace? Where does my money go?). If a chart doesn't answer a clear question, remove it.

6. **Whitespace is a feature**: All top-rated finance apps (Copilot, Monarch, Lunch Money) use generous padding and spacing. Cramped UI makes financial data feel stressful.

7. **Mobile-responsive but web-first**: Kanjo is a web app. Design for 1280px+ first, then adapt for 390px mobile. Don't compromise the desktop experience for mobile constraints.

8. **Empty states are onboarding**: Every page should have a thoughtful empty state that guides the user to take action, not just "no data found."
