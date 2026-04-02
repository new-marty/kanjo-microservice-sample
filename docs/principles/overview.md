# Core Principles

Kanjo is a single-user personal finance app wrapping MoneyForward ME. Every decision should be evaluated against these constraints.

## Build Only What's Needed

No overengineering. No backwards-compatibility shims. No dead code. If something isn't needed now, don't build it.

When refactoring, delete anything unnecessary. Never comment out code or prefix with underscore to silence linters — just remove it.

## Single User, Single Purpose

This is a personal tool, not a SaaS product. There's no multi-tenancy, no user management, no billing. Optimize for one person's financial visibility.

## Wrap, Don't Replace

MoneyForward ME is the source of truth for raw financial data. Kanjo adds visualization, analysis, and categorization on top — it doesn't replicate data entry or account linking.

## Keep It Simple

- Fewer abstractions are better than premature generalization
- Three similar lines of code beat a one-off utility function
- Solve the current problem, not hypothetical future ones
