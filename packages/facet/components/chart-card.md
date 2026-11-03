# Chart card

> Facet component `[F]`, modeled on the chart cards in the vercel.com app (Observability, Firewall, CDN; captured 2026-11-01). CSS in `css/charts.css`; drawing helper in `preview/index.html#charts` (`FacetCharts`).

## Purpose
One surface that holds one chart and everything needed to read it: what it measures, its scale, how fresh it is, and where to go next.

## Anatomy
- `.fc-chart-card`: canvas surface, `--ds-shadow-border`, radius `--fc-radius-lg` (12).
- `.fc-chart-card-header`: 16px padding, then
  - `.fc-chart-card-titlerow`: `.fc-chart-card-title` (14/20, 500, primary) with optional `.fc-chart-card-meta` under it (13/18, secondary), and an optional `.fc-chart-card-drill` link (24px square, the in-app arrow →, named with `aria-label`).
  - Optional `.fc-legend` (see `legend.md`). Default for multi-series charts.
- `.fc-chart-card-body`: 16px padding; `data-flush` drops the side padding to 8px for row lists that carry their own inset.
- `.fc-chart`: the plot. `<figure role="img" aria-label="summary">` containing one `<svg aria-hidden="true">` drawn at its real pixel width.
- Optional `.fc-chart-card-footer`: background 2 band with a top rule. Holds the freshness line (left) and actions (right).

## Chart anatomy (`.fc-chart`)
| Part | Class | Spec |
|---|---|---|
| Gridlines | `.fc-chart-grid` | Horizontal only, 1px `--fc-chart-grid`, 3 to 5 lines. No vertical lines, no frame. |
| Baseline | `.fc-chart-baseline` | Zero line on bar charts, `--fc-chart-axis`. |
| Tick labels | `.fc-chart-tick` | 12/16 Sans, secondary, tabular figures. Abbreviated units (`2k`, `1.4s`). Clock-time axis labels ("4:05 PM") add `data-time` and set in Mono; relative labels ("12h ago", "now") stay Sans. |
| Line | `.fc-chart-line` | 1.5px, round joins, no markers. Sparklines 1.25px. |
| Area | `.fc-chart-area` | Optional, series color at 6% opacity. |
| Bar | `.fc-chart-bar` | Series fill, 2px gap (1px when bars are under 8px wide). Always from zero. |
| Point | `.fc-chart-point` | Only at directly labelled points (open, now). |
| Direct label | `.fc-chart-label.fc-chart-halo` | Name in secondary, value in `data-strong` primary; a canvas halo keeps lines off the text. |
| Threshold | `.fc-chart-threshold` | See "Threshold line" below. |
| Empty | `.fc-chart-empty` | See "Empty chart" below. |

Heights: default 160px, `data-size="small"` 120px, `data-size="timeline"` 56px, or set `--fc-chart-height`.

## Series color
Marks read `--_s` from `data-series="1"` to `"6"` (`--fc-chart-1` to `-6`: gray-1000, blue, teal, pink, gray-700, gray-500) or `data-series="muted"`. Monochrome first: one series is always slot 1. Add slot 2 only when a second series must be told apart, then 3 and 4. A series keeps its slot in every view. Verdict hues and purple are never series colors; a chart that plots verdicts or gems uses the signal or gem tokens instead.

## Rules
- **Geometry first.** Change over time is horizontal order; magnitude is length from a shared zero. Bars always start at zero. A line may use a tight domain, and its ticks must show it.
- **Shared scale for peers.** Charts, sparklines or bars that compare the same measure share one domain (`FacetCharts.sharedDomain`). Small multiples of different measures may each have their own scale but share the time window.
- **Relative time axis.** When the right edge is now, label only the endpoints relative to now: `12h ago` on the left, `now` on the right. Times people read are Sans with tabular figures; Mono is for machine values only.
- **Incomplete last bucket.** A bucket that is still filling draws dashed: lines get `data-incomplete` on the last segment (`stroke-dasharray: 2 3`), bars get a dashed outline and a 14% fill. Say so in the chart's text summary, not on the plot.
- **Labels.** Single-series charts label directly (open and now on line movement). Multi-series charts use a legend with totals (`legend.md`).
- **One chart per card.** No cards inside cards, no stat cards stacked above a chart that already has a legend.
- **Drill link.** Optional, top right, goes to the full view. Name it (`aria-label="Open the pull log"`).
- **Footer.** Freshness on the left (`freshness.md`), actions on the right, secondary small buttons. A table toggle (`aria-expanded`, `aria-controls`) is the preferred audit path.

