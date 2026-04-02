# UI Principles

## Light Mode Only

Initial release focuses on light mode. Dark mode can be added later but is not a priority.

## Color System

| Color      | Hex       | Usage                       |
| ---------- | --------- | --------------------------- |
| Background | `#FAFBFC` | Page background             |
| Surface    | `#FFFFFF` | Cards, panels               |
| Green      | `#16A34A` | Income, under-budget, gains |
| Red        | `#DC2626` | Expenses, overspend, losses |
| Purple     | `#7C3AED` | AI features                 |
| Cyan       | `#0891B2` | Savings, rollovers          |

Semantic Tailwind classes: `text-income`, `text-expense`, `text-savings`, `text-ai`.

## Typography

- **Body:** Inter (variable font via @fontsource)
- **Financial numbers:** JetBrains Mono (`font-mono`)

## Yen Formatting

All formatting utilities live in `@repo/shared`:

```typescript
formatYen(1234567); // "¥1,234,567"
formatYenSigned(-1234); // "-¥1,234"
formatYenCompact(190000); // "¥19万"
```

## Component Library

shadcn/ui components in `apps/web/src/components/ui/`. Add new components with:

```bash
cd apps/web
npx shadcn@latest add <component>
```

CSS variables defined in `src/index.css` for shadcn/ui compatibility.

## Spacing & Layout System

### Page Layout

The root layout (`__root.tsx`) wraps all page content with:

- `p-4` (mobile) / `p-6` (desktop) page padding on `<main>`
- No `max-w-*` constraint — content fills available width
- Sidebar is `w-16` (collapsed, icons only) on desktop, bottom bar on mobile

### Spacing Scale

| Context               | Class                      | Value  | Usage                                             |
| --------------------- | -------------------------- | ------ | ------------------------------------------------- |
| Page sections         | `space-y-6`                | 24px   | Gap between top-level sections on every page      |
| Card grids            | `gap-6`                    | 24px   | Gap between cards in `grid` layouts               |
| Compact card grids    | `gap-4`                    | 16px   | Gap in dense grids (e.g., 4-column summary cards) |
| Card internal padding | CardContent default        | 24px   | Standard card content area                        |
| Compact card padding  | `p-4`                      | 16px   | Summary/stat cards with icon + number             |
| Within-card sections  | `space-y-4`                | 16px   | Between form fields, list groups inside cards     |
| List item spacing     | `space-y-2` or `space-y-3` | 8-12px | Between items in a list within a card             |

### Page Header Pattern

Every page (except Dashboard) uses this header pattern:

```tsx
<div>
  <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
  <p className="text-muted-foreground">{description}</p>
</div>
```

The Dashboard omits an explicit `<h1>` because the Net Worth hero card serves as the visual anchor.

### Grid Patterns

| Pattern        | Class                                   | Usage                                   |
| -------------- | --------------------------------------- | --------------------------------------- |
| 2-column cards | `grid gap-6 md:grid-cols-2`             | Dashboard hero, budgets+insights, goals |
| 4-column stats | `grid grid-cols-2 gap-4 md:grid-cols-4` | Cash flow summary cards                 |
| 2-column form  | `grid grid-cols-1 gap-4 sm:grid-cols-2` | Settings, goal form fields              |

### Card Variants

- **Standard card**: `<Card>` with default padding, `shadow-sm` base
- **Hero card**: `card-tint-*` class for left border + tinted background
- **Stat card**: `<Card>` with `<CardContent className="p-4">` for compact display
- **Color-top card**: `<div className="h-1" style={{backgroundColor: color}} />` inside card for accent

## Don'ts

### Layout

- **No max-width on page content.** Pages stretch to fill available space. Do not add `max-w-7xl` or similar constraints.
- **No horizontal scrolling.** If content overflows on mobile (390px), fix it. Use `truncate`, responsive grid breakpoints, or hide non-essential columns.
- **No nested cards.** A card inside a card creates visual noise. Use sections within a single card or separate cards at the same level.

### Typography

- **No arbitrary font sizes.** Use the established scale: `text-2xl` for page titles, `text-lg`/`text-xl` for card titles, `text-sm` for secondary text, `text-xs` for tertiary labels.
- **No sans-serif for financial numbers.** Always use `font-mono` (JetBrains Mono) for amounts. Use `formatYen()` / `formatYenSigned()` / `formatYenCompact()` — never format manually.
- **No bold for secondary text.** Reserve `font-bold` for primary numbers and titles. Secondary labels use default weight or `font-medium`.

### Color

- **No arbitrary colors.** Use semantic color tokens (`text-income`, `text-expense`, `text-savings`, `text-ai`, `text-muted-foreground`). Do not hardcode hex values in components.
- **No color as the only differentiator.** Always pair color with text, icons, or position for accessibility.
- **No dark backgrounds on cards.** Cards are white (`bg-card`). Use `card-tint-*` classes for subtle semantic coloring.

### Components

- **No raw "no data" text.** Always use the `EmptyState` component with icon, title, and description.
- **No custom loading spinners.** Use `<Skeleton>` for known layouts, `<Loader2 className="animate-spin">` for unknown/centered loading.
- **No bare `<table>` elements.** Use the table components from `components/ui/table` or TanStack Table.
- **No inline styles for colors or spacing.** Exception: dynamic colors from API data (e.g., goal.color, asset type colors).

### Spacing

- **No `space-y-8` or larger between page sections.** Page sections use `space-y-6`. Within-card sections use `space-y-4`.
- **No `p-2` or `p-8` on cards.** Cards use default padding (24px) or `p-4` (16px) for compact variants. Nothing else.
- **No margin hacks.** Use `space-y-*` on parent or `gap-*` on grid/flex containers. Do not add `mt-*`/`mb-*` to individual items.

### Patterns

- **No client-side currency formatting.** All yen formatting goes through `@repo/shared` utilities. No `toLocaleString()`, no manual `¥` prefixing.
- **No ignoring `balanceVisible`.** Every financial amount display must check `usePreferencesStore().balanceVisible` and show `¥•••••` when hidden.
- **No animations without reduced-motion guard.** All animations must respect `prefers-reduced-motion`. Use the global CSS rule in `index.css` or check `window.matchMedia` in JS.
- **No skipping empty states.** Every data-dependent section must handle: loading, error, empty, and populated states.

## Planned Documentation

The following documentation items are identified but not yet written:

### Content States Inventory

Per-screen map of loading, empty, partial, full, and error states with the specific component or pattern used for each. Will be added to this file or `ui-reference.md`.

### Golden Screenshots

Process for capturing and storing approved Kanjo screenshots after each task ships. These serve as visual regression baselines. Target location: `docs/references/golden/`.

### Component Decision Matrix

When to use Card vs plain section, `formatYen` vs `formatYenCompact` vs `formatYenSigned`, Table vs Card list, Skeleton vs Loader2. Will be added to this file.

### Cross-Screen Audit Process

Post-multi-task workflow for checking visual consistency across all routes. Will be added to `docs/principles/ux.md` or a new development workflow doc.
