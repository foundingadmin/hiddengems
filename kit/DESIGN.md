# Facet design rules

Facet is a design system for dense data products: dashboards, boards, monitors and the settings behind them. This file is the rulebook: read it before designing or building any screen. Details live in `foundations/`, `components/` and `patterns/`. The look of one project (accent, corners, depth, stroke, themes, typeface, logo) is set in `brand/` and nowhere else.

## Source of truth, in order

1. **The vercel.com reference.** Token values were captured from vercel.com's production CSS and computed in a real browser (light, dark, Display P3). Component sizes were measured on the live reference demos. Provenance is in `SOURCES.md`.
2. **Vercel's published guidelines** (Web Interface Guidelines, see `guidelines/`).
3. **Facet decisions** for data products, built only from Facet tokens and marked `[F]`.
4. **The brand layer** (`brand/brand.json`). It may change what `brand/README.md` lists and nothing else.
5. **Third-party references.** Useful for ideas, never authoritative.

We adopt Vercel's judgment, not Vercel's identity. Never use the Vercel wordmark, triangle, or "Vercel" authorship styling in a product built with Facet.

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
| Type | Use a Facet role class, never a loose font-size. Sans for everything people read, including numbers (tabular figures) and relative times; Mono for clock and calendar times and for machine values such as IDs, keys and cron expressions | `.text-heading-*`, `.text-label-*`, `.text-copy-*`, `.text-button-*` |
| Numbers | Tabular figures anywhere values are compared | `.tabular`, `.fc-num` |
| Controls | Heights 32 (small), 36 (default), 40 (large), 24 (tiny icon) | `--fc-control-*` |
| Table rows | Header 36, body 40, compact 32 `[F]` | `--fc-row-*` |
| Spacing | 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 | `--fc-space-*` |
| Radius | By role, never by number: `xs`, `sm`, `md` for controls and small parts, `card` for cards, notes and lists, `lg` and `xl` for menus, sheets and modals, `full` for pills. The brand sets the values (defaults 4, 6, 8, 6, 12, 16) | `--fc-radius-*` |
| Elevation | Material presets, shadows include a hairline ring so no border is needed. The brand sets depth for all of them at once (flat, subtle, raised) | `.material-*`, `--ds-shadow-*`, `--fc-elevation-card` |
| Focus | Buttons, tabs, toggles: 2px canvas gap + 2px brand ring. Inputs, selects: 1px brand ring + soft 4px brand halo. Keyboard only (`:focus-visible`) | `--ds-focus-ring`, `--ds-focus-border` |
| Motion | Swift easing `cubic-bezier(.175,.885,.32,1.1)`, 200ms popovers, 300ms overlays, honor reduced motion. Moments confirm actions with dots (`patterns/moments.md`) | `--fc-ease-*`, `--fc-duration-*`, `--fc-illus-*` |
| Layout | 12 columns desktop, 6 tablet, 4 mobile; page max 1400 + 24 margins | `.fc-page` |

## Rules for dense data (the part that matters most)

1. **Order by the reader's question.** What decision is this screen for? Lead with the answer and its decisive evidence. Keep the exhaustive record below or behind disclosure.
2. **Two reading speeds.** A fast path (title, decisive values, verdicts) and an audit path (exact table, assumptions, sources). Both always available.
3. **Pick geometry before components.** Rank or magnitude: position or length on a shared scale. Change over time: horizontal order. Threshold: distance from a boundary. Qualitative alternatives: aligned rows. Use tables for precise lookup and charts only when the relationship becomes faster to see.
4. **Tables are evidence.** Semantic `<table>` with a caption that states sort and filter. Left-align text, right-align numbers and their headers. Baseline-align cells. Never truncate a header to save room; reorder or drop columns first. Show current and total row counts when filtered, and default filters must be neutral (never cherry-pick favorable rows).
5. **Shared lanes.** Repeated bars share one label lane, one plot lane and one value lane, and one documented scale. A bar track is never decoration.
6. **Color is a second channel, never the only one.** Verdicts get a word plus a dot. Deltas get a sign plus an arrow plus color. The score gets its number plus accent intensity.
7. **Equal peers look equal.** Same role, size, weight and numeric treatment for every value in a set; never enlarge one because it is bigger or longer.
8. **Fewer surfaces.** Do not wrap every metric in a card or nest cards. Earn a boundary only for selection, interaction, warning, or a real grouping that spacing cannot express.
9. **Honest precision.** Keep units and qualifiers next to the number. No fake decimals. Say when a sample is small. Distinguish observed, derived and projected values.
10. **State is in the URL.** Filters, sort, the selected period and the open record live in the query string so any view can be shared and restored.
11. **Freshness is always visible** for any number that can go stale (synced data, reports): a status dot plus a relative time, with the exact timestamp on hover.
12. **Skeletons, not spinners, for layout we already know.** Preserve the shape so the page does not jump.