## Threshold line (C2)
- A 1px dashed line (`4 3`) across the plot, colored `--fc-text-secondary` by default.
- Its value sits in the y-axis lane at the line's height, 500 weight, primary; any tick within 16px is hidden so the two never collide.
- Its name sits in the plot just above the line at the left edge (`Our fair price`), with a canvas halo.
- `data-tone="warning"` or `"error"` only for a limit whose crossing is a warning or an error (quota warning, hard cap). A reference value, such as our fair price, stays gray: it is a reference, not a verdict.
- The dash, the axis value and the name carry it, so it never depends on color.

## Empty chart
- Keep the frame: gridlines, ticks and endpoints stay, so the card does not jump when data arrives.
- Center one line in `.fc-chart-empty` on a canvas knock-out. Name the scope that produced it (`No failed pulls in the last 3 hours`).
- One neutral `.fc-icon-tile data-size="sm"` above the line is allowed (owner decision D1).
- Legend values become `–` with `aria-label="Unknown"`.
- The figure's `aria-label` repeats the message.

## Accessibility
- `role="img"` plus an `aria-label` that states the reading in one or two sentences: start, end, extremes, and any incomplete bucket. The helper sets it from `summary`.
- Offer the exact numbers as a semantic `<table>` (footer toggle) wherever the reader may need values.
- Icon-only drill links and buttons are named (CON-19). Focus uses `--ds-focus-ring` (INT-02).
- Color is never the only cue (CON-09): dashes, positions, labels and words carry every encoding.

