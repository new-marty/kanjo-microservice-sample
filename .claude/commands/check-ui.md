Run a structured UI/UX review following `docs/reviews/ui-review-prompt.md`.

Read the review prompt first, then execute each pass in order. Do not skip or combine passes.

For each route: /, /transactions, /cash-flow, /assets, /goals, /settings

## Screenshot Collection

Use the Playwright CLI (`npx @playwright/mcp@latest`) — do NOT use the Playwright MCP server.

1. Navigate to `http://localhost:3000{route}`
2. Take a snapshot, save to `.screenshots/{route}-snapshot.yaml` — check semantic structure
3. Take a screenshot at 1280x800, save to `.screenshots/{route}-desktop.png`
4. Take a full-page screenshot — capture below-the-fold
5. Resize to 390x844, take a screenshot, save to `.screenshots/{route}-mobile.png`
6. Take a full-page screenshot — mobile full page
7. Resize back to 1280x800

## After Screenshots

1. Execute every pass from `docs/reviews/ui-review-prompt.md`, filling out each audit table
2. Save completed review to `docs/reviews/review-{date}.md`
3. Create a taskmaster task for each finding (one per finding, tagged `ui-review`)
4. Update `docs/reviews/review-log.md`
5. Commit with message prefix `[ui-review]`
