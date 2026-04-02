# UI/UX Review

Run a full UI/UX consistency review across all routes.

This review is split into focused passes. Each pass examines **one concern across all routes**. Do not combine passes. Complete each pass fully before moving to the next.

## Routes

`/`, `/transactions`, `/cash-flow`, `/assets`, `/goals`, `/settings`

## Setup

1. Ensure `task dev` is running (db + api + web)
2. Screenshot all routes at desktop (1280x800) and mobile (390x844)
3. Save to `.screenshots/review-{date}/`
4. Use `fullPage: true` for all screenshots to capture below-the-fold content

## Pass 0: Regression Check

_Skip if no golden screenshots exist in `docs/references/kanjo/`._

For each route with a golden screenshot:

1. Take a fresh screenshot
2. Compare with the golden screenshot
3. List EVERY visual difference, no matter how small
4. For each difference: is it intentional (from a shipped task) or a regression?

Regressions become high-priority tasks immediately.

## Pass 1: Typography Audit

For each route, inspect the actual Tailwind classes used and record them:

| Route           | Page title size/weight | Card title size/weight | Number font | Label size |
| --------------- | ---------------------- | ---------------------- | ----------- | ---------- |
| `/`             |                        |                        |             |            |
| `/transactions` |                        |                        |             |            |
| `/cash-flow`    |                        |                        |             |            |
| `/assets`       |                        |                        |             |            |
| `/goals`        |                        |                        |             |            |
| `/settings`     |                        |                        |             |            |

**Findings** (list any inconsistencies):

-

## Pass 2: Spacing Audit

For each route, inspect the actual spacing classes:

| Route           | Page padding | Card padding | Section gap | Grid gap |
| --------------- | ------------ | ------------ | ----------- | -------- |
| `/`             |              |              |             |          |
| `/transactions` |              |              |             |          |
| `/cash-flow`    |              |              |             |          |
| `/assets`       |              |              |             |          |
| `/goals`        |              |              |             |          |
| `/settings`     |              |              |             |          |

**Findings**:

-

## Pass 3: Color Audit

For each route, list every color used and verify against semantic rules (green=income, red=expense, purple=AI, cyan=savings):

| Route           | Colors used | Any violations? |
| --------------- | ----------- | --------------- |
| `/`             |             |                 |
| `/transactions` |             |                 |
| `/cash-flow`    |             |                 |
| `/assets`       |             |                 |
| `/goals`        |             |                 |
| `/settings`     |             |                 |

**Findings**:

-

## Pass 4: States Audit

For each route, verify all states exist and work:

| Route           | Loading | Empty | Populated | Error | Notes |
| --------------- | ------- | ----- | --------- | ----- | ----- |
| `/`             |         |       |           |       |       |
| `/transactions` |         |       |           |       |       |
| `/cash-flow`    |         |       |           |       |       |
| `/assets`       |         |       |           |       |       |
| `/goals`        |         |       |           |       |       |
| `/settings`     |         |       |           |       |       |

Check:

- Loading skeletons match the shape of loaded content
- Empty states use the `EmptyState` component with actionable messaging
- Error states don't show raw error messages

**Findings**:

-

## Pass 5: Mobile Audit

Resize to 390x844 and compare desktop vs mobile for each route:

| Route           | Horizontal overflow? | Truncated numbers? | Readable charts? | Usable touch targets? |
| --------------- | -------------------- | ------------------ | ---------------- | --------------------- |
| `/`             |                      |                    |                  |                       |
| `/transactions` |                      |                    |                  |                       |
| `/cash-flow`    |                      |                    |                  |                       |
| `/assets`       |                      |                    |                  |                       |
| `/goals`        |                      |                    |                  |                       |
| `/settings`     |                      |                    |                  |                       |

**Findings**:

-

## Pass 6: Cross-Screen Comparison

Open desktop screenshots of all routes side by side and answer:

1. Do all pages feel like they belong to the same app?
2. Which page looks most different from the others? Why?
3. If you squint, do the layouts have similar visual weight and density?

**Assessment**:

## Pass 7: Yen Formatting & Accessibility

| Route           | Raw numbers? | Missing formatYen? | Balance visibility respected? | Icon-only buttons have aria-label? |
| --------------- | ------------ | ------------------ | ----------------------------- | ---------------------------------- |
| `/`             |              |                    |                               |                                    |
| `/transactions` |              |                    |                               |                                    |
| `/cash-flow`    |              |                    |                               |                                    |
| `/assets`       |              |                    |                               |                                    |
| `/goals`        |              |                    |                               |                                    |
| `/settings`     |              |                    |                               |                                    |

**Findings**:

-

## Output

1. Save the completed audit tables to `docs/reviews/review-{date}.md`
2. For each finding, create a taskmaster task:
   - Title: `[UI Review] {specific issue}`
   - Description: which route, what's wrong, what it should look like, reference to relevant design principle
   - One finding per task (except batch 5+ low-priority polish items into one task)
   - Check existing tasks before creating to avoid duplicates
3. Update `docs/reviews/review-log.md`
4. Commit with message prefix `[ui-review]`