## Hue allocation (hard rule) `[F]`

The interface is gray. Each hue has exactly one job, and appears only to do that job. Product code reaches color through the semantic token for the job (`--fc-*`), never a hue step (`--ds-accent-700`, `bg-red-400`) or a raw value. `scripts/lint-color.mjs` fails on violations, and the accent has no Tailwind hue utility at all.

| Hue | Its job | Use it for | Never for | Reach it through |
|---|---|---|---|---|
| Gray | Everything by default | Text, surfaces, borders, primary buttons, chart series 1 | Carrying meaning by itself | `--fc-text-*`, `--fc-surface-*`, `--fc-border-*` |
| **Accent** | **Highlights, and the brand** | The highlight designation and the score mark's intensity ramp; focus rings, text selection, checked and on controls, marketing surfaces | Links, buttons, chart series, status, decoration | `--fc-highlight-*`, `.fc-score`; `--fc-brand-*`, `--fc-focus-color`, `--fc-control-on` |
| Green | Go, and good for the reader | Go verdict, positive delta, success, live data | Money or wins because they look nice, "important" values | `--fc-signal-go-*`, `--fc-delta-positive`, `--fc-status-success-*` |
| Amber | Wait, and caution | Wait verdict, warnings, stale data | Highlighting, emphasis, a chart series | `--fc-signal-wait-*`, `--fc-status-warning-*` |
| Red | Stop, and bad for the reader | Stop verdict, negative delta, errors, failed data, destructive actions | Decoration, urgency, "hot" items | `--fc-signal-stop-*`, `--fc-delta-negative`, `--fc-status-error-*` |
| Blue | Information | Links, info notes, recent data, chart series 2 | Verdicts, success | `--fc-text-link`, `--fc-status-info-*` |
| Teal, pink | Chart series only | Series 3 and 4 when direct labels and grays are not enough | Any UI element | `--fc-chart-3`, `--fc-chart-4` |
| Purple | None | Nothing: the default accent is built from it, and a custom accent replaces it | Anything | Not reachable |

- **The accent is the project's.** `brand/brand.json` names one brand color; the build turns it into the accent scale on fixed lightness steps, so contrast holds for any hue. The default is violet, the one hue with no other job.
- **A brand color never becomes a status.** When the brand color sits near red, amber or green, or near gray, it is kept for identity only (text selection, marketing surfaces, dot illustrations), and focus, checked controls and highlights use blue. Green, amber, red and blue never follow the brand.
- **Color is never the only cue.** Verdict: dot plus word. Delta: sign plus arrow plus color. Score: number plus accent intensity. Freshness: dot plus relative time.
- **Charts:** monochrome first. A chart that encodes verdicts or highlights uses the signal or highlight tokens, because that is their job.
- **Badges:** a badge's hue follows this table. An accent badge means a highlight.
- **Exceptions** need a reviewed reason on the same line: `facet-allow-color: <reason>`.

## Semantic language `[F]`

Four encodings cover most of what a data product has to say. They are fixed; the words are the product's own.

| Meaning | Encoding | Tokens |
|---|---|---|
| Verdict: go / wait / stop / unchecked | Dot + word (`.fc-signal`), for example "On track", "Watch", "At risk" | `--fc-signal-{go,wait,stop,none}-{fg,solid,bg}` |
| A set of checks | Fixed-order dot strip; hollow ring for unknown (`.fc-signal-strip`) | same |
| Delta: a signed gap against a baseline (target, forecast) | Sign + arrow + green or red, tabular (`.fc-delta`) | `--fc-delta-*` |
| Score: one 0 to 100 number, no tiers | The number + accent intensity rising with it (`.fc-score`); a void score is hollow, dashed and gray | `--fc-highlight-*` |
| Highlight: what the product surfaces | The accent | `--fc-highlight-*` |
| Data freshness | Status dot + relative time (`.fc-status`) | `--fc-freshness-*` |
| Charts | Monochrome first; blue, teal, pink only when series must be told apart (never verdict hues or the accent) | `--fc-chart-1..6`, `--fc-chart-muted` |

