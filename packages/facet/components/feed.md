# Feed
> Facet [F]. Built from the rank 1 activity capture, see `reference/inbox-review-2026-11-02/02-dashboard-settings.md`. CSS in `css/lists.css`.

## Purpose
An audit log for one user: what changed, what ran, what failed. Each row reads as a sentence, so it scans faster than a table.

## Anatomy
```html
<div class="fc-feed">
  <section class="fc-feed-group" aria-labelledby="day-0">
    <h4 class="fc-feed-heading" id="day-0">Today</h4>
    <ul class="fc-feed-list" role="list">
      <li class="fc-feed-row">
        <span class="fc-feed-icon" title="Scheduler"><svg aria-hidden="true">...</svg></span>
        <span class="fc-feed-text"><strong>Odds pull</strong> completed for <strong>Week 8</strong>, <strong>31 markets</strong></span>
        <time class="fc-feed-time fc-timestamp" datetime="2026-11-02T17:58-05:00" title="Monday, Nov 2, 2026, 5:58 PM ET">4m ago</time>
      </li>
    </ul>
  </section>
  <button class="fc-button fc-feed-more" data-variant="secondary" type="button">Load more</button>
</div>
```
- Lead: a 16px Lucide icon by actor type (You, Scheduler, Sportsbook, Bet, Alert), secondary gray, aligned to the first line. Bare icon, no tile.
- Sentence: entities, objects and values in `<strong>` (primary, 500); verbs and prepositions plain (secondary). Meaning survives without color.
- Time: right-aligned, 13px secondary, first line. Long sentences wrap; the time stays on line one.
- Groups by day: Today, Yesterday, then "Saturday, Oct 31". A full-width secondary Load more ends the feed.
- No rules between rows; 8px padding per row is the separator (about 36px per line).

## Time rule
- Today: relative ("4m ago", "2h ago").
- Earlier days: clock time only ("7:31 PM"), because the day heading already says the date.
- Always `.fc-timestamp` inside `<time datetime>`, exact time in `title`.

## Rules
- Write rows as past-tense sentences that start with the actor or the object. Old and new values both appear for changes ("changed **max stake** from **$75** to **$50**").
- Never log a secret value; log "added", "rotated", "removed".
- Default filter is all events. Never pre-filter to successes (DESIGN.md rule 4).
- Failures read as failures in words ("failed", "timed out", "rejected"); no red text is needed.
- Filters live in the URL (DESIGN.md rule 10).

## Hidden Gems usage
Settings > Activity: pulls, keys, book connections, setting changes, bet settlements, alerts fired. Security shows a short filtered copy linking here.

## Outcome color `[F]`

Owner question, 2026-11-02. Color the outcome, not the line. It is a rule for every activity-style line: feeds, logs, notifications and timelines.

- Only the one token that is the result takes color (`.fc-feed-outcome[data-tone]`): the money on a settled bet, the verb of a failure.
- `good`: a win or gain, edge green (`+$6.09`). `bad`: a loss, or a failure that is yours to fix, red (`−$7.00`, "rejected"). `warn`: a failure out of your hands, amber ("failed" when a provider timed out).
- The token always carries its own sign or word, so color is never the only cue.
- Icons, actors and the rest of the sentence stay gray. Routine actions (you changed a setting, created a key, disconnected a book) never take color.
- At most one colored token per line. A feed where every line is colored has stopped meaning anything.
- A feed is history, so it never carries the fix. The action lives on the thing's current state (the connection row's "Rotate key").

## Jump to the source `[F]`

Owner question, 2026-11-02. A line whose subject lives elsewhere in the app links to it.

- The subject becomes the line's one link (`a.fc-feed-subject`) and points at the exact record (the FanDuel connection row, the injuries schedule, the alert, the settled bet in History), never the top of a page.
- The link covers the whole row. At rest the gray in-app arrow (→, `--fc-arrow-in`) at the row's end says it opens. On hover the row fills and the arrow darkens and slides through, exactly like the action link.
- Lines with nowhere to go have no arrow, so the arrow always means something.
- Arriving, the record glows in the brand tint for 1.8 seconds and settles (`:target`, `fc-arrive`); reduced motion shows a focus outline instead. Deep links land clear of sticky headers through `--fc-scroll-offset`.

## Source slot `[F]`

Owner request, 2026-11-03. CSS in `css/lists.css` (`.fc-feed-source`). Specimen: `preview/index.html#batch2-forms`.

### Purpose
A dated history row whose record lives outside the app (a commit, a document, a pull request) names where it is recorded, so every line can be checked.

### Anatomy
```html
<li class="fc-feed-row">
  <span class="fc-feed-icon" title="Code"><svg aria-hidden="true">…</svg></span>
  <span class="fc-feed-text"><strong>New gems</strong> row added: a gem joins when its rating reaches 90.</span>
  <a class="fc-link-action fc-feed-source" data-external data-tone="quiet" data-mono
     href="https://github.com/…/commit/8ef17cb" target="_blank" rel="noopener noreferrer">8ef17cb</a>
</li>
```
- The source link takes the time lane: right-aligned, 13/20, on the first line. The day heading carries the date, so the row has no time.
- An external action link (↗) in the quiet tone: secondary at rest, primary on hover and focus, so it never outweighs the sentence (DES-07).
- `data-mono` sets machine labels (a commit SHA) in mono; names of documents stay sans ("Architecture", "PRD 8").
- Under 480px of feed width the source drops under the sentence, aligned with it.

### States
Rest, hover and focus (primary, the arrow passes through; reduced motion keeps it still), narrow (under the sentence).

### Rules
- One source per row, the most specific record (the commit, not the repo). Its label is the record's own short name.
- The link opens a new tab and says so to screen readers (`data-external` adds ", opens in a new tab", INT-27).
- A row with a source never also links its subject (`.fc-feed-subject`); one link per row.
- Rows stay sentences: the change in `<strong>`, then what it did.

### Hidden Gems usage
Rating lab, Update history: each change to the rating or the model, grouped by day, with its commit, document or pull request.
