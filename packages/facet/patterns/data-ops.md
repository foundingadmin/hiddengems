# Data operations view

> Facet pattern `[F]`. Modeled on the Logs and Observability screens in the vercel.com app (captured 2026-11-01). CSS in `css/charts.css`; demo in `preview/index.html#charts`.

## Purpose
Lets someone check that data is flowing and find the pull that failed: filters on the left, a timeline and a log on the right.

## Layout
```
.fc-dataops
├── aside.fc-dataops-rail      240px; moves above the main column when both no longer fit
│   └── details.fc-facet-group × n
└── .fc-dataops-main
    ├── .fc-dataops-toolbar    search, Live, refresh
    ├── figure.fc-chart[data-size="timeline"]
    ├── p.fc-dataops-status    only while paused
    └── .fc-table-wrap > table.fc-table[data-density="compact"]
```
Navigation and filtering can share the rail column, as the reference does; the main column stays all data.

## Facet group
```html
<details class="fc-facet-group" open>
  <summary>Level <svg …chevron…/></summary>
  <ul class="fc-facet-list" role="list">
    <li><label class="fc-facet">
      <input type="checkbox" checked>
      <span class="fc-facet-check" aria-hidden="true"><svg …check…/></span>
      <span class="fc-level" data-level="warning" aria-hidden="true"></span>
      <span class="fc-facet-label">Warning</span>
      <span class="fc-facet-count">18</span>
    </label></li>
  </ul>
</details>
```
- Collapsible through native `<details>`; the chevron turns when open. Summary 32px, 13/16 500.
- Rows 32px: checkbox (16px, gray-1000 when checked), optional level dot, label, count pill (12px, tabular, `--ds-gray-alpha-200`). Without a dot, the label takes the dot lane.
- The whole row is the label, so the hit target covers checkbox and text (FRM-08). Keyboard focus lands on the real checkbox and shows `--ds-focus-ring` on the box.
- Counts are for the current scope and update with it; they show the shape of the data before anyone filters. Zero stays visible as `0`.
- Open the groups people use most (Level, Source); collapse the rest.

## Toolbar
- Search input (named with `aria-label`; the placeholder gives examples, not the label).
- **Live toggle**: `.fc-button.fc-live` secondary small with `aria-pressed`. The label stays "Live" in both states (a toggle button keeps its name); a static dot shows state: filled `--fc-freshness-live` when on, hollow gray when paused. It never pulses (Reject on sight; ANI-07). While paused, `.fc-dataops-status` says when it paused and that new rows wait.
- Refresh icon button, named.
- Live mode adds rows at the top only when the reader is at the top; otherwise it holds them and shows a count, so scroll position is respected.

## Timeline
A 56px bar histogram of events per bucket on the same time window as the table, no y labels, clock ticks at the start, middle and end (Sans, tabular, edge labels aligned to the plot edge). Bars are gray (`data-series="5"`). The current bucket is dashed (incomplete). Brushing to narrow time is a future addition.

## Log table
- `.fc-table[data-density="compact"]`, caption states sort and scope (`Newest first, 8 of 189 pulls`).
- Columns: Time, Level, Source, Message, then numbers (right-aligned with units, `1.2s`), then machine IDs.
- **Time** is Mono (`6:05:12 PM`) in a `<time datetime>`. Relative time belongs in summaries and freshness lines, not log rows.
- **Level** is dot plus word (`.fc-level`): Info gray, Warning amber, Error red; `success` green exists for pull status. Never color alone (CON-09).
- **Request IDs, cron expressions and hashes** are Mono (`.fc-log-id`), secondary.
- Messages say what happened with the numbers in them (`Pulled 386 markets, 12 suspended`); errors use "Failed to" for system faults.
- The table scrolls inside `.fc-table-wrap` on narrow screens; the page never scrolls sideways.

## Hidden Gems usage
Data, then Odds pulls: Level, Source (sportsbook) and Market facets; scheduled pulls every 5 minutes on game days; an Error row links to its request and to a retry.

**Paused state (owner feedback, 2026-11-02).** When the live view is paused, the state is a small gray note above the table with a "Resume" link, not a line of caption-weight text. The table caption ("Newest first, 8 of 189 pulls") stays quiet metadata, so the two never compete: a state you should notice sits in a note, facts about the list sit in the caption.

**Row detail (owner question, 2026-11-02).** A log row is a summary; its full record opens in a sheet: level, source, markets, lag, response, endpoint and request ID, with a note when the pull failed or warned (the Failures pattern decides whose problem it is). The whole row is clickable and ends in a right chevron, because the sheet slides in over the same page. The sheet footer offers the next step: copy the request ID, and open the source's connection row.
