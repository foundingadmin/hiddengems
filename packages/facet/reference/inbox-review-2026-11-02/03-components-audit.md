# Facet components audit against the reference captures

Scope: `packages/facet/css/components.css` (read in full) and the matching specs in `packages/facet/components/*.md`, compared with the full-page captures in `inbox/Vercel Design System Tools/` (all captured in dark mode) and `vercel time card.png`. Measurements come from the PDFs' embedded 4092px page images, which render the docs at 1.8 image px per CSS px (calibrated on the 40px table row and 36px header). Where a capture does not show something, this report says so. Cross-checks against `reference/geist-component-measurements-*.json` are noted as "JSON".

Legend for fixes: **[measured]** = read from capture or JSON, **[guess]** = reasonable but unverified, verify in a browser before shipping.

---

## Top 10 fixes

| # | Fix | Component | Priority |
|---|---|---|---|
| 1 | Add the slate table anatomy Facet is missing: sortable header button with direction indicator, selection column, row actions slot, bordered variant, sticky first column, and fix the sticky header (it cannot stick inside `.fc-table-wrap` as written). Also align stripe parity (odd rows) and add the 12px header/body spacer. | Table | P0 |
| 2 | Toggle thumb is near black in dark mode (`--ds-background-100` is #0a0a0a there). Reference thumb is `gray-1000` at 84% with a 1px white-alpha ring. Disabled toggles must drop the blue and the thumb shadow, not just fade to 50%. | Toggle | P0 |
| 3 | Write CSS for Filter Params. Nothing exists. Needs the 32px pill "Add filter" trigger, applied chip, dashed suggestion chip, and readonly chip with info icon. | Filter params | P0 |
| 4 | Rebuild the gauge to match: 100-unit viewBox, stroke 10 (15 at tiny), track is the complementary arc with a gap at both ends in `--ds-gray-alpha-400`, four sizes (20/32/64/128), size-scaled value label, tiny hides the value, indeterminate state. | Gauge | P0 |
| 5 | Write CSS for Pie Gauge (`.fc-pie`). Nothing exists, and the spec makes it the Score column glyph. | Pie gauge | P0 |
| 6 | Correct badge geometry to the measured values (md padding 12, sm padding 8, icons 12/14/16, gaps 4/5/6, sm tracking) and add the `pill` link variant the reference uses for clickable chips. | Badge | P0 |
| 7 | Write CSS for Sheet (inset floating panel, 12px margin, 16px radius, 512px, 24px header/footer padding, footer pinned with `margin-top: auto`). | Sheet | P0 |
| 8 | Write CSS for Relative Time Card popover (relative header, UTC and local rows with mono zone chips and right-aligned mono times, stem). | Relative time card | P1 |
| 9 | Add progress `data-type` fills, `stops` markers, a `--value` driven div version and arbitrary heights; map Facet success to green per hue allocation (reference uses blue). | Progress | P1 |
| 10 | Write CSS for Entity / Entity list and Middle Truncate, and add status dot pulse for non-terminal states. | Entity, middle truncate, status dot | P1 |

Cross-cutting issues found while reading `components.css`:

- **Raw hex in components.css** (`#fff`, `#000`, `#0a0a0a` on lines 58, 59, 75, 95) breaks the house rule "raw hex or px values never". Replace with a contrast token, e.g. `--fc-text-on-solid` (white) and `--fc-text-on-amber` (near black), defined in `tokens/*.json`. P1.
- **Hue allocation conflict in Badge**: `components.css` ships `teal` and `pink` badge variants, but DESIGN.md says teal and pink are "chart series only, never UI elements". Either drop them from Facet or document them as `facet-allow-color` exceptions. P2.
- **No CSS at all** for: Pie gauge, Filter params, Middle truncate, Relative time card, Entity, Sheet, Calendar, Breadcrumbs, Project banner, Checkbox, Spinner. Specs exist for most of them, so app code would currently hand-roll these. This is the biggest gap in the audit.

---

## Table

Capture: basic, striped, bordered, interactive, full featured (colgroup + footer), virtualized (ShowMore fade). Dark mode only.

### What Facet gets right
- Header 36px, 14px/500 `gray-900`, 1px `gray-400` rule under the header, cell padding 8px horizontal. Header text sits optically centered (Facet's `vertical-align: bottom` + 8px bottom padding gives the same result at 36px).
- Body rows 40px, 14px `gray-900`, 10px/8px padding.
- Rounded 6px row ends so stripes read as pills. Matches the striped capture exactly.
- Footer: 1px `gray-400` top rule, 500 weight, `gray-1000` text ("Subtotal ... $24,000.00").
- `tabular-nums` and right-aligned numeric columns (the full-featured "Charge" column).

### Discrepancies
1. **Stripe parity**: reference stripes rows 1, 3, 5 (odd). Facet stripes `:nth-child(even)`. Visible in both the striped and full-featured captures. (The virtualized demo shows even rows striped, likely because of the spacer body; the documented examples are odd.)
2. **Header to body spacer**: reference has a 12px gap between the header rule and the first row (measured 22 image px). Facet has none, so the first stripe touches the rule.
3. **Body cell alignment**: spec says middle-aligned; Facet uses `vertical-align: baseline`. Harmless for text-only rows, but a 16px pie gauge or 24px badge in a cell will push baselines around. Use `middle`.
4. **Last column right-aligned by default** in every capture (header and cells). Facet requires `data-align="numeric"` per cell. Keep Facet's explicit approach but add a table-level opt-in.
5. **Bordered variant missing**: capture shows 1px row separators spanning the full table width, none after the last row.
6. **Sticky header bug (Facet only)**: `.fc-table-wrap` sets `overflow-x: auto`, which makes the wrap a scroll container on both axes. `thead th { position: sticky; top: 0 }` then sticks to the wrap, which never scrolls vertically, so the header scrolls away with the page. It only works if the wrap gets a max height.
7. **Hover / selection** are not visible in the static capture. Facet's `gray-100` hover follows the spec; `aria-selected` `gray-200` is a Facet addition (fine, document it).

### Missing anatomy (not shown in the captures; needed by Hidden Gems)
The captures show no sorting indicators, row actions, selection column, sticky columns or empty state. The best-practices text does say sortable headers are buttons with a decorative arrow that announce the next state. Everything below is therefore a Facet addition and should be labelled `[F]`.

### Fix
```css
/* Stripe parity and spacer [measured] */
.fc-table[data-striped] tbody tr:nth-child(odd) { background: var(--ds-background-200); }
.fc-table[data-striped] tbody tr:nth-child(even) { background: none; }
/* Reference markup uses an aria-hidden spacer body. Mirror it:
   <tbody class="fc-table-spacer" aria-hidden="true"><tr><td colspan="99"></td></tr></tbody> */
.fc-table .fc-table-spacer td { height: 12px; padding: 0; }
.fc-table td, .fc-table tbody th { vertical-align: middle; }
.fc-table[data-last="end"] tr > :last-child { text-align: right; }

/* Bordered [measured] */
.fc-table[data-bordered] tbody:not(.fc-table-spacer) tr:not(:last-child) > * {
  border-bottom: 1px solid var(--ds-gray-400);
  border-radius: 0;
}

/* Sticky header: give the wrap its own vertical scroll [F] */
.fc-table-wrap[data-sticky] { max-height: var(--fc-table-max-h, 70vh); overflow: auto; }

/* Sortable header [F, follows the reference rule "header is a button, arrow decorative"] */
.fc-th-sort {
  all: unset;
  display: inline-flex; align-items: center; gap: 4px;
  color: inherit; font: inherit; cursor: pointer; border-radius: var(--fc-radius-xs);
}
.fc-th-sort:hover { color: var(--ds-gray-1000); }
.fc-th-sort:focus-visible { box-shadow: var(--ds-focus-ring); }
.fc-th-sort::after {
  content: ""; width: 12px; height: 12px; background: currentColor; opacity: 0;
  -webkit-mask: var(--fc-icon-chevron-down) center / contain no-repeat;
          mask: var(--fc-icon-chevron-down) center / contain no-repeat;
}
th[aria-sort="ascending"]  .fc-th-sort, th[aria-sort="descending"] .fc-th-sort { color: var(--ds-gray-1000); }
th[aria-sort="ascending"]  .fc-th-sort::after { opacity: 1; transform: rotate(180deg); }
th[aria-sort="descending"] .fc-th-sort::after { opacity: 1; }
th[data-align="numeric"] .fc-th-sort { flex-direction: row-reverse; } /* arrow on the inner side */

/* Selection column [F] */
.fc-table .fc-cell-select { width: 16px; padding-right: 0; }

/* Row actions: always present for touch and keyboard, revealed on hover for fine pointers [F] */
.fc-table .fc-row-actions { display: inline-flex; gap: 4px; justify-content: flex-end; }
@media (hover: hover) and (pointer: fine) {
  .fc-table .fc-row-actions { opacity: 0; transition: opacity 100ms ease; }
  .fc-table tr:hover .fc-row-actions, .fc-table tr:focus-within .fc-row-actions { opacity: 1; }
}

/* Sticky first column [F]. Stripes must live on cells so the sticky cell can repaint them. */
.fc-table[data-sticky-first] tr > :first-child { position: sticky; left: 0; z-index: 1; background: var(--fc-surface-canvas); }
.fc-table[data-sticky-first][data-striped] tbody tr:nth-child(odd) > * { background: var(--ds-background-200); }
```
Also needed: `--fc-icon-chevron-down` mask token (or inline SVG), and `.fc-checkbox` (see Missing components). Priority **P0** for sort, sticky fix, stripe/spacer; **P1** for bordered, row actions, sticky column.

---

## Badge

Capture: 9 solid + 8 subtle variants, trial, turbo, sizes, with icons (lg/md/sm solid then sm/md/lg subtle), pill links.

### Right
- Pill radius, 500 weight, `tabular-nums`, nowrap.
- Per-theme solid fills via `--fc-badge-*` match JSON exactly (light gray `rgb(77,77,77)` = gray-900, blue `rgb(0,98,209)` = blue-800, amber with black text, etc.).
- Subtle form (`-200` bg, `-900` text) reads correctly in the dark capture: dark tinted fill, bright hue text.
- Heights 20/24/32.

### Discrepancies [measured, JSON confirms]
| Size | Reference padding-x | Facet | Reference icon | Facet | Reference gap | Facet | Font |
|---|---|---|---|---|---|---|---|
| sm | 8px | 6px | 12px | 11px | 4px | 4px | 11px/20px, spec adds +0.2px tracking (Facet has none) |
| md | 12px | 10px | 14px | 12px | 5px | 4px | 12px/24px (Facet 16px line-height; harmless at fixed height) |
| lg | 12px | 12px | 16px | 14px | 6px | 4px | 14px/20px |

- Reference renders text with `text-transform: capitalize`. Facet does not. Content rules already require Title Case, so skip it (capitalize mangles "iOS"-style words). Note as a deliberate deviation.
- `inverted` dark: reference bg `rgb(237,237,237)`, fg `rgb(26,26,26)`; Facet uses `gray-1000` / `gray-100`, which resolves to the same in dark. Fine.

### Missing
- **`pill` variant**: a link styled as a badge. Capture: background-100 (black in dark), 1px `gray-alpha-400` ring, `gray-1000` text, optional leading 16px logo, three sizes. This is the reference's answer for clickable filter chips, which Hidden Gems needs.
- `trial` gradient and `turbo` are brand-specific; skip.

### Fix
```css
.fc-badge { gap: 5px; padding: 0 12px; }
.fc-badge svg { width: 14px; height: 14px; }
.fc-badge[data-size="sm"] { gap: 4px; padding: 0 8px; letter-spacing: 0.2px; }
.fc-badge[data-size="sm"] svg { width: 12px; height: 12px; }
.fc-badge[data-size="lg"] { gap: 6px; }
.fc-badge[data-size="lg"] svg { width: 16px; height: 16px; }

/* Pill: an <a> or <button> with badge geometry [measured shape, hover is a guess] */
.fc-badge[data-variant="pill"] {
  --_bg: var(--ds-background-100); --_fg: var(--ds-gray-1000);
  box-shadow: 0 0 0 1px var(--ds-gray-alpha-400);
  text-decoration: none;
}
.fc-badge[data-variant="pill"]:hover { --_bg: var(--ds-gray-100); }          /* guess */
.fc-badge[data-variant="pill"]:focus-visible { box-shadow: var(--ds-focus-ring); }
```
Priority **P0** (badge is in every slate row; the confidence chip at sm is visibly too tight).

---

## Status dot

Capture: default (5 dots) and label (Queued, Building, Error, Ready, Canceled).

### Right
- 10px circle, 8px gap to label (measured 16 image px), 14px regular label in `gray-1000`.
- Gray for queued/canceled (`#333`-ish in dark), which Facet's `gray-400` matches.

### Discrepancies
- Reference ready is cyan `#50e3c2`, building `#f5a623`, error `#e00` (legacy vars, JSON confirms). Facet maps to its freshness tokens (green/amber/red). That is a deliberate Hidden Gems mapping and follows hue allocation; keep it, but record it as a deviation in `status-dot.md`.
- Animation for queued/building cannot be seen in a static capture; spec says it exists. Facet has none.

### Fix
```css
@keyframes fc-status-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }   /* guess at the motion */
.fc-status-dot[data-state="building"], .fc-status-dot[data-state="queued"], .fc-status-dot[data-state="updating"] {
  animation: fc-status-pulse 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) { .fc-status-dot { animation: none; } }
```
Priority **P1**.

---

## Gauge

Capture: default (4 sizes, value 50, amber), label (showValue at all sizes, 80 and 100), default color scale (14 red, 34 amber, 68 green), custom 11-step pink range, custom secondary color, arc priority equal (red/blue, value 50), indeterminate (4 sizes).

### Right
- Value arc starts at 12 o'clock and runs clockwise (Facet rotates -90deg).
- Round line caps on the value arc.
- Threshold coloring idea (Facet maps to go/wait/stop tokens).

### Discrepancies [measured]
1. **Track is not a full ring.** In every capture the track is the complementary arc only, with a visible gap at both junctions, and both arcs have round caps. Facet draws a full track circle under the value arc, so there is no gap.
2. **Track color**: JSON shows `rgba(0,0,0,.08)` light and `rgba(255,255,255,.14)` dark (`--ds-gray-alpha-400`). Facet uses `--ds-gray-200`, which is noticeably fainter in dark.
3. **Geometry**: reference uses a 100-unit viewBox with stroke 10 (tiny uses 15, JSON). Facet uses 36 units / 3.5 stroke (9.7%), close for small and up but too thin at tiny.
4. **Sizes**: reference tiny 20, small 32, medium 64, large 128 (measured 36/58/115/230 image px). Facet only has one size token defaulting to 32.
5. **Value label**: tiny with `showValue` shows no number. Label scales with size. Estimated from glyph heights: small about 11px, medium about 20px, large about 32px, regular to medium weight, `gray-1000` [estimate; the spec's "text-copy-14 measured" does not match the medium capture]. Facet fixes it at 12px/500 for all sizes.
6. **Threshold colors**: reference low = red-800 (JSON `rgb(218,47,53)`), mid = amber-700, high = green-700 (`rgb(69,165,87)`). Facet stop uses red-700. Minor.

### Missing
- Indeterminate: a short gray arc (about a quarter turn, at the 12 to 3 o'clock position in the capture, presumably rotating) with an activity (pulse) icon centered in `gray-900`. Facet has none.
- Equal arc priority: both arcs same weight and color-coded (blue and red in demo). In Hidden Gems this is the quant vs qualitative split.
- Custom secondary color (track takes a tint such as blue-300).

### Fix
```html
<span class="fc-gauge-wrap" data-size="medium" style="--value:72" role="progressbar" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100">
  <svg class="fc-gauge" viewBox="0 0 100 100" aria-hidden="true">
    <circle class="fc-gauge-track" cx="50" cy="50" r="45" pathLength="100"/>
    <circle class="fc-gauge-value" cx="50" cy="50" r="45" pathLength="100"/>
  </svg>
  <span class="fc-gauge-label">72</span>
</span>
```
```css
.fc-gauge-wrap { --_s: 64px; --_gap: 5; position: relative; display: inline-grid; place-items: center; width: var(--_s); height: var(--_s); }
.fc-gauge-wrap[data-size="tiny"]   { --_s: 20px; }
.fc-gauge-wrap[data-size="small"]  { --_s: 32px; }
.fc-gauge-wrap[data-size="large"]  { --_s: 128px; }
.fc-gauge { width: 100%; height: 100%; transform: rotate(-90deg); }
.fc-gauge circle { fill: none; stroke-width: 10; stroke-linecap: round; }
.fc-gauge-wrap[data-size="tiny"] .fc-gauge circle { stroke-width: 15; }
.fc-gauge-track { stroke: var(--_track, var(--ds-gray-alpha-400));
  /* complementary arc with a gap each side. calc() inside stroke-dasharray: verify in Safari [guess] */
  stroke-dasharray: max(0, calc(100 - var(--value) - 2 * var(--_gap))) 100;
  stroke-dashoffset: calc(-1 * (var(--value) + var(--_gap))); }
.fc-gauge-value { stroke: var(--_c, var(--ds-gray-1000)); stroke-dasharray: var(--value) 100;
  transition: stroke-dasharray 300ms var(--fc-ease-swift); }
.fc-gauge-label { position: absolute; color: var(--ds-gray-1000); font-variant-numeric: tabular-nums; font-weight: 500; }
.fc-gauge-wrap[data-size="tiny"]   .fc-gauge-label { display: none; }
.fc-gauge-wrap[data-size="small"]  .fc-gauge-label { font-size: 11px; line-height: 1; }  /* estimate */
.fc-gauge-wrap[data-size="medium"] .fc-gauge-label { font-size: 20px; line-height: 1; }  /* estimate */
.fc-gauge-wrap[data-size="large"]  .fc-gauge-label { font-size: 32px; line-height: 1; letter-spacing: -0.02em; } /* estimate */
.fc-gauge-wrap[data-signal="go"]   { --_c: var(--fc-signal-go-solid); }
.fc-gauge-wrap[data-signal="wait"] { --_c: var(--fc-signal-wait-solid); }
.fc-gauge-wrap[data-signal="stop"] { --_c: var(--fc-signal-stop-solid); }
/* Indeterminate [guess at motion] */
.fc-gauge-wrap[data-state="indeterminate"] .fc-gauge-value { display: none; }
.fc-gauge-wrap[data-state="indeterminate"] .fc-gauge-track { stroke-dasharray: 25 100; stroke-dashoffset: 0; animation: fc-spin 1s linear infinite; transform-origin: 50% 50%; }
@keyframes fc-spin { to { transform: rotate(360deg); } }
```
Edge cases to handle in the wrapper: value 0 (render track as a full ring, hide the value circle so the round cap does not leave a dot) and value 100 (hide the track). Priority **P0** (gem score on the sheet header).

---

## Pie gauge

Capture: 0/25/50/75/100%, sizes 13/16/24/32px, colors inherited / blue / amber / red.

### What it looks like [measured]
- Outer ring (thin stroke) plus an inner wedge filling clockwise from 12 o'clock. At 100% the inner disc is solid with a dark gap ring between it and the outer ring; at 0% only the ring.
- Proportions are constant across sizes: wedge diameter is 50% of the box (JSON: 8/16, 12/24, 16/32), ring centerline at about 87% (JSON ring path 28/32, 21/24). At 16px the ring reads about 1.5px thick with about 2px of gap.
- Inherits `currentColor` ("Inherited" demo is gray because its text is `gray-900`); colored versions use the 900 step. Label sits 8px away (`gap-2`), `text-label-14`.

### Facet
No CSS exists. Spec only.

### Fix
```css
.fc-pie {
  --_s: 16px;
  position: relative; display: inline-block; flex: none;
  width: var(--_s); height: var(--_s); border-radius: 50%;
  box-shadow: inset 0 0 0 calc(var(--_s) * .1) currentColor;   /* ring [measured ratio, approx] */
  vertical-align: -0.125em;
}
.fc-pie::after {
  content: ""; position: absolute; inset: 25%; border-radius: 50%;           /* wedge = 50% of box [measured] */
  background: conic-gradient(currentColor calc(var(--value, 0) * 1%), transparent 0);
}
.fc-pie[data-size="13"] { --_s: 13px; }
.fc-pie[data-size="24"] { --_s: 24px; }
.fc-pie[data-size="32"] { --_s: 32px; }
.fc-pie[data-signal="go"]   { color: var(--fc-signal-go-fg); }
.fc-pie[data-signal="wait"] { color: var(--fc-signal-wait-fg); }
.fc-pie[data-signal="stop"] { color: var(--fc-signal-stop-fg); }
```
Usage: `<span class="fc-pie" style="--value:72" aria-hidden="true"></span> 72`. Priority **P0**.

---

## Progress

Capture: default (value 30), custom max, dynamic colors (threshold map, amber at 50), themed (success blue 100, error red 10, warning amber 40, secondary gray 70), with stops, widths (100/200/300/50%/100%), heights (4/10/50/200).

### Right
- 10px default height, 6px radius, `gray-200` track, `gray-1000` default fill (white in dark). Facet matches.
- Fill end is rounded; at 50px and 200px heights the radius stays 6px (not a pill), which Facet's fixed `--fc-radius-sm` reproduces.

### Discrepancies / missing
- `type` fills missing: success (reference blue-700), error red-700, warning amber-700, secondary gray-700.
- **Stops**: 1px light vertical ticks crossing both fill and track at each stop value, each with a tooltip. Missing.
- Threshold color map missing.
- Native `<progress>` styling cannot be token-switched cleanly per type in Firefox, and cannot render stops. A div version is easier.
- Hue allocation: Facet reserves blue for interaction/info, green for success. Facet should map `success` to green and document the deviation (the spec already notes "type=success renders blue").

### Fix
```css
.fc-meter { --_c: var(--ds-gray-1000); position: relative; height: var(--_h, 10px); border-radius: var(--fc-radius-sm); background: var(--ds-gray-200); overflow: hidden; }
.fc-meter > .fc-meter-fill { height: 100%; width: calc(var(--value, 0) * 1%); border-radius: inherit; background: var(--_c); transition: width 100ms ease-in, background-color 100ms ease-in; }
.fc-meter[data-type="success"]   { --_c: var(--fc-status-success-solid); } /* Facet deviation: reference is blue */
.fc-meter[data-type="error"]     { --_c: var(--fc-status-error-solid); }
.fc-meter[data-type="warning"]   { --_c: var(--fc-status-warning-solid); }
.fc-meter[data-type="secondary"] { --_c: var(--ds-gray-700); }
.fc-meter > .fc-meter-stop { position: absolute; top: 0; bottom: 0; left: calc(var(--at) * 1%); width: 1px; background: var(--ds-gray-alpha-500); } /* color is a guess; reads light gray in dark capture */
```
Priority **P1** (ingestion and model-run progress).

---

## Tabs

Capture: default, disabled set, disabled specific tab with tooltip, with icons, secondary.

### Right
- Primary: 14px, 14px/2px padding, 24px gap, `gray-900` inactive, `gray-1000` selected with 2px underline exactly as wide as the label, inset 1px bottom rule. Height 50px (JSON).
- Secondary: 32px pills, 12px padding, 6px radius, selected `gray-200`, no underline.

### Discrepancies / missing
- **Icons**: capture shows a 16px icon left of the label with about 8px gap; inactive icons take the text color (GitLab gray), brand icons keep their color. Facet `.fc-tab` is not flex, so icons misalign.
- **Focus ring** (spec) missing on `.fc-tab`.
- **Disabled**: whole set and per-tab disabled are not distinguishable at capture resolution for primary tabs. In secondary, the disabled "Bitbucket" tab shows a filled background with muted text, which is unusual; could be a hover artifact. Facet has no disabled style at all.
- **Count badge slot** (spec says counts go in a badge, never the title): no class.

### Fix
```css
.fc-tab { display: inline-flex; align-items: center; gap: 8px; }
.fc-tab svg { width: 16px; height: 16px; flex: none; }
.fc-tab:focus-visible { outline: none; box-shadow: var(--ds-focus-ring); border-radius: var(--fc-radius-xs); }
.fc-tab:disabled, .fc-tab[aria-disabled="true"] { color: var(--ds-gray-700); cursor: not-allowed; }
.fc-tab .fc-badge { height: 20px; padding: 0 6px; }   /* count slot, reuse sm badge, contrast low */
```
Priority **P1**.

---

## Toggle

Capture: default off/on, disabled off/on, sizes, custom color (amber/red with lock icons in the thumb), with label (label first and switch first, at default and large).

### Right
- Track sizes 28x14, 36x20, 40x24, 14px radius, off track `gray-400`, on track blue `rgb(0,112,243)`. Facet matches (`blue-700`, allowed by hue allocation: "toggles on").
- Thumb shadow stack in light mode.

### Discrepancies [measured, JSON confirms]
1. **Dark-mode thumb (bug)**: reference thumb is `rgba(237,237,237,.84)` with `1px solid rgba(255,255,255,.51)`. Facet uses `--ds-background-100`, which is `#0a0a0a` in dark, so the thumb nearly disappears on a dark `gray-400` track.
2. **Disabled**: reference removes the blue. Light disabled-on track `rgb(201,201,201)`, disabled-off track `gray-400`; dark disabled-off track `gray-200` with thumb `rgb(69,69,69)`, disabled-on track `gray-400` with thumb `rgb(135,135,135)`; thumb shadow removed. Facet's `opacity: .5` keeps a half-blue track and a half-transparent thumb.
3. Thumb sizes: JSON medium 17px and large 21px; Facet 16 and 20. Minor.
4. **Label**: 12px/18px, 500, `gray-900`, with about 8 to 12px gap, label before or after. Facet has no wrapper class.
5. **Track ring**: JSON shows a 1px `rgba(0,0,0,.1)` light / `rgba(255,255,255,.13)` dark border on the track. Facet has none.

### Missing
- Custom checked color (amber, red) and thumb icons. Hidden Gems needs neither (hue allocation), so skip.

### Fix
```css
.fc-toggle { box-shadow: inset 0 0 0 1px var(--ds-gray-alpha-400); }
.fc-toggle::after { background: var(--fc-toggle-thumb, var(--ds-background-100)); }
/* tokens/*.json: --fc-toggle-thumb: background-100 in light, color-mix(in srgb, var(--ds-gray-1000) 84%, transparent) in dark */
.fc-toggle:disabled { opacity: 1; background: var(--ds-gray-200); cursor: not-allowed; }
.fc-toggle:disabled:checked { background: var(--ds-gray-500); }
.fc-toggle:disabled::after { box-shadow: none; background: var(--ds-gray-600); }
.fc-toggle:disabled:checked::after { background: var(--ds-gray-800); }
.fc-toggle[data-size="medium"] { --_t: 17px; }
.fc-toggle[data-size="large"]  { --_t: 21px; }
.fc-toggle-field { display: inline-flex; align-items: center; gap: 8px; font: 500 12px/18px var(--fc-font-sans); color: var(--ds-gray-900); }
```
(Disabled gray steps are an approximation of the measured RGB values; verify per theme.) Priority **P0** for the dark thumb, **P1** for the rest.

---

## Filter params

Capture: default (Add filter only), suggestions (Environment Production, Status Error), AI (Add filter on a filled background), readonly (Team Acme with info icon). No capture shows an applied filter or the open menu.

### What the reference shows [measured]
- "Add filter" trigger: 32px tall pill (JSON radius 84.8px, width 110), 1px `gray-alpha-400` ring, transparent/background-100 fill, leading 16px filter icon (three stepped lines) in `gray-900`, label 14px `gray-1000`.
- AI variant: same pill on a filled `gray-100`-like background.
- Suggestion chip: same 32px pill, **dashed** 1px border, key in `gray-900` regular, value in `gray-900` medium (the whole chip reads muted, signalling "not applied").
- Readonly chip: solid ring, key `gray-900`, value `gray-1000` medium, trailing 16px info icon (`gray-900`) that opens the note.
- 8px gap between chips.

### Facet
No CSS. Spec only.

### Fix
```css
.fc-filter-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.fc-filter-chip {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
  border: 0; border-radius: var(--fc-radius-full);
  background: var(--ds-background-100); box-shadow: 0 0 0 1px var(--ds-gray-alpha-400);
  font: 400 14px/20px var(--fc-font-sans); color: var(--ds-gray-1000); white-space: nowrap;
}
.fc-filter-chip svg { width: 16px; height: 16px; color: var(--ds-gray-900); flex: none; }
.fc-filter-chip:hover { background: var(--ds-gray-100); }                       /* guess */
.fc-filter-chip:focus-visible { box-shadow: var(--ds-focus-ring); }
.fc-filter-key   { color: var(--ds-gray-900); }
.fc-filter-value { font-weight: 500; color: var(--ds-gray-1000); }
.fc-filter-chip[data-state="suggested"] { box-shadow: none; border: 1px dashed var(--ds-gray-alpha-400); }
.fc-filter-chip[data-state="suggested"] .fc-filter-value { color: var(--ds-gray-900); }
.fc-filter-chip[data-state="readonly"] { cursor: default; }
.fc-filter-chip[data-variant="ai"] { background: var(--ds-gray-100); }
/* Applied chip with remove control [F, not shown in capture] */
.fc-filter-chip > .fc-filter-remove { margin-right: -6px; width: 20px; height: 20px; border-radius: 50%; display: inline-grid; place-items: center; color: var(--ds-gray-900); }
.fc-filter-chip > .fc-filter-remove:hover { background: var(--ds-gray-alpha-200); color: var(--ds-gray-1000); }
```
Priority **P0** (main slate filter bar).

---

## Middle truncate

Capture: 11 examples (branch, preview URL, deployment ID, env key mono, mono no ligatures, SHA, file path, custom domain, model name, tight width, fits as-is) in bordered rows, a width slider and Animate toggle. **The capture was taken at 600px, so no string is truncated**; the ellipsis rendering cannot be verified from it.

### Right / observed
- Row frame: 1px `gray-alpha-400` border, 6px radius, label column `text-label-13 gray-700`-ish, values 14px `gray-1000`, mono values with ligatures off.

### Facet
No CSS. A pure-CSS approximation works when the split point is chosen in markup:

```css
.fc-mtrunc { display: flex; min-width: 0; max-width: 100%; white-space: nowrap; }
.fc-mtrunc > .fc-mtrunc-head { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; } /* single U+2026 glyph */
.fc-mtrunc > .fc-mtrunc-tail { flex: 0 0 auto; }
.fc-mtrunc.fc-mono { font-feature-settings: "liga" 0, "calt" 0; }
```
`<span class="fc-mtrunc" title="Patrick Mahomes Over 274.5 Passing Yards (incl. OT)"><span class="fc-mtrunc-head">Patrick Mahomes Over 274.5 Passing Ya</span><span class="fc-mtrunc-tail">rds (incl. OT)</span></span>`. The DOM keeps the full string, so copy and screen readers get it. Lock the column width with `<colgroup>` so the cut point does not jitter. Priority **P1**.

---

## Relative time card

Capture: `vercel time card.png`, popover open over a "Hover me" button.

### What it shows
- Popover on `background-100` with 1px `gray-alpha-400` ring, about 8px radius, a downward stem centered on the trigger, roughly 270px wide, about 12px padding (estimated from a browser screenshot, not a measurement).
- Header line "8 seconds ago" in `gray-900`, about 13px.
- Two rows: a zone chip (`UTC`, `MST`) in mono on a `gray-100` fill with small radius and `gray-900` text; date (`November 2, 2026`) in `gray-1000` about 13px; time (`04:37:58 AM`) in mono `gray-900`, right-aligned, tabular.
- The tooltip material doc says tooltips are the only floating element with a triangular stem, yet this card has one; treat it as tooltip material.

### Facet
No CSS.

### Fix
```css
.fc-timecard { position: absolute; z-index: var(--fc-z-tooltip); min-width: 260px; padding: 10px 12px 12px;
  border-radius: var(--fc-radius-md); background: var(--ds-background-100); box-shadow: var(--ds-shadow-tooltip); }
.fc-timecard-rel { margin-bottom: 8px; font: 400 13px/16px var(--fc-font-sans); color: var(--ds-gray-900); }
.fc-timecard-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; font: 400 13px/20px var(--fc-font-sans); color: var(--ds-gray-1000); }
.fc-timecard-row + .fc-timecard-row { margin-top: 4px; }
.fc-timecard-zone { padding: 0 4px; border-radius: var(--fc-radius-xs); background: var(--ds-gray-100); color: var(--ds-gray-900); font: 400 12px/18px var(--fc-font-mono); }
.fc-timecard-time { font: 400 12px/18px var(--fc-font-mono); color: var(--ds-gray-900); text-align: right; font-variant-numeric: tabular-nums; }
.fc-time-trigger { text-decoration: underline dotted var(--ds-gray-500); text-underline-offset: 3px; cursor: default; } /* Facet affordance, not in capture */
```
All values estimated. Priority **P1** (P0 for the trigger text itself, which is plain text and needs no CSS).

---

## Entity

Capture: default (avatar, title, description, right text), skeleton, list with secondary small buttons, list with checkboxes, fill, custom column classes (dashed borders).

### What it shows [measured, JSON]
- Row 73px tall (16px padding, 16px gap), avatar 32px, title 14px/600 `gray-1000`, description 14px `gray-900`, right-side text 14px `gray-900`.
- List: 1px `gray-alpha-400` ring, 8px radius, 1px row separators. In the dark capture the list surface is `#000` (background-200 in dark) inside a `#0a0a0a` frame.
- Right control: small secondary button (32px, 6px radius, 1px ring).
- Checkbox list: 16px checkbox, about 4px radius; checked is a `gray-1000` fill with a dark check; unchecked is a 1px ring.

### Facet
No CSS (and no checkbox CSS).

### Fix
```css
.fc-entity-list { list-style: none; margin: 0; padding: 0; border-radius: var(--fc-radius-md); box-shadow: 0 0 0 1px var(--ds-gray-alpha-400); overflow: hidden; }
.fc-entity { display: flex; align-items: center; gap: 16px; padding: 16px; min-height: 72px; background: var(--ds-background-100); }
.fc-entity-list > .fc-entity + .fc-entity { box-shadow: inset 0 1px 0 var(--ds-gray-alpha-400); }
button.fc-entity { width: 100%; border: 0; text-align: left; font: inherit; color: inherit; cursor: pointer; }
button.fc-entity:hover { background: var(--ds-gray-100); }      /* guess */
.fc-entity-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.fc-entity-title { font: 600 14px/20px var(--fc-font-sans); color: var(--ds-gray-1000); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-entity-desc  { font: 400 14px/20px var(--fc-font-sans); color: var(--ds-gray-900); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-entity-right { flex: none; margin-left: auto; display: flex; align-items: center; gap: 8px; font: 400 14px/20px var(--fc-font-sans); color: var(--ds-gray-900); }
```
Priority **P1** (signals list and news list inside the sheet).

---

## Sheet

Capture: only the trigger buttons and code. **The open sheet is not captured.** The code sample gives the anatomy: `SheetContent` with `m-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] rounded-2xl bg-background-100 p-0 lg:w-[512px]` (the end of the class list is clipped), `SheetHeader p-6 text-left` with title and a `text-copy-14 text-gray-900` subtitle, `SheetDescription px-6 py-4 text-copy-14`, `SheetFooter p-6 gap-2 flex-row justify-end mt-auto` with secondary Close and primary Next. Sides: top, right, bottom, left.

### Facet
No CSS. There is also no z-index token for sheets (`--fc-z-drawer` 200 and `--fc-z-modal` 300 exist).

### Fix
```css
.fc-sheet {
  position: fixed; z-index: var(--fc-z-drawer);
  top: 12px; bottom: 12px; right: 12px; width: min(512px, calc(100% - 24px));
  display: flex; flex-direction: column;
  border-radius: var(--fc-radius-xl);                 /* 16px, material-fullscreen radius */
  background: var(--ds-background-100); box-shadow: var(--ds-shadow-modal);
  overflow: hidden;
}
.fc-sheet[data-side="left"]   { right: auto; left: 12px; }
.fc-sheet[data-side="bottom"] { top: auto; left: 12px; width: auto; max-height: calc(100% - 24px); }
.fc-sheet[data-side="top"]    { bottom: auto; left: 12px; width: auto; max-height: calc(100% - 24px); }
.fc-sheet-header { padding: 24px 24px 0; }
.fc-sheet-title  { margin: 0; }                        /* apply .text-heading-20 in markup [guess at size] */
.fc-sheet-subtitle { margin-top: 4px; color: var(--ds-gray-900); }  /* .text-copy-14 */
.fc-sheet-body   { flex: 1; overflow-y: auto; padding: 16px 24px; }
.fc-sheet-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 24px; margin-top: auto; }
.fc-sheet-close  { position: absolute; top: 16px; right: 16px; }  /* reference requires a visible close [F placement] */
@media (prefers-reduced-motion: no-preference) {
  .fc-sheet { animation: fc-sheet-in 200ms var(--fc-ease-standard); }
  @keyframes fc-sheet-in { from { transform: translateX(16px); opacity: 0; } }
}
```
Priority **P0** (bet detail inspector).

---

## Calendar

Capture: triggers only (default, horizontal, sizes small and medium, presets, compact, stacked, presets with default value "Last 14 Days / Oct 18 - Nov 1", min/max, pinned timezone). **No open popover, month grid, range highlight or time input is captured.**

### What it shows [measured]
- Trigger: small 32px, medium 36px, about 250px wide, 6px radius, 1px ring, leading 16px calendar icon in `gray-900`, label 14px.
- Compact: date trigger plus a joined chevron segment separated by a 1px divider.
- Horizontal: period select (clock icon, chevron) joined to the date trigger.
- Stacked: period select on top, date range below, sharing one bordered box with a divider.

### Facet
No CSS. The month grid and range styles cannot be audited from these captures.

### Fix
Build `.fc-date-trigger` on top of `.fc-select` geometry and a `.fc-control-group` joiner:
```css
.fc-control-group { display: inline-flex; border-radius: var(--fc-radius-sm); box-shadow: 0 0 0 1px var(--ds-gray-alpha-400); }
.fc-control-group > * { box-shadow: none; border-radius: 0; }
.fc-control-group > * + * { box-shadow: inset 1px 0 0 var(--ds-gray-alpha-400); }
.fc-control-group[data-direction="column"] { flex-direction: column; }
.fc-control-group[data-direction="column"] > * + * { box-shadow: inset 0 1px 0 var(--ds-gray-alpha-400); }
```
Priority **P2** for the dashboard (FilterParams date-range presets cover kickoff windows); **P1** if the backtest page ships.

---

## Button

Capture: sizes, all types by size, shapes (square and circle, tiny to large), prefix/suffix, rounded with shadow, loading, disabled, disabled variants, link, custom.

### Right
- Heights 32/36/40, radius 6 (large 8), primary/secondary/tertiary/error/warning colors, warning near-black text, square and circle shapes, disabled default (`gray-100` fill, `gray-400` ring, `gray-700` text).

### Discrepancies
- **Loading**: capture shows a spinner left of the label inside a disabled-looking button (spinner about 12px small, 16px medium, 20px large; estimated). Facet treats `aria-busy` as disabled but renders no spinner and has no spinner class.
- **Tertiary disabled**: capture shows no fill and no ring, just muted text. Facet applies the gray fill and ring to every variant.
- **Secondary hover**: spec measured `gray-alpha-200`; Facet uses `gray-100`. Not visible in the static capture.
- Raw hex `#fff` / `#0a0a0a` (see cross-cutting).

### Fix
```css
.fc-button[data-variant="secondary"] { --_bg-hover: var(--ds-gray-alpha-200); }
.fc-button[data-variant="tertiary"]:disabled,
.fc-button[data-variant="tertiary"][aria-disabled="true"] { --_bg: transparent; --_ring: none; }
.fc-spinner { width: 16px; height: 16px; flex: none; border-radius: 50%;
  border: 2px solid var(--ds-gray-alpha-400); border-top-color: currentColor; animation: fc-spin .8s linear infinite; } /* simplified; reference uses a 12-tick spinner */
.fc-button[data-size="small"] .fc-spinner { width: 12px; height: 12px; }
```
Priority **P1** (`Refresh Odds` loading state).

---

## Breadcrumbs

Capture: text type, menu type (bordered chips), active, disabled.

- Text type: 14px `gray-900` items, 16px chevron separator in `gray-900`, about 8 to 12px spacing; active item `gray-1000`.
- Menu type: each crumb is a small bordered chip (about 24px, 4 to 6px radius, 1px ring).
- Facet: no CSS. Fix (P2):
```css
.fc-breadcrumbs { display: flex; align-items: center; gap: 8px; font: 400 14px/20px var(--fc-font-sans); color: var(--ds-gray-900); }
.fc-breadcrumbs a { color: inherit; text-decoration: none; }
.fc-breadcrumbs a:hover, .fc-breadcrumbs [aria-current="page"] { color: var(--ds-gray-1000); }
.fc-breadcrumbs [aria-disabled="true"] { color: var(--ds-gray-700); pointer-events: none; }
```

---

## Project banner

Capture: default (gray), success (blue fill), warning (amber), error (red).

- Full-width 40px bar, centered content: 16px icon, one sentence 14px, CTA as underlined medium-weight link in `gray-1000`. Fill is the `-100`/`-200` step of the hue with a 1px hue border; text in the hue's 900 step for error and warning, `gray-900` for gray. Success uses blue, which conflicts with Facet hue allocation.
- Facet has `.fc-note`, not a banner. A banner fits "Odds feed delayed for FanDuel" across the slate. Fix (P1):
```css
.fc-banner { --_fg: var(--ds-gray-900); --_bg: var(--ds-gray-100); --_bd: var(--ds-gray-alpha-400);
  display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 8px 16px;
  background: var(--_bg); box-shadow: inset 0 0 0 1px var(--_bd); color: var(--_fg); font: 400 14px/20px var(--fc-font-sans); }
.fc-banner a { color: var(--ds-gray-1000); font-weight: 500; text-decoration: underline; text-decoration-color: var(--_bd); text-underline-offset: 4px; }
.fc-banner[data-type="warning"] { --_fg: var(--fc-status-warning-fg); --_bg: var(--fc-status-warning-bg); --_bd: var(--fc-status-warning-border); }
.fc-banner[data-type="error"]   { --_fg: var(--fc-status-error-fg);   --_bg: var(--fc-status-error-bg);   --_bd: var(--fc-status-error-border); }
.fc-banner[data-type="success"] { --_fg: var(--fc-status-success-fg); --_bg: var(--fc-status-success-bg); --_bd: var(--fc-status-success-border); } /* Facet: green, not blue */
```

---

## Colors, materials, typography, grid (foundations)

- **Colors**: 10-step scales, gray vs gray-alpha guidance ("draw each border once", "keep material shadows translucent"), backgrounds 1 and 2, component colors 1 to 3 (default/hover/active bg), 4 to 6 (default/hover/active border), 7 to 8 (high contrast), 9 to 10 (text). Facet components use 100/200 for hover/active and 400 for borders, consistent with this. Two gaps: no component uses the **hover border** step (500) on secondary buttons, inputs do (`gray-alpha-500`); and `.fc-table[data-bordered]` (proposed) plus the entity list should follow "draw each border once" (do not let row separators overlap the outer ring, hence the inset shadows above).
- **Materials**: base 6, small 6, medium 12, large 12, tooltip 6, menu 12, modal 12, fullscreen 16. `materials.css` matches exactly. `.fc-card` and `.fc-tooltip` also match.
- **Typography**: every class on the capture (heading 72 to 14, button 16/14/12, label 20 to 12 with mono variants, copy) exists in `typography.css`. The capture notes label-12 is used "for the capitals in Calendars"; relevant only if a calendar is built.
- **Grid**: marketing guide grid. Not for the dashboard. P2, no action.

---

## Missing components and variants

| Name | What it is | Priority |
|---|---|---|
| `.fc-th-sort` + `aria-sort` styles | Sortable header button with direction chevron | P0 |
| `.fc-table` sticky wrap fix | `max-height` + `overflow: auto` on the wrap so the header actually sticks | P0 |
| `.fc-filter-bar`, `.fc-filter-chip` (applied, suggested, readonly, ai) | URL filter chips and Add filter trigger | P0 |
| `.fc-pie` | Inline pie gauge for the Score column | P0 |
| `.fc-gauge-wrap[data-size]`, gap track, indeterminate | Reference-accurate gauge | P0 |
| `.fc-sheet` (+ header, body, footer, sides) | Bet detail inspector panel | P0 |
| `--fc-toggle-thumb` dark token, toggle disabled | Dark-mode thumb fix | P0 |
| `.fc-badge[data-variant="pill"]` | Link chip with badge geometry | P1 |
| `.fc-checkbox` | 16px checkbox for table selection and entity lists | P1 |
| `.fc-table[data-bordered]`, row actions, sticky first column, selection column | Slate table anatomy | P1 |
| `.fc-timecard` | Relative time popover | P1 |
| `.fc-mtrunc` | Middle truncation for long market names | P1 |
| `.fc-entity-list`, `.fc-entity` | Signals and news rows in the sheet | P1 |
| `.fc-meter` with types and stops | Div progress bar with thresholds and stops | P1 |
| `.fc-spinner` + button loading layout | Loading state for Refresh Odds | P1 |
| Status dot pulse | Animation for queued, building, updating | P1 |
| `.fc-tab` icon, focus, disabled, count slot | Tabs completeness | P1 |
| `.fc-banner` | Slate-wide feed or account notices | P1 |
| `.fc-toggle-field` | Toggle with label layout | P1 |
| Contrast foreground tokens | Replace `#fff`, `#000`, `#0a0a0a` in components.css | P1 |
| `.fc-control-group`, `.fc-date-trigger` | Joined trigger groups for calendar | P2 |
| Calendar popover grid and range | Not captured, cannot be audited | P2 |
| `.fc-breadcrumbs` | Text and menu breadcrumbs | P2 |
| Teal and pink badges | Remove or mark as hue exceptions | P2 |
| Grid system | Marketing guide grid | P2 |
