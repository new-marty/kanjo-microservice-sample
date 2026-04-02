# Documentation Principles

## Mermaid for Diagrams

Always use Mermaid for diagrams, never ASCII art. Mermaid renders in GitHub, IDEs, and doc tools.

## Minimal but Complete

Include only what's necessary, but ensure all necessary info is present. If a doc doesn't add value, delete it.

## Two Audiences

- **CLAUDE.md** — For AI agents. Contains commands, patterns, and constraints needed while coding. Kept inline and concise.
- **docs/** — For humans. Contains architecture explanations, guides, and decision records. Can be longer and more narrative.

## Living Documentation

When decisions are made or patterns established, document them. When things change, update docs immediately — stale docs are worse than no docs.

## Structure

```
docs/
├── principles/      # Why we do things
├── architecture/    # How the system works
├── decisions/       # What we decided and why
└── development/     # How to work on the project
```
