# The board `[F]`

How Facet's foundations compose into a product's main screen: a ranked table of scored records, the highlights above it and the detail sheet a row opens. Refine the layout per product, but keep the encodings.

## The reader's job

A reader opens the board to decide **which records need attention now, and why, before the data moves.** Every screen should answer that in its first viewport and keep the evidence one step away.

- Fast path: the ranked board, each record's verdict, its delta against the baseline, and what could still change it.
- Audit path: the six checks with their notes, the outcome log, the trend, sources, and the method.

## Number formats

| Value | Format | Example | Notes |
|---|---|---|---|
| Score | Whole number, 0 to 100, tabular | `92` | Always beside the score mark |
| Value | Compact currency, 1 decimal, tabular | `$48.2k` | The value chip (`.fc-price`) |
| Signed number | Signed, `.fc-signed` sign slot | `+220`, `−110` | Use U+2212 minus for display; keep the sign in a fixed slot so columns align |
| Baseline (forecast) | Percent, 1 decimal | `61.3%` | Say which period and which accounts it covers |
| Actual | Percent, 1 decimal | `65.5%` | Always shown beside the baseline on the same basis |
| Delta | Signed points | `+4.2 pts` | Points, not percent. Sign + arrow + color (`.fc-delta`) |
| Exact money | Currency, 2 decimals | `$7.00` | Right-aligned, tabular |
| Deadline | Local time, Mono in `<time>` | `11:00 AM` | `Intl.DateTimeFormat` in the viewer's zone; exact zone on hover |
| Freshness | Relative + absolute on hover | `2m ago` | Status dot color follows `--fc-freshness-*` |
| Outcomes | "n of m" | `5 of 6` | Never a bare percentage for samples under 20 |

## Board table (the primary surface)

Columns in lookup order, each right-aligned if numeric:

1. **Score**: `.fc-score` with the 0 to 100 number beside it.
2. **Account** (row header): name in gray-1000, then segment and owner on a secondary line in gray-900. An avatar or a neutral `.fc-icon-tile` may lead it (`components/entity.md`).
3. **Verdict**: `.fc-signal` dot + word.
4. **Checks**: `.fc-signal-strip`, six dots in fixed order (usage, billing, support, adoption, sentiment, engagement). Hollow ring for unchecked. Give the strip an `aria-label` summary ("5 on track, 1 watch").
5. **Forecast**, **Actual**, **Delta**: the comparison block. Same precision for every row.
6. **Value**: `.fc-price`.
7. **Renewal**: the deadline.
8. **Synced**: status dot + relative time.

Rules:
- Caption states the sort and filter, and the count ("Showing 7 of 31 accounts, filtered to Enterprise").
- Default sort is by score, then by delta. Default filters are neutral, never "only the best".
- Sticky header with `scroll-padding-top` for keyboard users. Compact density only above roughly 25 rows.
- Rows open the detail sheet; the open row keeps `aria-selected="true"` (gray-200 fill), never a colored side rail.
- A row has one link (`a.fc-row-link`) and at most one action of its own, in `.fc-row-action` (`patterns/data-ops.md`, "Row link"). A row added to a selection takes `data-checked` at once.
- On phones each row becomes a `.fc-score-row` in a `.fc-score-list`: score, account, then value over delta (`.fc-score-row-end`).

## Highlights strip

The records the product surfaces sit above the table as highlight cards (`.fc-strip-wrap > .fc-strip > .fc-highlight-card`, `components/highlight-card.md`).

- Head: the score mark (`data-size="lg"`), the account, then value over delta.
- Body: three reasons (`.fc-reasons`), each carrying its number.
- Foot: when it was found, and Mark read.
- A new highlight arrives `data-unread`; the card's label says so in words ("Northwind, new highlight"), so the tint is never the only cue.
- The strip scrolls sideways with snap; the wrap fades its trailing edge.

## Verdict and signals

- The verdict is a conclusion, so it is one short label: On track, Watch, At risk, Unchecked. The words are the product's own; the four states (`go`, `wait`, `stop`, `none`) are fixed. The signal strip is its evidence.
- Unknown is its own state (hollow ring, "Unchecked"), never silently counted as a pass or a fail.
- Check notes are plain sentences in `text-copy-13`, written as findings ("Usage rose 12% in four weeks, and no invoice is overdue"), with the exact number in tabular Sans.

## Score

- One score system: every record carries the same mark with one 0 to 100 score. No tiers, categories or tier words to memorize.
- Encoded two ways: the number, always present, and accent intensity that rises with it along the gray to accent ramp. A void score (the record fails a hard gate, such as fewer than 30 days of data) renders hollow with a dashed gray label ("Not eligible"), never in the accent.
- Motion: on the board, score marks cascade bottom to top (160ms per row), so the highest scored records light last, as the climax. Glow strength follows the score, so rank is seen as well as read. A void score never moves.
- The score comes from the model. Keep its math in data, not in CSS.
- A highlight is the only content that takes the accent as text color or fill (`--fc-highlight-*`).

## Detail sheet (evidence)

A row or a highlight card opens the detail sheet (`.fc-sheet[data-motion="spring"]`, `components/sheet.md`).

Order: the current state versus the condition the outcomes depend on, then the six checks, then the outcome log, then the trend, then sources.

- Outcome log: one cell per week on a shared time axis, met or missed as filled or hollow plus the week; a thin rule marks a change of conditions (a plan change, a new owner).
- Trend: a range marker or small line chart on one scale, with start, now and forecast labelled directly.
- Sources: quiet, last, linked, with retrieval time.
- "What to watch" is a single sentence in a `.fc-note` with `data-type="warning"` only when it can change the verdict before the deadline.

## Freshness and live data

- Every stale-able number lives inside a context that shows when it was last synced (`.fc-status` with a status dot and relative time).
- When a value moves, update the cell, tint it briefly, and announce a summary politely for pinned records only. Never reorder rows while the user is reading; offer "Re-sort" instead.

## Filters and state

Week, segment, region, source, verdict, minimum score, sort and the open record all live in the URL (`?week=9&segment=enterprise&source=billing&sort=score&account=northwind`). Use segmented controls for 2 to 4 exclusive options, a select or combobox beyond that, and the filter-params pattern (`components/filter-params.md`) for stacked filters.

## States

- Empty: "No highlights yet for Week 9. The first sync runs Tuesday." with one next step.
- Sparse (early in the week): show what exists and say what is still missing.
- Stale: keep the data visible, mark it stale, offer a sync.
- Failed: keep the last good values, show what failed and when (`patterns/failures.md`).
- Loading: skeletons with the final row height and column widths.

## Responsible design note

A score steers real decisions. Show uncertainty plainly (sample sizes, "not a guarantee"), never celebrate a record, never use urgency tricks around a moving value, and keep actions explicit and reversible.
