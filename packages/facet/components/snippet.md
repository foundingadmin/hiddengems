# Snippet
> Source: https://vercel.com/geist/snippet (captured 2026-11-02). Facet CSS in `css/forms.css` [F], from the rank 1 dashboard captures (project ID, `ar_default`, cron setup).

## Purpose
A machine value to copy exactly: an ID, a cron expression, a URL, a command. Mono value plus a copy button.

## Anatomy
```html
<span class="fc-label" id="sid-l">Schedule ID</span>
<div class="fc-snippet" role="group" aria-labelledby="sid-l">
  <code class="fc-snippet-value">sch_odds_all_5m</code>
  <button class="fc-button fc-snippet-copy" data-variant="tertiary" data-size="tiny" data-shape="square"
          type="button" aria-label="Copy schedule ID" data-copy>
    <svg class="fc-icon-copy" aria-hidden="true">...</svg><svg class="fc-icon-check" aria-hidden="true">...</svg>
  </button>
  <span class="fc-visually-hidden" aria-live="polite"></span>
</div>
```
- `.fc-snippet`: 36px box, `--fc-border-alpha` ring, radius 6.
- `.fc-snippet-value`: mono 13/20, one line, scrolls sideways inside the box when long (never truncated, so what you see is what you copy).
- `.fc-snippet-copy`: tiny (24px) tertiary icon button. `data-copied` swaps the copy icon for a check.
- Live region inside the snippet: says "Copied" on success, or "Couldn't copy. Select the value and copy it." on failure.

## Variants & sizes
- Boxed (default) and `data-variant="inline"`: no box, for an ID inside a sheet header or a key/value row.
- Upstream props not built: `$` prompt, multi-line, inverted. Use a code block for multi-line source.

## States
Idle; copied (check icon for 2s, live region announces once, then both reset); copy failed (message only, no check).

## Tokens
`--fc-font-mono`, `--fc-text-primary` value, `--fc-text-secondary` button, `--fc-border-alpha`, `--fc-surface-canvas`.

## Rules
- Snippets hold machine values only. Human text and times are never snippets.
- The button's accessible name names the value ("Copy schedule ID"), not just "Copy".
- Never type a leading `$`. One value per snippet.
- The check is a second cue for the live announcement; never rely on the icon alone.

## Hidden Gems usage
- Schedule and provider IDs, cron expressions (Advanced disclosure in the schedule editor), bet strings to paste into a book (`Kelce o64.5 rec yds −115 @DK`).
- Secrets use `components/secret.md`, which builds on this.
