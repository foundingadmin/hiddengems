# The brand layer

How a project makes Facet its own. One file holds the choices (`brand.json`), one module holds the rules (`scripts/brand-core.mjs`), and the build applies them to the tokens before any CSS is written.

```bash
node scripts/brand.mjs show        # what the current brand does
node scripts/brand.mjs options     # every option and its values
node scripts/brand.mjs set accent=#2f6fed controls=round
node scripts/brand.mjs apply brand-packet.json
node scripts/brand.mjs logo path/to/logo.svg
node scripts/brand.mjs reset
```

## What can change

| Option | Values | What it changes |
|---|---|---|
| `name` | 1 to 40 characters | The product name, for the agent and the specimen |
| `accent` | A hex color, or `null` | The accent scale (`--ds-accent-*`) behind `--fc-brand-*`: focus rings, checked and on controls, highlights and the score mark, text selection, marketing surfaces, dot illustrations |
| `neutrals` | `neutral`, `cool`, `warm`, `tinted` | A trace of hue in the gray scale. Lightness never moves |
| `modes` | `both`, `light`, `dark` | Whether the product follows the device theme, or is always light or always dark |
| `controls` | `square`, `soft`, `round`, `pill` | Radii of buttons, inputs, chips and small parts (`--fc-radius-xs`, `sm`, `md`). `pill` rounds buttons fully |
| `surfaces` | `square`, `soft`, `round` | Radii of cards, notes and lists (`--fc-radius-card`) and of menus, sheets and modals (`--fc-radius-lg`, `xl`) |
| `depth` | `flat`, `subtle`, `raised` | Every shadow. Flat keeps only the hairline ring; raised deepens drop shadows and lifts cards |
| `stroke` | `fine`, `defined` | Border strength (the border gray steps and shadow rings) and the icon stroke (`--fc-icon-stroke`: 1.5 or 2) |
| `type` | `geist`, `inter`, `plex`, `system` | The sans and mono families. Sizes, weights and tracking stay |
| `logo` | An SVG file in this folder | Cleaned on install; a one-color logo also ships in `currentColor` |
| `accentUse` | `auto`, `interactive`, `identity` | Leave on `auto`. See below |

## What cannot change, and why

- **Status, verdict, delta and freshness colors.** Green, amber, red and blue carry meaning on every screen. A brand that moves them breaks the reading.
- **The type scale.** Thirty roles tuned for dense tables: sizes, line heights, weights, tracking and tabular figures.
- **Spacing, control heights and row heights.** They are the density.
- **Typefaces outside the four.** Each of the four has tabular figures, a matching mono and a full weight range. Display and script faces fail in tables.

## How the accent is built

A brand color is not used raw. The build keeps its hue, scales its chroma, and places it on Facet's lightness steps, so text on a tint, marks on a fill and focus rings hold their contrast for any hue. It then measures the pairs that matter and refuses a config that fails.

A color too close to red, amber or green would be read as a status, and a color close to gray cannot mark anything. For those, `accentUse: "auto"` keeps the brand color for identity only (text selection, marketing surfaces, dot illustrations) and points focus rings, checked controls and highlights at blue. `"interactive"` overrides that and prints a warning; use it only when the product shows no verdicts or statuses in that hue.

## Files

- `brand.json`: the choices. Written by the CLI; safe to edit by hand, then run `node scripts/build.mjs`.
- `logo.svg`, `logo.mono.svg`: the installed logo.
