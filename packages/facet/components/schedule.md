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
  <p class="fc-schedule-last" data-last><span class="fc-schedule-label">Last run</span><a class="fc-time-link" href="/runs/..."><time class="fc-timestamp" datetime="..." title="...">Today 6:00 PM</time><span class="fc-visually-hidden">, odds run log</span></a><span class="fc-schedule-detail">Ran 4.1s</span></p>
  <div class="fc-list-row-actions">
    <button class="fc-button" data-variant="secondary" data-size="small" type="button" aria-label="Run Odds, all books now">Run now</button>
    <button class="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button" aria-label="More actions for Odds, all books" aria-haspopup="menu">...</button>
  </div>
</li>
```
- Lanes: main (fluid) | status (`--fc-schedule-status-w`, 144px) | next run | last run (`--fc-schedule-run-w`, 176px each) | actions (`--fc-schedule-actions-w`, 160px), with 32px gutters (`--fc-schedule-gap`). Owner feedback 2026-11-03: "give these columns more breathing room, they're crammed". Fixed lanes keep equal peers aligned down the list. Lanes and gutters take 784px, so the roomy set applies only above 1150px of list width, where the name keeps 335px or more. From 816px to 1150px the lanes drop to the compact set (112px, 136px, 136px, 136px, 16px gutters), which leaves the name 200px or more; at 815px and under the row stacks. Set the custom properties on the list only when a product needs different lanes. One `.fc-schedule-head` names the columns (owner feedback, 2026-11-02), so rows carry values only; each cell repeats its name in `.fc-schedule-label` for screen readers and the stacked narrow layout.
- Main: the plain-language schedule is the fast path; the cron is the audit path, in mono, secondary, 12px.
- Status words and dots: Succeeded (`live`, green), Failed (`failed`, red), Running (`recent`, blue), Paused (no freshness state, gray). The word always shows.
- Every run time carries its day word ("Today 6:00 PM", "Tue 12:00 AM", "Oct 31 11:00 PM"), so peers in a column read the same way (owner feedback, 2026-11-02).
- Next run: the time in primary, then a countdown in secondary (`<time class="fc-schedule-detail" datetime data-relative data-stamp>`, filled by `stampTimes()` in `js/time.mjs`): "in 5m", "in 6h", "in 1d 6h". Printed once at load, never animated (owner decision, 2026-11-02). A paused row has no countdown. Last run: the time in primary, then what happened in secondary (`.fc-schedule-detail`): "Ran 4.1s" or "Timed out after 30s", never a bare number. A paused row reads Next "None" (`.fc-value-empty`).
- Last run links to that run's log when there is one (`a.fc-time-link` around the `.fc-timestamp`, `[F]` 2026-11-03). The link takes the cell's color with no underline at rest, so the column still reads as values; hover underlines the time only, and keyboard focus draws the Facet ring on a 4px radius (INT-02). A visually hidden suffix names the target (", odds run log"), because "Today 6:00 PM" alone does not say where it goes (CON-18). The detail ("Ran 4.1s") stays outside the link. Navigation, so it is an `<a>` (INT-27).
- Failed: a `.fc-list-row-note` error note under the row says what failed and what is stale. The row already has buttons, so the note's action is link-style, and it is left out when the fix is the row's own button (`components/note.md`, "Link action").
- Menu: Edit, View runs, Pause (or Resume).
- At 815px of list width and under the row stacks: name, then status, then runs on one line, then actions.

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
