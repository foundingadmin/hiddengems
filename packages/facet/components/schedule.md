# Schedule
> Facet [F]. The rank 1 cron screen shows only a kill switch and setup docs; the row and editor are Facet decisions built from the list row. CSS: `.fc-schedule-row` in `css/lists.css`, editor in `css/forms.css`.

## Purpose
Show and edit when odds and injury pulls run, whether the last run worked, and when the next one happens.

## Schedule row
```html
<li class="fc-schedule-head" aria-hidden="true"><span>Schedule</span><span>Status</span><span>Next run</span><span>Last run</span></li>
<li class="fc-list-row fc-schedule-row" data-state="succeeded">
  <div class="fc-list-row-main">
    <p class="fc-list-row-title">Odds, all books</p>
    <p class="fc-meta"><span>Every 5 min on game days</span><span>9 AM to 11 PM ET</span></p>
    <code class="fc-schedule-cron">*/5 9-22 * * 0,1,4</code>
  </div>
  <span class="fc-schedule-status fc-status"><span class="fc-status-dot" data-state="live"></span>Succeeded</span>
  <p class="fc-schedule-next"><span class="fc-schedule-label">Next run</span><time class="fc-timestamp" datetime="..." title="...">Today 6:05 PM</time></p>
  <p class="fc-schedule-last" data-last><span class="fc-schedule-label">Last run</span><time class="fc-timestamp" datetime="..." title="...">6:00 PM</time><span class="fc-schedule-detail">4.1 s</span></p>
  <div class="fc-list-row-actions">
    <button class="fc-button" data-variant="secondary" data-size="small" type="button" aria-label="Run Odds, all books now">Run now</button>
    <button class="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button" aria-label="More actions for Odds, all books" aria-haspopup="menu">...</button>
  </div>
</li>
```
- Lanes: main (fluid) | status (`--fc-schedule-status-w`, 112px) | next run | last run (`--fc-schedule-run-w`, 136px each) | actions. Fixed lanes keep equal peers aligned down the list. One `.fc-schedule-head` names the columns (owner feedback, 2026-11-02), so rows carry values only; each cell repeats its name in `.fc-schedule-label` for screen readers and the stacked narrow layout.
- Main: the plain-language schedule is the fast path; the cron is the audit path, in mono, secondary, 12px.
- Status words and dots: Succeeded (`live`, green), Failed (`failed`, red), Running (`recent`, blue), Paused (no freshness state, gray). The word always shows.
- Next run: the time in primary. Last run: the time in primary, then duration or failure reason in secondary (`.fc-schedule-detail`). A paused row reads Next "None" (`.fc-value-empty`).
- Failed: a `.fc-list-row-note` error note under the row says what failed and what is stale.
- Menu: Edit, View runs, Pause (or Resume).
- Under 640px the row stacks: name and actions, then status, then runs on one line.

## Global pause
The first card on the Schedules page, a `.fc-fieldset`:
- Title "Scheduled pulls", subtitle what it covers, then `.fc-fieldset-consequence` (defined in `settings.css`) in primary text: "Pausing stops every scheduled pull until you turn it back on. Schedules keep their settings."
- Large toggle (`data-size="large"`), named by the title through `aria-labelledby`, described by the consequence through `aria-describedby`. The word beside it carries state ("Enabled" or "Paused") and is `aria-hidden`.
- Footer: scope line "Manual refresh still works." and Save, disabled until the card is dirty; Cancel appears only when dirty.

## Schedule editor
`.fc-schedule-editor`: a two-column grid (one column under 2 x 200px) inside the schedule's fieldset.
- Frequency select (Every minute, 5 min, 15 min, Hourly), Days select (Game days, Tuesday to Saturday, Every day) with a helper defining game days, From and To selects, Time zone select defaulting to the user's zone.
- `.fc-schedule-preview` (`aria-live="polite"`): "Next 3 runs, ET" then the three runs, recomputed on every change. Relative day words: Today, Tomorrow, then the weekday.
- `.fc-schedule-advanced`: a `<details>` "Advanced" holding the cron as a `.fc-snippet`. Raw cron never sits on the fast path.
- Footer: the quota line (cost or quota footer kind), "About 2,200 of 20,000 monthly requests", recomputed live, with ", over the plan limit" when it is.

## Rules
- Times use `.fc-timestamp` (mono) with the exact time in `title`. Cron and IDs are mono too.
- Run now works on paused schedules (it is manual). While running, the button is `aria-disabled` and one polite announcement says when it finishes.
- Run history lives in Activity filtered by Schedules, not in a second log.
- One verb per action everywhere: "Run now", "Pause", "Resume", "Edit".
