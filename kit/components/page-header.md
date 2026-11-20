# Page header
> Source: rank 1 dashboard captures, 2026-11-01. Facet build `[F]`, CSS in `css/shell.css`.

## Purpose
The first row of a page. It either names the page and says what it is for, or, when the top bar already names the page, goes straight to the controls that scope it.

## Forms

### Title form (default)
For pages a reader learns from or visits rarely: History, Sync runs, Alerts.
```html
<div class="fc-page-header">
  <div class="fc-page-header-text">
    <h1 class="text-heading-32">Sync runs</h1>
    <p class="fc-page-header-description text-copy-16">Every scheduled and manual sync, newest first.
      <a class="fc-page-header-link" href="/docs/syncs">How syncs are scheduled<svg …arrow-up-right/></a></p>
  </div>
  <div class="fc-page-header-actions">…range select, one button…</div>
</div>
```
- Title `.text-heading-32`; description `.text-copy-16` in `--fc-text-secondary`, one sentence, 68ch max.
- The optional link is `--fc-text-link` with a 14px arrow, and names the question the doc answers. Never "Learn more about {title}".
- Actions sit level with the 40px title line, on the right. They wrap under the text on narrow screens.

### Controls form (`data-variant="controls"`)
For pages a reader returns to daily, where the top bar breadcrumb already names the page: the Board.
```html
<div class="fc-page-header" data-variant="controls">
  <div class="fc-page-header-scope">…range select, selects…</div>
  <div class="fc-page-header-actions">
    <button class="fc-button" data-variant="secondary" data-size="small">Sync now</button>
    <div class="fc-page-header-overflow">
      <button class="fc-button" data-variant="secondary" data-size="small" data-shape="square"
              aria-label="More actions" aria-haspopup="menu" aria-expanded="false" aria-controls="more">…ellipsis…</button>
      <div class="fc-dropdown" role="menu" id="more" data-align="end" hidden>…</div>
    </div>
  </div>
</div>
```
- Scope controls on the left, in reading order: what am I looking at. Actions on the right: what can I do. The `...` overflow button is always last.
- Controls are 32px (`data-size="small"`). `.fc-select` inside a header sizes to its content.
- Both groups wrap; nothing in the row forces horizontal scroll.

## Rules
- One header per page, one primary (gray-1000) button at most. Most headers need none.
- Scope controls write to the URL (INT-11, INT-24). The week is not repeated here; it lives in the top bar scope switcher.
- No colons in titles or labels. Name a select with `aria-label` ("Renewal window"), not with "Window:" text.
- Overflow menu items are sentence case; items that open a follow-up end with an ellipsis ("Choose columns…", INT-13). A destructive item goes last after a rule, with `data-variant="danger"`.

## In practice
- Board (controls form): range select "Renews in 30 days", Segment, Source | Sync now, `...` (Export CSV, Copy link to this view, Choose columns…, Hide closed accounts).
- Sync runs (title form): "Sync runs", "Every scheduled and manual sync, newest first.", link "How syncs are scheduled" | range select "Last 24 hours", Run now.
- History (title form): range select "Last 4 weeks".
