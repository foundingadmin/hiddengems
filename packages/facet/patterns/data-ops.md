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

## Log table variant `[F]`

Owner feedback and reference, 2026-11-03: a log reads as history, like the vercel.com runtime log. CSS in `css/charts.css`. Specimen: `preview/index.html#ch-run-detail`.

```html
<div class="fc-table-wrap text-copy-13-mono">
  <table class="fc-table" data-variant="log">
    <caption class="fc-visually-hidden">Newest first, 12 runs</caption>
    <thead><tr><th scope="col">Time</th><th scope="col">Source</th><th scope="col" data-grow>Message</th><th scope="col" data-align="numeric">Ran</th></tr></thead>
    <tbody>
      <tr data-level="warning" aria-selected="true">
        <td class="fc-log-time"><a class="fc-row-link" href="?run=…" aria-current="true"><time datetime="…">Nov 02 9:48:58 PM</time></a></td>
        <td class="fc-log-source">Odds <span>manual</span></td>
        <td class="fc-log-message"><span class="fc-level" data-level="warning">Warned</span> Pulled 40 prices<span class="fc-log-detail">2 games had no odds event</span></td>
        <td data-align="numeric">0.4s</td>
      </tr>
    </tbody>
  </table>
</div>
```
- Dense mono rows (the wrap sets `text-copy-13-mono`; headers stay sans), square row ends, cells on one baseline, 4px vertical padding.
- **Level rows.** `data-level="warning"` tints the row amber, `"error"` red, and the row always carries its level word (`.fc-level`) so color is never the only cue (CON-09). A failure out of your hands (provider down) is a warning, not an error (`patterns/failures.md`). The text stays its normal colors: the tint and the word carry the level, never the whole line (feed.md, "Color the outcome").
- **Second lines.** `.fc-log-detail` puts a secondary line under the message (the first warning of a run).
- **Selection on a level row.** The open row (`aria-selected="true"`) keeps its tint and takes the next step of it, so a warning stays amber while open; every selected log row also gets a 2px leading bar in primary text, the shape cue that does not depend on fill (CON-09). A plain selected row takes the gray hover step.
- **Narrow layout.** Under 640px of table width (the wrap is the container) each row stacks: time, source or level and the numbers share the first line (numbers pushed to the end), and `.fc-log-message` takes the whole second line, so the message is never off screen and the page never scrolls sideways (LAY-04, AGT-04). Rows divide with a hairline; header labels hide visually; the leading bar moves to the row's edge. Keep cells in reading order: some browsers drop table semantics once rows are flex, so each row must still read as a sentence.
- Use `.fc-log-level` for a level column and `.fc-log-source` for a source column (both stay on one line).

## Row link `[F]`

When a row's record opens on the same page (a `?run=` panel above the table), the cell that names the row (usually the time) holds the row's one link, `a.fc-row-link`.
- The link stretches over the whole row, so the row is the hit target (INT-04) and Cmd or Ctrl click still opens a new tab (INT-27).
- At rest the link text carries a quiet underline (the default link cue); on row hover the row fills and the underline darkens. Keyboard focus draws a 2px brand ring inside the whole row (INT-02).
- The open row's link has `aria-current="true"`; the row has `aria-selected="true"`.
- One link per row: never put another link in a row that has one. The one exception is the row's own action in its last cell (Add / On slip on the Gems board): wrap it in `.fc-row-action` (CSS in `css/slip.css`), which lifts it above the stretched link so it takes its own clicks. One action per row at most.

## Log data `[F]`

A line's structured data in mono under its message. Short data (under about 96 characters) sits inline; longer data folds behind a summary of its keys, with array lengths.
```html
<code class="fc-log-data">{"events":5}</code>
<details class="fc-log-data">
  <summary>names (14)</summary>
  <pre>{ "names": [ … ] }</pre>
</details>
```
- Secondary text, wraps anywhere so a long token never widens the row (CON-14).
- The summary is a real control: a 12px chevron that turns 90° when open (ANI-01 stops the turn under reduced motion), primary on hover, a focus ring on keyboard focus. Enter and Space toggle (native `<details>`).
- The folded JSON sits in a subtle inset box, pretty printed with 2-space indents.
- Never log a secret; redact URLs with keys before they reach the log.

## Inline row detail `[F]`

Owner review, 2026-11-03: "direct line items in the log for the last run". For a record worth keeping open while reading the rest (a run and every line it logged), the record opens inline above its table instead of in a sheet. CSS `.fc-row-detail` in `css/charts.css`.
```html
<section class="fc-row-detail" aria-labelledby="run-h">
  <header class="fc-row-detail-head">
    <div>
      <h2 class="fc-row-detail-title" id="run-h">Odds</h2>
      <p class="fc-row-detail-meta"><time datetime="…">Nov 02 9:48:58 PM</time> · <span data-relative>7m ago</span></p>
    </div>
    <a class="fc-button" data-variant="secondary" data-size="small" href="/data/logs" aria-label="Close run">Close</a>
  </header>
  <div class="fc-row-detail-body">
    <p class="fc-note" data-type="warning"><span>Pulled 40 prices, 2 games had no odds event</span><a class="fc-link-action fc-note-link" href="/data">Data health</a></p>
    <dl class="fc-description" data-compact>…</dl>
  </div>
  <div class="fc-row-detail-section">
    <h3 class="text-heading-14">Log lines</h3>
    <div class="fc-table-wrap text-copy-13-mono"><table class="fc-table" data-variant="log">…</table></div>
  </div>
</section>
```
- **Header.** Title (20/28 600) and the time with its relative time under it; Close on the right. Title and Close stay on one line at every width.
- **Body.** The message: a note in the level's tone with the next step when the row needs a look (the Failures pattern decides the tone), plain primary text otherwise. Then the record as a compact description (`data-compact`): one line per pair on phones.
- **Sections.** Ruled sections for what belongs to the record, such as the lines table (the log table variant, so it stacks on phones too).
- The ring stays neutral; the note and the status word carry the level, so the tone shows once.
- **States.** Open (the row is selected and its link `aria-current`), not found (a note "Run not found" with Close), no lines ("This run logged no lines").
- **Rules.** The URL holds the open row (`?run=<id>`), so the view can be shared and Back closes it (INT-11). Close is a link to the same URL without the key. Only one record open at a time. Use a sheet instead when the record is short and the table is the main reading.
- **Hidden Gems usage.** Logs, `?run=<id>`: the run's record and its log lines above the run log.
