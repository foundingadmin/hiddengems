# Facet design rules

Facet is Founding Creative's design system for dense data products. Hidden Gems is its first product. This file is the rulebook: read it before designing or building any screen. Details live in `foundations/`, `components/` and `patterns/`.

## Source of truth, in order

1. **vercel.com itself.** Token values were captured from vercel.com's production CSS and computed in a real browser (light, dark, Display P3). Component sizes were measured on the live reference demos on vercel.com. Written guidance comes from vercel.com's design system docs and `vercel.com/design.md`. Exact upstream URLs live in `SOURCES.md`.
2. **Vercel's published guidelines** (Web Interface Guidelines, see `guidelines/`).
3. **Facet decisions** for the Hidden Gems domain, built only from Facet tokens and marked `[F]`.
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
| Type | Use a Facet role class, never a loose font-size. Sans for everything incl. numbers; Mono only for code, IDs, timestamps | `.text-heading-*`, `.text-label-*`, `.text-copy-*`, `.text-button-*` |
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

## Hue allocation (hard rule) `[F]`

The interface is gray. Each hue has exactly one job, and appears only to do that job. Product code reaches color through the semantic token for the job (`--fc-*`), never a hue step (`--ds-purple-700`, `bg-red-400`) or a raw value. `scripts/lint-color.mjs` fails on violations, and purple has no Tailwind utility at all.

| Hue | Its job | Use it for | Never for | Reach it through |
|---|---|---|---|---|
| Gray | Everything by default | Text, surfaces, borders, primary buttons, chart series 1 | Carrying meaning by itself | `--fc-text-*`, `--fc-surface-*`, `--fc-border-*` |
| **Purple** | **Gems, and only gems** | "This is a Hidden Gem" designation, the gem tier ladder | Links, buttons, focus, selection, highlights, chart series, brand decoration, anything that is not a gem | `--fc-gem-*`, `.fc-gem` |
| Green | Go, and good for the bettor | Go verdict, positive edge, success, live data | Money or wins because they look nice, "important" values | `--fc-signal-go-*`, `--fc-edge-positive`, `--fc-status-success-*` |
| Amber | Wait, and caution | Wait verdict, warnings, stale data | Highlighting, emphasis, a chart series | `--fc-signal-wait-*`, `--fc-status-warning-*` |
| Red | Stop, and bad for the bettor | Stop verdict, negative edge, errors, failed data, destructive actions | Decoration, "hot" picks, urgency | `--fc-signal-stop-*`, `--fc-edge-negative`, `--fc-status-error-*` |
| Blue | Interaction and information | Links, focus ring, toggles on, info notes, recent data, chart series 2 | Verdicts, gems, success | `--fc-text-link`, `--fc-focus-color`, `--fc-status-info-*` |
| Teal, pink | Chart series only | Series 3 and 4 when direct labels and grays are not enough | Any UI element | `--fc-chart-3`, `--fc-chart-4` |

- **Color is never the only cue.** Verdict: dot plus word. Edge: sign plus arrow plus color. Gem tier: facet count plus purple intensity. Freshness: dot plus relative time.
- **Charts:** monochrome first. A chart that encodes verdicts or gems uses the signal or gem tokens, because that is their job.
- **Badges:** badges come in every hue; a badge's hue still follows this table. A purple badge means a gem.
- **Exceptions** need a reviewed reason on the same line: `facet-allow-color: <reason>`.

## Hidden Gems semantic language `[F]`

