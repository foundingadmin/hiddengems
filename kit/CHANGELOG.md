# Facet changelog

Record every change to the system here: tokens, classes, rules. Brand changes for one project live in `brand/brand.json` and need no entry.

## 1.0.0

The first standalone kit.

- Brand layer: `brand/brand.json`, `scripts/brand-core.mjs`, `scripts/brand.mjs` and the onboarding page set the accent, gray temperature, themes, corner radii, depth, stroke, typeface and logo. Status, verdict, delta and freshness colors, the type scale and density are fixed.
- Accent scale `--ds-accent-*`, generated from one brand color on fixed lightness steps, behind `--fc-brand-*`. A brand color near a status hue or near gray is kept for identity only.
- Role tokens for the brand to steer: `--fc-radius-card`, `--fc-radius-button`, `--fc-elevation-card`, `--fc-icon-stroke`. Materials and the Tailwind radius scale read the radius tokens.
- Semantic names: `--fc-delta-*` (a signed gap against a baseline) and `--fc-highlight-*` (what the product surfaces).
- Parts: the score mark (`.fc-score`), highlight card (`.fc-highlight-card`), reasons list (`.fc-reasons`), score row (`.fc-score-row`), outcome log (`.fc-outcome-log`), the accent badge (`data-variant="accent"`) and the logo (`.fc-logo`).
- Layers: `css/fonts.css` (generated, per typeface) and `css/flows.css` (numbered steps, signed money, row links in lists, chat, modal, quiet text action).
