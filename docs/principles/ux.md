# UX Principles

## Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML (`<nav>`, `<main>`, `<header>`)
- Provide ARIA labels for icon-only buttons
- Support `prefers-reduced-motion`
- Skip link: `メインコンテンツへ移動`
- Route changes automatically focus the main content area

## Balance Visibility

Always check `balanceVisible` before showing financial values. When hidden, display `¥•••••`.

```tsx
const { balanceVisible } = usePreferencesStore();
<span>{balanceVisible ? formatYen(amount) : '¥•••••'}</span>;
```

## AI UX Patterns

Use purple (`#7C3AED`) for all AI-related UI elements.

### Loading States (Two-Stage)

1. **Processing** — Request received, preparing data
2. **Generation** — AI model generating response

### Loading Patterns by Duration

| Duration | Pattern                         |
| -------- | ------------------------------- |
| < 0.1s   | Instant (no indicator)          |
| 1s+      | Skeleton screen (known layouts) |
| 2s+      | Progress indicator              |
| Longer   | Step display + cancel option    |

### Key Patterns

- **Streaming output:** Display tokens as they arrive to reduce perceived latency
- **Animation variation:** Change animation style during long waits to signal progress
- **In-context AI:** Integrate AI where users work — highlights, selections, inline suggestions
- **Task-oriented UI:** Sliders/knobs/semantic inputs can outperform pure conversation UI
- **Progress indicators:** Show determinate progress when possible (e.g., "3/10 transactions categorized")

### References

- [Shape of AI](https://www.shapeof.ai) — AI UX pattern catalog
- [Smashing Magazine: AI Interface Patterns](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)
- [patterns.dev: AI UI Patterns](https://www.patterns.dev/react/ai-ui-patterns/)
- [Cloudscape GenAI Loading States](https://cloudscape.design/patterns/genai/genai-loading-states/)
- [Pencil & Paper: Loading Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback)
