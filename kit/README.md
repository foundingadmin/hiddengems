# Facet

A design system for dense, decision-grade data: dashboards, boards, monitors and the settings behind them. Tokens, CSS components, a Tailwind v4 bridge, written rules and specimen pages, with no runtime dependencies.

Its foundations are captured from vercel.com's production design system, not approximated, with a semantic layer for verdicts, deltas, scores and data freshness on top. A small brand layer fits it to a project without touching what makes it work for data.

**Handing this to a coding agent:** give it this folder and point it at [`START-HERE.md`](START-HERE.md).
**Reading it yourself:** start with [`DESIGN.md`](DESIGN.md), then open [`preview/index.html`](preview/index.html).

## What's inside

```
START-HERE.md             For the coding agent: install, brand setup, wiring.
AGENT-RULES.md            Rules to paste into the project's agent instructions.
DESIGN.md                 The rulebook. Read before designing a screen.
SOURCES.md                Where every value came from, and the truth hierarchy.
brand/                    The project's look
  brand.json                The choices (accent, grays, themes, corners, depth, stroke, typeface, logo)
  README.md                 What can change, what cannot, and why
onboarding/               Brand setup
  index.html                GENERATED: one self-contained page with every choice and a live preview
  onboarding.src.html       Its source
  questions.md              The same questions for a chat
tokens/                   Source of truth (DTCG-style JSON). Edit here, then build.
  primitives.tokens.json    Color scales (light, dark, P3), shadows, sizes, motion
  typography.tokens.json    The 30 type roles
  facet.semantic.json       Semantic aliases (text, surface, border, status, signal, delta, highlight, freshness, chart, brand)
css/
  facet.css                 One import for everything
  tokens.css                GENERATED: --ds-* primitives and --fc-* semantics, with the brand applied
  fonts.css                 GENERATED: font faces for the chosen typeface
  typography.css            GENERATED: .text-heading-*, .text-label-*, .text-copy-*, .text-button-*
  materials.css             GENERATED: .material-* elevation presets
  tailwind.css              GENERATED: Tailwind v4 @theme bridge (Facet palette only)
  shadcn.css                GENERATED: shadcn/ui variable bridge
  base.css                  Reset, focus, selection, reduced motion, layout primitives
  components.css            Buttons, badges, inputs, tabs, tables, notes, the score mark, toasts and more
  data.css charts.css lists.css forms.css shell.css settings.css surfaces.css flows.css
                            Layers by screen type; import the ones a screen needs
js/
  tokens.mjs                GENERATED: resolved hex values per theme for canvas and SVG charts
  dots.mjs undo.mjs         The moments engine and the Undo countdown (patterns/moments.md)
  field.mjs tips.mjs time.mjs forms.mjs sheet.mjs
fonts/                    Sans + Mono variable WOFF2 (SIL OFL 1.1, license included)
foundations/              Color, typography, content, layout, materials and motion
components/               One spec per component: anatomy, states, rules, usage
patterns/                 Compositions: the board, data operations, settings, failures, moments
guidelines/               Web Interface Guidelines digest (rule IDs for reviews)
preview/                  Specimen pages: index.html (Design), screens.html (Screens), content.html (Content)
scripts/
  build.mjs                 tokens + brand -> generated CSS and JS (zero dependencies)
  brand.mjs                 The brand CLI: show, options, set, apply, logo, check, reset
  brand-core.mjs            The brand rules, shared by the build, the CLI and the onboarding page
  lint-color.mjs            Color guard: fails on raw colors and hue steps in app code
  pack.mjs                  Zips this folder for handing to another project
```

## Change the look

```bash
node scripts/brand.mjs set accent=#2f6fed controls=round depth=flat
```

Or open `onboarding/index.html`, choose, and apply the result with `node scripts/brand.mjs apply`. Options and their reasons are in [`brand/README.md`](brand/README.md).

## Change the system

Edit `tokens/*.json` or the hand-written CSS, never the generated files, then:

```bash
node scripts/build.mjs
node --test scripts/*.test.mjs
```

## Hand it to another project

```bash
node scripts/pack.mjs
```

writes `dist/facet-kit-<version>.zip` with the brand reset to neutral. Unzip it in the new project and follow `START-HERE.md`.

## Licensing and brand

The fonts are SIL OFL 1.1 (license in `fonts/`). Token values are facts captured from a public stylesheet; component specs are our own synthesis. Facet is not affiliated with or endorsed by Vercel: never use Vercel logos, the Vercel name, or Vercel authorship styling in products built with it.
