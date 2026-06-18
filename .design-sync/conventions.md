# ShiroAni Design System — build conventions

ShiroAni is a **dark-first anime-tracker UI**. The library is **feature-level React components** (cards, panels, dialogs, views — e.g. `AnimeCard`, `EmptyState`, `StatusPill`, `DiaryEntryCard`, `ThemesSection`), compiled and exposed on `window.ShiroAniDS.*`. It does **not** export low-level primitives (no `Button`/`Input`/`Select` on the global) — compose screens from the feature components and your own Tailwind markup. Styling is **Tailwind v4 utilities backed by CSS-variable design tokens** — there are no style props; you style layout with utility classes exactly like the components do.

## Wrapping & setup (REQUIRED)

Wrap your tree in `window.ShiroAniDS.DesignProvider`. It applies the default **`plum` (dark)** theme to the document root, supplies the tooltip context (icon buttons, badges, heatmaps throw without it), and the i18n context the components read their copy from. Without it: tokens are unscoped so components render **unstyled**, and tooltip components crash.

```jsx
const { DesignProvider, EmptyState, StatusPill } = window.ShiroAniDS;
<DesignProvider>
  <div className="min-h-screen bg-background text-foreground p-6">
    <StatusPill /* see StatusPill.d.ts for props */ />
    <EmptyState title="Nothing here yet" subtitle="Add your first entry." />
  </div>
</DesignProvider>;
```

To use a non-default theme, add a theme class to a wrapper (dark themes also need `dark`): dark — `plum noir midnight sakura ember matcha iced crimson dusk cosmic void sunset abyss shirogane onyx`; light — `paper haiku`. e.g. `<div className="noir dark …">`.

## Styling idiom — semantic token utilities

Use these (NOT raw colors like `bg-zinc-900`) so the active theme drives the palette:

| utility                                                           | role                            |
| ----------------------------------------------------------------- | ------------------------------- |
| `bg-background` / `text-foreground`                               | page surface + body text        |
| `bg-card`                                                         | raised cards & panels           |
| `bg-popover` / `text-popover-foreground`                          | overlays & menus                |
| `bg-primary` / `text-primary-foreground`                          | brand accent (plum/pink)        |
| `bg-secondary`, `bg-accent`, `bg-muted` / `text-muted-foreground` | secondary surfaces & muted text |
| `bg-destructive` / `text-destructive`                             | danger / delete                 |
| `border-border`                                                   | borders                         |

Combine with standard Tailwind (`flex`, `grid`, `gap-*`, `p-*`, `rounded-lg`, `text-sm`…). Fonts: **DM Sans** (UI), **JetBrains Mono** (mono) ship with the system.

## Where the truth lives

- `styles.css` → `@import`s `_ds_bundle.css` — the compiled Tailwind utilities + every theme's token values. Read it for the full token/utility set.
- Per component: `<Name>.prompt.md` (usage + examples) and `<Name>.d.ts` (`<Name>Props` — the exact API). Read these before composing a component; many take rich data props (anime entries, stats, etc.).
