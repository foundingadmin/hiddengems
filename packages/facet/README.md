# Facet

A design system for dense, decision-grade data. Built by Founding Creative; first used by Hidden Gems.

Facet's foundations are captured from vercel.com's production design system, not approximated, and Facet and adds a thin semantic layer for verdicts, value gaps, tiers and data freshness. It is framework-agnostic CSS first, with a Tailwind v4 bridge and a JS token export, so it drops into a Claude artifact, a static page or a Next.js app unchanged.

**Start with [`DESIGN.md`](DESIGN.md).** Then open [`preview/index.html`](preview/index.html) in a browser.

## What's inside

```
packages/facet/
  DESIGN.md                 The rulebook. Read first.
  SOURCES.md                Where every value came from, and the truth hierarchy.
  tokens/                   Source of truth (DTCG-style JSON). Edit here, then build.
    primitives.tokens.json    Primitives: color scales (light, dark, P3), shadows, sizes, motion
    typography.tokens.json    The 30 type roles
    facet.semantic.json       Facet semantic aliases (text, surface, border, status, signal, edge, gem, freshness, chart)
  css/                      Generated + hand-written CSS
    facet.css                 One import for everything (plain HTML, artifacts)
    tokens.css                GENERATED: --ds-* primitives and --fc-* semantics, light/dark/P3
    typography.css            GENERATED: .text-heading-*, .text-label-*, .text-copy-*, .text-button-*
    materials.css             GENERATED: .material-* elevation presets
    tailwind.css              GENERATED: Tailwind v4 @theme bridge (Facet palette only)
    base.css                  Fonts, reset, focus, selection, reduced motion, layout primitives
    components.css            .fc-* components (measured from the vercel.com reference) and Hidden Gems pieces
  js/tokens.mjs             GENERATED: resolved hex values per theme for canvas/SVG charts
  fonts/                    Sans + Mono variable WOFF2 (SIL OFL 1.1, license included)
  foundations/              Color, typography, content, layout/materials/motion/icons
  components/               56 component specs synthesized from vercel.com reference docs, with Hidden Gems usage
  patterns/                 Hidden Gems composition patterns (slate, verdicts, tiers, freshness, states)
  guidelines/               Vercel Web Interface Guidelines digest (rule IDs for reviews)
  reference/                Raw captures (computed tokens, P3 values, component measurements),
                            Vercel ecosystem notes, and inbox/ for third-party material
  preview/index.html        Living specimen: foundations, components, and an applied slate
  scripts/
    build.mjs               tokens/*.json -> css/*.css + js/tokens.mjs (zero dependencies)
    sync-primitives.mjs       Re-sync primitives from vercel.com (needs Playwright)
    lint-color.mjs          Color guard: fails on raw colors and hue steps outside Facet
```

## Use it

**Plain HTML / Claude artifact**

```html
<link rel="stylesheet" href="packages/facet/css/facet.css">
<table class="fc-table" data-interactive>...</table>
```

**Next.js + Tailwind v4** (in `apps/web/app/globals.css`)

```css
@import "tailwindcss";
@import "@foundingcreative/facet/css/tailwind.css";
@import "@foundingcreative/facet/css/base.css";
@import "@foundingcreative/facet/css/typography.css";
@import "@foundingcreative/facet/css/components.css";
```

Load fonts with the `geist` package in the root layout (`import { GeistSans } from 'geist/font/sans'`), and put `GeistSans.variable` and `GeistMono.variable` on `<html>`. Facet reads `--font-geist-sans` / `--font-geist-mono` automatically.

**Theme:** light by default, follows the OS, force with `data-theme="dark|light"` (or `.dark-theme` / `.light-theme`) on `<html>` or any subtree.

## Change it

```bash
node packages/facet/scripts/build.mjs
```

Edit `tokens/*.json`, never the generated files. Primitives (`primitives.tokens.json` colors and shadows, `typography.tokens.json`) mirror vercel.com; change them only by re-syncing:

```bash
node packages/facet/scripts/sync-primitives.mjs && node packages/facet/scripts/build.mjs
```

Review that diff like a design decision.

## Reuse it in another project

Copy `packages/facet/` as a folder (it has no runtime dependencies), or consume it as a workspace package. Hidden Gems specifics live only in `facet.semantic.json` (signal, edge, gem, freshness), the `[F]` section of `components.css`, and `patterns/hidden-gems.md`; replace those three for a new domain and keep everything else.

## Licensing and brand

The fonts are SIL OFL 1.1 (license in `fonts/`). Token values are facts captured from a public stylesheet; component specs are our own synthesis with source links. Facet is not affiliated with or endorsed by Vercel: never use Vercel logos, the Vercel name, or Vercel authorship styling in products built with it.