## Hidden Gems usage
- Line movement on pick detail: one series (the book's price), open and now labelled, our fair price as the threshold.
- Odds pulls per hour on Data: scheduled and on demand stacked, legend totals, dashed current hour.
- Alert preview: the gap series over 7 days with the alert level as a threshold.

## Takeaway `[F]`

Owner feedback, 2026-11-02: "I don't know if this movement is positive or negative for me." A chart whose movement can be good or bad for the reader states the reading in one line under the title (`.fc-chart-card-takeaway`), leading with its value at headline size (20/28, 600) so it never reads as a second meta line: the value, what it measures ("+2.2 pts gap left"), and a change pill colored by polarity, with the explanation in its helper. An action in the takeaway ("Connect BetMGM for 83%") hugs the card's right edge, apart from the reading.

- The chart itself stays neutral; only the pill carries color (color the outcome, not the line).
- Judge movement from the reader's position. Line movement on an untracked pick reads as **Gap left** (value shrinking is bad). Once the bet is tracked, the same chart reads as **Beat the close** (the line moving your way is good).

**Gap to a target.** When the reading is "how far from a target" (price vs our fair price), the chart shades the space between the line and the target line in the edge color (`gap: { to }`, `.fc-chart-gap`) and marks what is left now with a bracket at the right edge. A wedge that narrows says value is closing before any number is read; the takeaway line states the number.

**Label the reading in place.** When the chart's shape carries the reading (a gap to a target), label it where it happens instead of in a takeaway line: the value at open inside the wedge ("+7.1 pts at open") and what is left now beside the bracket ("+2.2 pts left", edge color). Use the takeaway line only when the reading is not a point on the chart (reach at your books).

**Ghosted future.** When the movement has a deadline (kickoff), the chart runs past Now to the event: a faint band marks the future, a dashed gray projection continues at the recent pace, and the zone past the target is tinted red and labelled "No value". Where the projection crosses into it, a red marker names when the edge would flip ("Flips in ~2.5d"). Projections are always dashed, gray and labelled, never drawn like data; the summary for screen readers says the same in words.

## Scatter `[F]`

CSS in `css/charts.css` (`.fc-chart[data-kind="scatter"]`). Specimen: `preview/index.html#ch-scatter`.

### Purpose
Shows where every item of a set sits on two measures at once, so a weighting reads as a shape: which odds a formula rewards, where the gems cluster, which ones lead.

### Anatomy
```html
<ul class="fc-legend" role="list">
  <li class="fc-legend-item"><span class="fc-legend-key" data-gem style="--rating: 14"></span><span class="fc-legend-name">Clears the posted price</span><span class="fc-legend-value">38</span></li>
  <li class="fc-legend-item"><span class="fc-legend-key" data-series="muted" data-shape="hollow"></span><span class="fc-legend-name">Misses</span><span class="fc-legend-value">88</span></li>
  <li class="fc-legend-item"><span class="fc-legend-key" data-shape="ring"></span><span class="fc-legend-name">Top 10</span></li>
</ul>
<figure class="fc-chart" data-kind="scatter" role="img" aria-label="Score against odds for 126 props, 38 clear the posted price. The top 10 are listed in the table below.">
  <svg aria-hidden="true" focusable="false">
    <rect class="fc-chart-range" x="23%" width="21%" y="0" height="100%"/>
    <text class="fc-chart-range-label" x="33.5%" y="0" dy="14" text-anchor="middle">Usual range</text>
    <line class="fc-chart-grid" x1="0" x2="100%" y1="50%" y2="50%"/>
    <line class="fc-chart-baseline" x1="0" x2="100%" y1="100%" y2="100%"/>
    <text class="fc-chart-tick" x="-8" y="50%" dy="4" text-anchor="end">50</text>
    <text class="fc-chart-tick" x="18.4%" y="100%" dy="18" text-anchor="middle">2</text>
    <text class="fc-chart-axis-title" x="100%" y="100%" dy="34" text-anchor="end">Odds, log scale</text>
    <text class="fc-chart-axis-title" x="0" y="0" dy="-12">Score</text>
    <circle class="fc-chart-point" data-series="muted" cx="61%" cy="72%" r="4"><title>Jake Ferguson, 9.50, 12.0</title></circle>
    <circle class="fc-chart-point" data-gem style="--rating: 10" cx="38%" cy="31%" r="4"><title>Foster Moreau, 7.00, 10.0</title></circle>
    <circle class="fc-chart-ring" cx="38%" cy="31%" r="8"/>
  </svg>
</figure>
```
- The figure's padding is the axis lanes: `--fc-chart-gutter` (40px) on the left for y ticks, 40px below for x ticks and the x title, 32px above for the y title. The `<svg>` covers the plot only, so every mark position is a percentage of the plot. Nothing is measured and text stays 12px at any width (LAY-07).
- Height 280 (220 with `data-size="small"`), including the lanes.
- Points: 4px radius. Shape tells gems from misses: a gem point (`data-gem`) is filled, with a 1px canvas stroke so overlaps stay countable; every other point (`data-series="muted"`) is a hollow gray ring. Draw misses first so gems sit on top.
- Gem points follow the gem intensity ramp: set `--rating` (the prop's 0 to 100 gem rating) on each, and the fill mixes the gem color with gray in the same proportion as `.fc-gem` (one number, purple rising with it, no tiers). Without `--rating` a gem mark is full strength.
- Top N: an 8px ring in primary text around each leading point (`.fc-chart-ring`). The ring marks rank; neither rank nor gem status relies on color alone (CON-09, DES-05).
- Legend keys: `data-gem` for a filled gem dot, `data-shape="hollow"` on the muted key for misses, `data-shape="ring"` for the rank ring. The gem key takes `--rating` from the highest-rated plotted gem, so it matches the brightest point; it shows full strength only when a 100 is plotted.
- Optional band (`.fc-chart-range` plus `.fc-chart-range-label`): a gray fill for a range the reader cares about, such as a usual odds range. Gray only, labelled in place.
- Horizontal gridlines at 3 to 5 round y ticks; the zero line is the baseline. A log x axis labels round values only (1.5, 2, 3, 5, 10, 20).

### States
Filled; sparse (a filter leaves few points: the chart keeps its axes and domain, the legend counts say how many); empty (the ghost and message from "Failures"). Hover shows each point's native title (player, odds, value).

### Rules
- Purple appears only for points that are gems, through the gem token on the rating's intensity ramp (DESIGN.md, hue allocation). Never use another series hue to mean "good".
- The legend counts each kind and names the ring. Leave out a kind with no points rather than show it at 0.
- A scatter of more than about 20 points is not keyboard navigable point by point. Pair it with the table of the same records (here, the top 10) and say so in the figure's `aria-label` (CON-22, DES-05).
- One shared domain for every view of the same set (switching formulas keeps the odds axis fixed), so shapes compare (rule 5).
- State the scale in the axis title when it is not linear ("Odds, log scale").

### Hidden Gems usage
Rating lab, Formula comparison: each Week 9 prop's score under the chosen formula against its odds, gems in purple, the top 10 ringed, above the top 10 table.
