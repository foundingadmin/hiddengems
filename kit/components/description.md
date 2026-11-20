# Description
> Source: https://vercel.com/geist/description (captured 2026-11-02). The rows layout is Facet [F], from the rank 1 alerts capture (sheet key/value boxes). CSS: grid in `css/components.css`, rows in `css/forms.css`.

## Purpose
Key/value pairs: a short term with its value.

## Anatomy
Renders `<dl>` with one `<div>` per pair holding `<dt>` and `<dd>`. Optional `<small>` inside `dd` for a second line.

## Variants & sizes
- Grid (default, `.fc-description`): pairs flow into equal columns of at least 200px; term 14px secondary above a 14px, 500, primary value.
- Rows (`.fc-description[data-layout="rows"]`): a bordered box, one pair per row, the term column about 35%, rows divided by one rule, 40px minimum row height. Under 400px of width the term stacks above the value.
```html
<dl class="fc-description" data-layout="rows" aria-label="Billing">
  <div><dt>Plan</dt><dd>20,000 requests a month</dd></div>
  <div><dt>Webhook</dt><dd class="fc-value-empty">None</dd></div>
</dl>
```

- Compact `[F]` (`.fc-description[data-compact]`): the grid layout, except that a pair with at least 288px of its own width puts the term left (40%) and the value right (60%) on one line. On desktop grids each column is narrower, so terms stay above values; on a phone the single column flips to one line per pair, halving the height. Each pair decides on its own width, so it works in any container (LAY-07).
```html
<dl class="fc-description" data-compact>
  <div><dt>Status</dt><dd><span class="fc-level" data-level="warning">Warned</span></dd></div>
  <div><dt>Ran</dt><dd>4.1s</dd></div>
  <div class="fc-description-wide"><dt>Details</dt><dd>…</dd></div>
</dl>
```
- Wide pair `[F]` (`.fc-description-wide`): spans every column, and always stacks the term above the value. Use it for long values (folded JSON, a sentence). IDs inside a value (`.fc-log-id`) wrap instead of widening the page (CON-14).

## States
- Set values: primary, 500.
- Unset values: the word "None" with `.fc-value-empty` (secondary, 400). No badge, no dash.

## Tokens
`--fc-text-secondary` term and empty value, `--fc-text-primary` value, `--fc-border-default` ring and dividers, `--fc-radius-sm`, `--fc-row-body`.

## Rules
- Use for metadata and configuration a reader audits at once (a source, an alert rule). Use helper text for form hints.
- Keep the dl/dt/dd semantics.
- Terms are sentence-case nouns. Values are sentence case unless they are literal IDs (mono) or times (`.fc-timestamp`).
- Empty reads "None", always the same word.
- The rows box may sit inside a sheet or fieldset as the one inset container there.
- No interactive controls in the term.

## In practice
- Source detail (rows): Source, Status, Plan, Tables, Key (masked), Webhook "None", Alert routing "None", Added.
- Alert rule overview (rows): Trigger, Sources, Channels.
- Detail sheet summary (grid): Owner, Segment, Revenue, Forecast, Score, Delta, Updated.
- Logs run record (compact): Status, Ran, Trigger, Source, Requests, Rows written, Error code, Run ID, then Details as a wide pair.

## Actions variant `[F]`

Key and value rows are static by default. Add `data-actions` when values can change.

- Rows never edit in place. A row whose value can change carries one action in a trailing column (`dd.fc-description-action`): an in-app action link (→) to where the value is owned, such as its form, connection row or key flow.
- The action uses the quiet tone (`data-tone="quiet"`): gray at rest so the value stays the loudest thing in the row, primary on hover.
- "Edit" for a set value, "Add" for None, a named verb when the app already has one ("Rotate", matching "Rotate key").
- Read-only facts (status, names, dates) get no action, so an action always means "this can change".
- Removing happens where the value is owned, behind a confirmation, never from these rows.
- When a whole screen of values is editable, use a fieldset form instead of this list.

## Context row `[F]`

A factor that informs a reading but never moves it reads as context.

- Add `data-context` to the row's `<div>`. The value turns 400 weight and secondary, like the term, and any rank track (`rank-track.md`) or outcome log cells inside it turn gray.
- Tag both kinds in words with a gray subtle badge after the value (`.fc-factor-value` puts value and tag on one line): "Context only" on a context row, "In the score" on a factor the model uses. Tone is never the only cue.
- The helper (`<small>`) states the basis ("1.1 a week over 8 weeks", "Segment average 22.9").
- A helper that dates the value uses `.fc-freshness` instead of `<small>`: status dot plus source and relative time
  ("Warehouse, 5m ago").
- Detail sheet, Context: seat usage (in the score), the segment trend (context only).