| Meaning | Encoding | Tokens |
|---|---|---|
| Verdict: go / wait / stop / unchecked | Dot + word (`.fc-signal`) | `--fc-signal-{go,wait,stop,none}-{fg,solid,bg}` |
| Six-signal read | Fixed-order dot strip; hollow ring for unknown (`.fc-signal-strip`) | same |
| Edge vs market (our estimate minus priced chance) | Sign + arrow + green/red, tabular (`.fc-delta`) | `--fc-edge-*` |
| Gem tier: rough < cut < polished < flawless | 1 to 4 filled facets + rising purple intensity (`.fc-gem`) | `--fc-gem-tier-*` |
| "This is a Hidden Gem" | The single brand accent: purple | `--fc-gem-*` |
| Data freshness | Status dot + relative time (`.fc-status`) | `--fc-freshness-*` |
| Charts | Monochrome first; blue, teal, pink only when series must be told apart (never verdict hues or purple) | `--fc-chart-1..6`, `--fc-chart-muted` |

Why purple for gems: green, amber and red already mean go, wait and stop, and blue already means links, focus and info. Purple is the only hue in the palette left with no job, and an amethyst reads as "gem" without decoration. Why a single hue for tiers: tiers are a ranking, and a ranking should read as more or less of one thing, not as four unrelated categories.

## Deliberate deviations from the vercel.com reference

Each is a conscious Facet call, recorded so nobody "fixes" it back by accident.

| The reference does | Facet does | Why |
|---|---|---|
| "Success" renders blue (Note, Progress, Toggle on-state) | Status success is green; toggles stay blue as in the reference | Green already means "go" in the verdict language; a blue success would contradict it on the same screen |
| StatusDot is only for deployment lifecycle | StatusDot also shows data freshness, mapped to current `--ds-*` scales | Freshness is the dashboard's version of deploy state; the legacy dot hex values are retired |
| Unknown values render as an em dash | En dash `–` with `aria-label="Unknown"` in numeric cells, the word "Unknown" where it fits | House rule: no em dashes in any output |
| Table has one density | Adds `data-density="compact"` (32px rows) for long ledgers | Sunday slates can run 100+ props |
| Icons from `@vercel/geistcn-assets` | Lucide at 16px / 1.5 stroke | The reference icon package is not public |
| Rejects glows and decorative looping motion | One exception: the gem glow and glint. Glow grows with tier (none, faint, fullest); the glint plays once when a tier appears; only one focal gem per view may loop; reduced motion turns it off | The glow encodes rank, so it is data rather than decoration, and it belongs to the one hue reserved for gems |

## Content

Full lessons in [`foundations/content.md`](foundations/content.md). The short version:

- **Say it once.** A tab, heading, label, column header, icon or control has already told the reader something; never restate it. Before every line, ask what the reader already knows from what sits above and around it.
- **Headlines that last.** Simple, objective, purpose-naming headlines. Specifics live in the content, so a headline never goes stale when the data changes.
- **House style.** Sentence case. No colons in titles. No em dashes. No hedges. Notes are one sentence in active voice.

## Reject on sight

Decorative gradients, glows, glass, textures or grid backgrounds. Gradient text. Cards inside cards. Icon tiles. Tiny gray prose used to fit density. Legends where direct labels fit. Color without meaning. A badge for ordinary metadata. Charts that restate a table at equal weight. Pulsing "live" indicators. Arbitrary font sizes or weights.

## How to use it

- **Plain HTML or a Claude artifact:** link `css/facet.css` (or inline it), then use the classes. See `preview/index.html`.
- **Next.js + Tailwind v4:** `@import "tailwindcss"; @import "@foundingcreative/facet/css/tailwind.css";` then `base.css`, `typography.css` and `components.css`. Load fonts with the `geist` package (`geist/font/sans`, `geist/font/mono`); Facet picks up `--font-geist-sans` and `--font-geist-mono` automatically.
- **Canvas or SVG charts:** `import { token } from '@foundingcreative/facet/js/tokens.mjs'` for resolved hex values per theme.
- **Checking color use:** `node packages/facet/scripts/lint-color.mjs apps` (fails on raw colors and hue steps).
- **Changing tokens:** edit `tokens/*.json`, run `node scripts/build.mjs`. To re-sync primitives with vercel.com, run `node scripts/sync-primitives.mjs` and review the diff like any design decision.
