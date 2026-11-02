# Hidden Gems patterns `[F]`

How Facet's foundations compose into the Hidden Gems research experience. These are starting patterns for the UI work now happening in a parallel session; refine them there, but keep the encodings.

## The reader's job

A bettor opens Hidden Gems to decide **which available bets are worth placing, at what stake, before the price moves.** Every screen should answer that in its first viewport and keep the evidence one step away.

- Fast path: the ranked slate, each pick's verdict, its gap versus the market, and what could still change it.
- Audit path: the six signals with their notes, the game log, line history, sources, and the method.

## Number formats

| Value | Format | Example | Notes |
|---|---|---|---|
| Decimal odds | 2 decimals, tabular | `3.20` | Prototype default |
| American odds | Signed integer, `.fc-signed` sign slot | `+220`, `−110` | Use U+2212 minus for display; keep the sign in a fixed slot so columns align |
| Priced chance (implied probability) | Whole percent | `31%` | From odds: decimal `1 / o`; American `100 / (A + 100)` if positive, `−A / (−A + 100)` if negative. Say whether vig is removed |
| Our estimate | Whole percent | `44%` | Always shown beside the priced chance on the same basis |
| Gap / edge | Signed percentage points | `+13 pts` | Points, not percent. Sign + arrow + color (`.fc-delta`) |
| Stake and payout | Currency, 2 decimals | `$7.00` | Right-aligned, tabular |
| Kickoff | Local time, Mono allowed | `11:00 AM` | `Intl.DateTimeFormat` in the viewer's zone; exact zone on hover |
| Freshness | Relative + absolute on hover | `2 min ago` | Status dot color follows `--fc-freshness-*` |
| Record | "n of m" | `5 of 6` | Never a bare percentage for samples under 20 |

## Slate table (the primary surface)

Columns in lookup order, each right-aligned if numeric:

1. **Pick** (row header): player in gray-1000, then position and market on a secondary line in gray-900.
2. **Kickoff**.
3. **Odds**, **Priced**, **Our est.**, **Gap**: the comparison block. Same precision for every row.
4. **Signals**: `.fc-signal-strip`, six dots in fixed order (setup, track record, sample, price gap, matchup, market). Hollow ring for unchecked. Give the strip an `aria-label` summary ("5 go, 1 wait").
5. **Verdict**: `.fc-signal` dot + word.
6. **Gem tier**: `.fc-gem` facets + word.

Rules:
- Caption states the sort and filter, and the count ("Showing 7 of 31 picks, filtered to Sunday early window").
- Default sort is by gap, then by verdict. Default filters are neutral, never "only winners".
- Sticky header with `scroll-padding-top` for keyboard users. Compact density only above roughly 25 rows.
- Rows open a detail view; the open row keeps `aria-selected="true"` (gray-200 fill), never a colored side rail.

## Verdict and signals

- The verdict is a conclusion, so it is one word: Go, Wait, Stop, Unchecked. The signal strip is its evidence.
- Unknown is its own state (hollow ring, "Unchecked"), never silently counted as a pass or a fail.
- Signal notes are plain sentences in `text-copy-13`, written as findings ("Daniels starts, Diggs has no injury tag"), with the exact number in tabular Sans.

## Gem tier

- Ordinal: rough < cut < polished < flawless. Encoded twice: 1 to 4 filled facets and rising purple intensity; the word is always present.
- Thresholds are a modeling decision, not a design one. Keep them in data, not in CSS, and document them where the model lives.
- "Hidden Gem" designation is the only place the purple accent appears as text color or fill.

## Pick detail (evidence)

Order: today's setup versus the condition the record depends on, then the six signals, then the game log, then line movement, then sources.

- Game log: one cell per game on a shared time axis, hit or miss as filled or hollow plus the opponent; a thin rule marks a role change (the prototype's "Achane healthy | Gordon lead back" split).
- Line movement: a range marker or small line chart on one scale, with open, now and our fair price labelled directly.
- Sources: quiet, last, linked, with retrieval time.
- "What to watch" is a single sentence in a `.fc-note` with `data-type="warning"` only when it can change the verdict before kickoff.

## Freshness and live data

- Every stale-able number lives inside a context that shows when it was last pulled (`.fc-status` with a status dot and relative time).
- When odds move, update the cell, tint it briefly, and announce a summary politely for the watchlist only. Never reorder rows while the user is reading; offer "Re-sort" instead.

## Filters and state

Week, window (early, afternoon, night), market, sportsbook, verdict, tier, sort and the open pick all live in the URL (`?week=8&window=early&book=dk&sort=gap&pick=gesicki`). Use segmented controls for 2 to 4 exclusive options, a select or combobox beyond that, and Geist's filter-params pattern for stacked filters.

## States

- Empty: "No gems yet for Week 9. Odds open Tuesday." with one next step.
- Sparse (early week): show what exists and say what is still missing.
- Stale: keep the data visible, mark it stale, offer refresh.
- Error: keep the last good values, show what failed and when.
- Loading: skeletons with the final row height and column widths.

## Responsible design note

This is a research tool about real money. Show uncertainty plainly (sample sizes, "not a guarantee"), never celebrate a pick, never use urgency tricks around odds movement, and keep stake controls explicit and reversible.
