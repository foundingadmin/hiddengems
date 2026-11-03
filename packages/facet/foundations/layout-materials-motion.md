# Layout, spacing, materials, motion, icons

> Sources: vercel.com reference docs and production CSS variables (spacing, `--ds-shadow-*`, `--ds-motion-*`, `--ds-z-*`), and the report foundation referenced by vercel.com/design.md. Captured 2026-11-02.

## Spacing

4px base, the same ladder the vercel.com reference and its report foundation use.

| Token | px | Typical owner |
|---|---|---|
| `--fc-space-1` | 4 | Icon to label, dot to word |
| `--fc-space-2` | 8 | Inside a control group, label to field |
| `--fc-space-3` | 12 | Within a group |
| `--fc-space-4` | 16 | Paragraph rhythm, card padding (compact) |
| `--fc-space-6` | 24 | Between groups, page margin, the default gap |
| `--fc-space-8` | 32 | Section gap |
| `--fc-space-10` | 40 | Double gap |
| `--fc-space-12` | 48 | Major section turns |
| `--fc-space-16` | 64 | True chapter break only |

**One owner per gap.** Use `.fc-stack` / `.fc-row` / `.fc-grid` with `--fc-gap`, and never add margins to children of a spacing owner.

## Grid and page

- 12 columns on desktop, 6 on tablet, 4 on mobile. Prose spans 6 to 7 desktop columns; tables, charts and comparisons may span all 12.
- Page width: dashboard `--ds-page-width` 1400px (product), docs and marketing 1200px, with a 24px page margin (16px on phones). `.fc-page` applies this.
- Everything aligns to a shared edge, baseline or grid line. Grid and flex children get `min-width: 0` so they can shrink instead of overflowing.
- A visible guide-line grid is a marketing device; Vercel's own report rules reject grid backgrounds as decoration. Do not use guide grids in the product.

## Breakpoints

From vercel.com production CSS: **600** and **960** are the main product breakpoints (`max-width: 600px` / `min-width: 601px`, `max-width: 960px` / `min-width: 961px`), with **400** and **1200** as secondary. Design at 390, 768 and 1440 to check each side.

## Controls and density

Measured on the vercel.com reference demos:

| Size | Height | Text | Radius | Inline padding |
|---|---|---|---|---|
| tiny (icon only) | 24 | 14 | 4 | 0 |
| small | 32 | 14 / 500 | 6 | 6 (button), 12 (input) |
| default | 36 | 14 / 500 | 6 | 10 (button), 12 (input) |
| large | 40 | 16 / 500 | 8 | 14 (button), 12 (input) |

Table: header 36, body rows 40 (10px block, 8px inline padding). Facet adds a 32px compact density for long ledgers. Keep interactive targets at least 24px even in compact rows.

## Materials (elevation)

Elevation is chosen from presets, never composed ad hoc. Shadows already include a hairline ring, so materials need no border.

| Class | Radius | Shadow | Use |
|---|---|---|---|
| `material-base` | 6 | `--ds-shadow-border` | Everyday surface |
| `material-small` | 6 | `--ds-shadow-border-small` | Slightly raised |
| `material-medium` | 12 | `--ds-shadow-border-medium` | Further raised panels |
| `material-large` | 12 | `--ds-shadow-border-large` | Featured panel |
| `material-tooltip` | 6 | `--ds-shadow-tooltip` | Tooltips (the only floating element with a stem) |
| `material-menu` | 12 | `--ds-shadow-menu` | Menus, popovers, comboboxes |
| `material-modal` | 12 | `--ds-shadow-modal` | Modals |
| `material-fullscreen` | 16 | `--ds-shadow-fullscreen` | Fullscreen sheets |

Restraint: do not wrap every metric in a card, and never nest cards. A surface must communicate selection, interaction, warning or a real grouping spacing cannot show.

## Layering

`--fc-z-drawer` 200, `--fc-z-modal` 300, `--fc-z-menu` 2001, `--fc-z-stage` 4000 (the moments canvas), `--fc-z-toast` 5000, `--fc-z-tooltip` 99999.

## Motion

- Easing: "swift" `cubic-bezier(.175, .885, .32, 1.1)` for popovers (200ms) and overlays (300ms, scaling from 0.96). Simple hover color changes: 150ms ease.
- Animate only `opacity` and `transform`, and list properties explicitly (never `transition: all`).
- Motion explains a state change, preserves continuity, or confirms an action. Nothing else: no decorative pulses, marquees, scroll reveals or bounce.
- Honor `prefers-reduced-motion` (base.css collapses durations).
- Moments (`patterns/moments.md`) confirm an action with dots drawn by `js/dots.mjs`. The gem sheet opens on a spring, `--fc-ease-emphasized` over `--fc-duration-sheet` (460ms), and closes with `--fc-ease-exit` and no spring; an Undo toast stays `--fc-duration-undo` (5s).
- The one sanctioned glow and loop: the gem tier (`.fc-gem`). Each 5.6s cycle lights the filled facets left to right (one every 160ms), fires a quick flash burst the moment the last one lands, holds lit for most of the cycle, then dims and repeats. `--fc-gem-delay` sets when a row starts (cascade upward in ranked tables, 160ms per row, so the top rank lights last); the facet count sets when its sequence ends. `data-motion="once"` or `"none"` opts out. Rough never moves. Everything else stays still.
- Named exceptions to the one-loop rule, asked for directly by the principal: the unread sheen on a gem card (`.fc-gem-card[data-unread]`, one pass every 4.2s) and the six dots circling the newest unread card (one lap every 5.2s). They are the only loops besides the gem, and both stop under reduced motion.
- Named exception to opacity and transform only: a slip leg that is removed closes its height and block padding over 220ms (`apps/web/lib/moments/remove.ts`, opened the same way by Undo), because the moments rundoc requires rows to close smoothly rather than jump. It runs after the leg is swept from view, moves only the rows below it, and is instant under reduced motion. The sweep's `clip-path` wipe is the engine's own exception (`patterns/moments.md`).
- Live data: a changed odds value may briefly tint its cell (opacity fade, under 600ms). Never animate every tick, and never reorder rows under the cursor.

## Focus

`:focus-visible` only. Ring: `0 0 0 2px var(--ds-background-100), 0 0 0 4px var(--ds-focus-color)`; focus color is the brand accent (`--fc-focus-color`, from `--fc-brand-solid`). Inputs use a 1px brand ring with a soft 4px brand halo. Sticky headers must never cover the focused cell; set `scroll-padding-top` to the header height.

## Icons

The reference icon set is not published to public npm. Facet's decision `[F]`: use **Lucide** (the set Vercel's own templates and shadcn use) at 16px with a 1.5 stroke, `currentColor`, sized to the text role it sits beside (16 in 14px labels, 14 in 13px, 12 in badges). Rules: icons are for faster recognition, never decoration; a neutral `.fc-icon-tile` may hold one where it speeds recognition (empty states, list and connection rows, entity leads); one icon style per product; always pair an unfamiliar icon with a visible label or tooltip.