Why one hue for highlights and the brand: the accent marks what the product finds (highlights) and what the reader does (focus, selection, their choices), so every interaction carries the brand. Highlights stay distinct because they always carry the score mark and its number. Why a single hue for the score: a score is a ranking, and a ranking should read as more or less of one thing, not as unrelated categories.

## Settled decisions

Where a rank 1 source and a Facet rule disagreed, these are the calls.

| Topic | Rule |
|---|---|
| Icon tiles | Allowed wherever one speeds recognition: empty states, list and connection rows, entity leads, integrations. Neutral only (`.fc-icon-tile`), one per item, never decorative or colored |
| Times | Clock and calendar times are mono ("11:00 AM", "Today 6:05 PM", "Oct 31", log times, clock-time axes). Relative times are words and stay sans ("4m ago", "in 5m", "12h ago"), marked `data-relative`. Set in base.css. Paired, the clock time leads in primary and the relative time or detail sits under it in secondary (schedule runs, table time cells) |
| Legends | Multi-series charts default to a legend that carries each series' total (`.fc-legend`). Single-series charts use a direct label |
| Marketing moments | Onboarding, period openings, explainers and recaps may use `data-surface="marketing"`: display type, roomier spacing, pill buttons and one animated field per view (`patterns/surfaces.md`). Hue decoration and gradient text stay banned |
| Brand accent | One accent per product through `--fc-brand-*`, generated from `brand/brand.json`. Focus, text selection, native `accent-color`, and checked or on controls (toggle, checkbox, choicebox, menu checks) all read it, so one color rebrands every interaction. Primary buttons, tabs, nav and links stay neutral |
| Header help | Data-rich tables put a tip on every derived or jargon column header so headers stay short (`components/table.md`) |
| Failures | Say whose problem it is. Yours to fix: red "Failed", "Couldn't ..." and the action that starts the fix. Out of your hands: amber "Source down", who owns it, what happens next and how old the data is, never a fix button. Empty or failed charts show a blurred gray ghost of their shape (`patterns/failures.md`) |
| Durations and relative times | One source, `js/time.mjs`. Values use compact units, no space, at most two units: "4.1s", "in 5m", "3h ago", "in 1d 6h". Sentences spell units out: "Every 5 minutes", "Timed out after 30 seconds". A bare duration always gets its context word ("Ran 4.1s") |
| Activity lines | Color the outcome, not the line: one token per line (money or the failure verb) in delta green, red or amber, always with its sign or word. Routine actions stay gray (`components/feed.md`) |
| Deep links | Feed and log lines link their subject to the exact record elsewhere; the whole row is the target, the in-app arrow marks it, and the record glows in the brand tint on arrival (`components/feed.md`) |
| Link arrows | Chevrons advance you within the space you are in (expand, select, drill a menu level). Arrows take you out of it: → to another place in the app (same tab), ↗ out of the app (new tab) (`components/link-action.md`) |
| Contextual helpers | Helper text shows only while it applies. A helper that explains one option appears only while that option is chosen (`data-helper`, `js/forms.mjs`) |
| Confirmation | Prefer undo to confirm. None if the opposite action reverses it; an undo toast for one restorable item; a dialog (Cancel focused, verb and object on the button) when it cannot be undone or reaches outside the app; typed confirmation to delete data (`foundations/content.md`) |
| Heading tiers | Page sections use heading 32, their subsections heading 20, and rows and cards inside them 14 to 16, so each tier is unmistakably above the next |
| Metric columns | One shape per column: bare numbers, word units in the label, changes as percent with the exact change in a helper (`components/metric-row.md`) |
| Dotted underline | Always means a helper sits behind the text, opening on hover, keyboard focus or tap (`.fc-has-tip`, `js/tips.mjs`). Used instead of info icons, and never for anything else |
| Change values | Color says whether a change is good, the arrow says which way it moved (`.fc-delta[data-polarity]`). A delta against a target keeps direction coloring when a positive gap is always good |

