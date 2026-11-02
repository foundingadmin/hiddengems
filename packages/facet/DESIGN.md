# Facet design rules

Facet is Founding Creative's working design system for dense data products, derived from Vercel's Geist. Hidden Gems is its first product. This file is the rulebook: read it before designing or building any screen. Details live in `foundations/`, `components/` and `patterns/`.

## Source of truth, in order

1. **vercel.com itself.** Token values were captured from vercel.com's production CSS and computed in a real browser (light, dark, Display P3). Component sizes were measured on the live Geist demos. Written guidance comes from `vercel.com/geist/*.md` and `vercel.com/design.md`.
2. **Vercel's published guidelines** (Web Interface Guidelines, see `guidelines/`).
3. **Facet decisions** for the Hidden Gems domain, built only from Geist tokens and marked `[F]`.
4. **Third-party jumpstarts and references** (`reference/inbox/`). Useful for ideas, never authoritative. If one conflicts with 1 or 2, vercel.com wins.

We adopt Vercel's judgment, not Vercel's identity. Never use the Vercel wordmark, triangle, or "Vercel" authorship styling in our products.

## The point of view

Vercel handles dense data well because of a few disciplines applied without exception:

- **Monochrome first.** The interface is grays. Color appears only when it carries meaning (state, action, a data series) and always with a second, non-color cue.
- **Typography makes hierarchy, not boxes.** Size, weight and the two text grays (gray-1000 primary, gray-900 secondary) do the work before any border, card or fill.
- **One owner per gap.** Parents set spacing; children never add competing margins.
- **Precision is visible.** Tabular numbers, right-aligned numeric columns, consistent units and precision, exact deltas on the same basis.
- **Stillness by default.** Motion only explains a change of state.

## Foundations at a glance

| Area | Rule | Tokens |
|---|---|---|
| Color steps | 100 to 300 fills (default, hover, active), 400 to 600 borders, 700 to 800 solid fills, 900 secondary text, 1000 primary text | `--ds-<scale>-<step>` |
| Backgrounds | Background 1 almost everywhere; Background 2 sparingly for subtle separation | `--fc-surface-canvas`, `--fc-surface-subtle` |
| Borders | Solid gray-400 by default; gray-alpha only when the edge must blend. Draw each border once | `--fc-border-*` |
| Type | Use a Geist role class, never a loose font-size. Sans for everything incl. numbers; Mono only for code, IDs, timestamps | `.text-heading-*`, `.text-label-*`, `.text-copy-*`, `.text-button-*` |
| Numbers | Tabular figures anywhere values are compared | `.tabular`, `.fc-num` |
| Controls | Heights 32 (small), 36 (default), 40 (large), 24 (tiny icon) | `--fc-control-*` |
| Table rows | Header 36, body 40, compact 32 `[F]` | `--fc-row-*` |
| Spacing | 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 | `--fc-space-*` |
| Radius | 6 (controls, small surfaces), 8 (large controls), 12 (raised surfaces, menus, modals), 16 (fullscreen), full (pills) | `--fc-radius-*` |
| Elevation | Material presets, shadows include a hairline ring so no border is needed | `.material-*`, `--ds-shadow-*` |
| Focus | Buttons, tabs, toggles: 2px canvas gap + 2px blue ring. Inputs, selects: dark 1px ring + soft 4px halo. Keyboard only (`:focus-visible`) | `--ds-focus-ring`, `--ds-focus-border` |
| Motion | Swift easing `cubic-bezier(.175,.885,.32,1.1)`, 200ms popovers, 300ms overlays, honor reduced motion | `--fc-ease-swift`, `--fc-duration-*` |
| Layout | 12 columns desktop, 6 tablet, 4 mobile; page max 1400 + 24 margins | `.fc-page` |

## Rules for dense data (the part that matters most)