## Deliberate deviations from the vercel.com reference

Each is a conscious Facet call, recorded so nobody "fixes" it back by accident.

| The reference does | Facet does | Why |
|---|---|---|
| "Success" renders blue (Note, Progress, Toggle on-state) | Status success is green; toggles use the brand accent | Green already means "go" in the verdict language; a blue success would contradict it on the same screen |
| StatusDot is only for deployment lifecycle | StatusDot also shows data freshness, mapped to current `--ds-*` scales | Freshness is the dashboard's version of deploy state; the legacy dot hex values are retired |
| Unknown values render as an em dash | En dash `–` with `aria-label="Unknown"` in numeric cells, the word "Unknown" where it fits | House rule: no em dashes in any output |
| Table has one density | Adds `data-density="compact"` (32px rows) for long ledgers | Boards can run past 100 rows |
| Icons from the reference icon package | Lucide at 16px, stroke from `--fc-icon-stroke` (1.5, or 2 with defined strokes) | The reference icon package is not public |
| Radii and shadows are fixed values | Radii and shadows are role tokens the brand layer sets (corners, depth) | A project should be able to look like itself without touching components |
| Rejects glows and decorative looping motion | One exception: the score mark. Glow strength follows the score; a row delay cascades it up ranked tables, so the top score lands last; a void score never moves; reduced motion stops it all | Motion is part of the rank encoding: the cascade says where a record sits |

## Content

Full lessons in [`foundations/content.md`](foundations/content.md). The short version:

- **Say it once.** A tab, heading, label, column header, icon or control has already told the reader something; never restate it. Before every line, ask what the reader already knows from what sits above and around it.
- **Earn every line.** If a line disappeared, would the reader understand less? If not, cut it. Keep disclosures, caveats that change a reading, first-use definitions, and the why on a Don't.
- **Marking right and wrong.** Use `.fc-guide` for every Do and Don't. It stays neutral unless the rule is a hard rule (`data-critical`).
- **Headlines that last.** Simple, objective, purpose-naming headlines. Specifics live in the content, so a headline never goes stale when the data changes.
- **House style.** Sentence case. No colons in titles. No em dashes. No hedges. Notes are one sentence in active voice.

## Reject on sight

Decorative gradients, glows, glass, textures or grid backgrounds. Gradient text. Cards inside cards. Decorative or colored icon tiles. Tiny gray prose used to fit density. Legends that only repeat series names. Color without meaning. A badge for ordinary metadata. Charts that restate a table at equal weight. Pulsing "live" indicators. Arbitrary font sizes or weights.

## How to use it

- **New project:** follow `START-HERE.md` (install, brand setup, wiring).
- **Plain HTML or a single-file page:** link `css/facet.css` (or inline it), then use the classes. The specimen has three guides: `preview/index.html` (Design), `preview/screens.html` (Screens) and `preview/content.html` (Content).
- **Next.js + Tailwind v4:** `@import "tailwindcss"; @import "facet-kit/css/tailwind.css";` then `base.css`, `typography.css`, `components.css` and the layers you need (`data.css`, `charts.css`, `lists.css`, `forms.css`, `shell.css`, `settings.css`, `surfaces.css`, `flows.css`). `facet.css` imports all of them.
- **Hero field:** `import { autoMount } from 'facet-kit/js/field.mjs'` mounts every `canvas[data-fc-field]`.
- **Tips:** `import { mountTips } from 'facet-kit/js/tips.mjs'` wires every `.fc-has-tip` for hover, focus and tap.
- **Moments:** `import { createStage } from 'facet-kit/js/dots.mjs'` draws the dot moments; `js/undo.mjs` counts an Undo toast down. Rules, API and how to add one: `patterns/moments.md`.
- **Canvas or SVG charts:** `import { token } from 'facet-kit/js/tokens.mjs'` for resolved hex values per theme.
- **Checking color use:** `node scripts/lint-color.mjs <app dirs>` (fails on raw colors and hue steps).
- **Changing the look:** `node scripts/brand.mjs` (`brand/README.md`). **Changing the system:** edit `tokens/*.json`, run `node scripts/build.mjs`, and record it in `CHANGELOG.md`.