1. **Order by the reader's question.** What decision is this screen for? Lead with the answer and its decisive evidence. Keep the exhaustive record below or behind disclosure.
2. **Two reading speeds.** A fast path (title, decisive values, verdicts) and an audit path (exact table, assumptions, sources). Both always available.
3. **Pick geometry before components.** Rank or magnitude: position or length on a shared scale. Change over time: horizontal order. Threshold: distance from a boundary. Qualitative alternatives: aligned rows. Use tables for precise lookup and charts only when the relationship becomes faster to see.
4. **Tables are evidence.** Semantic `<table>` with a caption that states sort and filter. Left-align text, right-align numbers and their headers. Baseline-align cells. Never truncate a header to save room; reorder or drop columns first. Show current and total row counts when filtered, and default filters must be neutral (never cherry-pick favorable rows).
5. **Shared lanes.** Repeated bars share one label lane, one plot lane and one value lane, and one documented scale. A bar track is never decoration.
6. **Color is a second channel, never the only one.** Verdicts get a word plus a dot. Edges get a sign plus an arrow plus color. Tiers get a filled facet count plus intensity.
7. **Equal peers look equal.** Same role, size, weight and numeric treatment for every value in a set; never enlarge one because it is bigger or longer.
8. **Fewer surfaces.** Do not wrap every metric in a card or nest cards. Earn a boundary only for selection, interaction, warning, or a real grouping that spacing cannot express.
9. **Honest precision.** Keep units and qualifiers next to the number. No fake decimals. Say when a sample is small. Distinguish observed, derived and projected values.
10. **State is in the URL.** Filters, sort, selected week and open pick live in the query string so any view can be shared and restored.
11. **Freshness is always visible** for any number that can go stale (odds, injuries): a status dot plus a relative time, with the exact timestamp on hover.
12. **Skeletons, not spinners, for layout we already know.** Preserve the shape so the page does not jump.

## Hidden Gems semantic language `[F]`

| Meaning | Encoding | Tokens |
|---|---|---|
| Verdict: go / wait / stop / unchecked | Dot + word (`.fc-signal`) | `--fc-signal-{go,wait,stop,none}-{fg,solid,bg}` |
| Six-signal read | Fixed-order dot strip; hollow ring for unknown (`.fc-signal-strip`) | same |
| Edge vs market (our estimate minus priced chance) | Sign + arrow + green/red, tabular (`.fc-delta`) | `--fc-edge-*` |
| Gem tier: rough < cut < polished < flawless | 1 to 4 filled facets + rising purple intensity (`.fc-gem`) | `--fc-gem-tier-*` |
| "This is a Hidden Gem" | The single brand accent: purple | `--fc-gem-*` |
| Data freshness | Status dot + relative time (`.fc-status`) | `--fc-freshness-*` |
| Charts | Monochrome first; hues in fixed order only when series must be told apart | `--fc-chart-1..6`, `--fc-chart-muted` |

Why purple for gems: green, amber and red already mean go, wait and stop, and blue already means links, focus and info. Purple is the only Geist hue left with no job, and an amethyst reads as "gem" without decoration. Why a single hue for tiers: tiers are a ranking, and a ranking should read as more or less of one thing, not as four unrelated categories.

## Deliberate deviations from Geist

Each is a conscious Facet call, recorded so nobody "fixes" it back by accident.

| Geist does | Facet does | Why |
|---|---|---|
| "Success" renders blue (Note, Progress, Toggle on-state) | Status success is green; toggles stay blue as in Geist | Green already means "go" in the verdict language; a blue success would contradict it on the same screen |
| StatusDot is only for deployment lifecycle | StatusDot also shows data freshness, mapped to current `--ds-*` scales | Freshness is the dashboard's version of deploy state; the legacy dot hex values are retired |
| Unknown values render as an em dash | En dash `–` with `aria-label="Unknown"` in numeric cells, the word "Unknown" where it fits | House rule: no em dashes in any output |
| Table has one density | Adds `data-density="compact"` (32px rows) for long ledgers | Sunday slates can run 100+ props |
| Icons from `@vercel/geistcn-assets` | Lucide at 16px / 1.5 stroke | The Geist icon package is not public |

## Writing

Sentence case everywhere. Headings state the finding or the question ("Gesicki carries the widest gap"), not the genre ("Overview"). Plain words on the fast path, exact terms in the audit path, define a term at first use. No all-caps eyebrows, no em dashes, no hype.

## Reject on sight

Decorative gradients, glows, glass, textures or grid backgrounds. Gradient text. Cards inside cards. Icon tiles. Tiny gray prose used to fit density. Legends where direct labels fit. Color without meaning. A badge for ordinary metadata. Charts that restate a table at equal weight. Pulsing "live" indicators. Arbitrary font sizes or weights.

## How to use it

- **Plain HTML or a Claude artifact:** link `css/facet.css` (or inline it), then use the classes. See `preview/index.html`.
- **Next.js + Tailwind v4:** `@import "tailwindcss"; @import "@foundingcreative/facet/css/tailwind.css";` then `base.css`, `typography.css` and `components.css`. Load fonts with the `geist` package (`geist/font/sans`, `geist/font/mono`); Facet picks up `--font-geist-sans` and `--font-geist-mono` automatically.
- **Canvas or SVG charts:** `import { token } from '@foundingcreative/facet/js/tokens.mjs'` for resolved hex values per theme.
- **Changing tokens:** edit `tokens/*.json`, run `node scripts/build.mjs`. To re-sync with Vercel, run `node scripts/capture-geist.mjs` and review the diff like any design decision.
