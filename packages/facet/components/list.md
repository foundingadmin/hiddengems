# List
> Facet [F]. Built from the rank 1 dashboard captures (tokens, domains, auth, alerts), see `reference/inbox-review-2026-11-02/02-dashboard-settings.md`. CSS in `css/lists.css`.

## Purpose
A bordered, divided list of things the user owns or connects: sportsbooks, data providers, keys, schedules, sessions. Use it when each row is one object with a name, a short meta line, a state and one or two actions. Use a table when rows are compared value by value.

## Anatomy
```html
<ul class="fc-list" role="list" aria-labelledby="books-h">
  <li class="fc-list-row">
    <span class="fc-list-row-lead"><span class="fc-icon-tile" data-size="md"><svg aria-hidden="true">...</svg></span></span>
    <div class="fc-list-row-main">
      <p class="fc-list-row-title">DraftKings</p>
      <p class="fc-meta"><span>412 markets</span><span>Tracking bets</span></p>
    </div>
    <div class="fc-list-row-aside"><span class="fc-status"><span class="fc-status-dot" data-state="live"></span>Connected</span></div>
    <div class="fc-list-row-actions">...</div>
  </li>
</ul>
```
| Slot | Holds | Notes |
|---|---|---|
| `.fc-list-row-lead` | `.fc-icon-tile` (owner decision D1), avatar or checkbox | Optional. Neutral, never colored, one per row |
| `.fc-list-row-main` | `.fc-list-row-title` (14px, 500, primary) over `.fc-meta` | Title truncates with an ellipsis; meta wraps |
| `.fc-list-row-aside` | Status (dot + word), a value or a time | Optional. Tabular figures |
| `.fc-list-row-actions` | At most two visible buttons (small, 32px), or a time plus the overflow menu | The overflow button is `.fc-button` tertiary, small, square, with `aria-label="More actions for {name}"`; its menu is `.fc-dropdown` (`css/shell.css`) |
| `.fc-list-row-note` | One `.fc-note` that belongs to the row | Full width under the title, used for a failed state |

### Meta line
`.fc-meta` joins secondary metadata with one middle dot. Two items at most, in the same order on every row; a third fact belongs in the aside or nowhere. The dot is generated content with empty alt text (`content: "·" / ""`), so screen readers never read "dot", and it trails its item so a wrapped line never starts with a separator.

## Variants & sizes
- Two-line rows (title + meta): 64px (`--fc-row-list`, proposed). Lead uses a 40px tile.
- One-line rows: `data-lines="1"` on the list or the row: 48px (`--fc-row-list-single`, proposed). Lead uses a 32px tile (`data-size="sm"`).
- `data-interactive` on the list: whole-row hover fill for rows that open a detail sheet.
- Narrow: the list is an inline-size container. Under 520px the aside drops under the title; lead, title and actions keep line 1.
- `data-aside="beside"` `[F]` on the list: under 520px a short aside (a result and its amount) stays beside the title, which truncates. Used by History's past slips and the graded slip's legs on phones (LAY-02).

## States
Default, hover (interactive lists only), and per-row state through `data-state` (see `patterns/connections.md`). Status is always `.fc-status` (dot + word), never a dot alone.

## Tokens
`--fc-border-default` ring and dividers (one rule per row, drawn once), `--fc-radius-sm`, `--fc-surface-canvas`, `--fc-surface-fill` hover, `--fc-text-primary` title, `--fc-text-secondary` meta, `--fc-space-3` / `--fc-space-4` padding.

## Rules
- One ring around the list, one rule between rows. No card styling on rows, no nested lists.
- One inset list may sit inside a fieldset or sheet; that is a list container, not a nested card.
- Peer rows share slot order and meta order.
- Bare verbs in row actions ("Connect", "Manage", "Rotate key"), with `aria-label` naming the object when the verb alone is ambiguous ("Connect BetMGM").
- Times in rows use `.fc-timestamp` inside `<time datetime>` with the exact time in `title`.
- Pagination is a full-width secondary "Load more" under the list.

## Hidden Gems usage
Sportsbooks, data providers, schedules (`components/schedule.md`), sessions on Security, alert rules.

## Row links `[F]`

A row that opens a record (a past slip on the phone) puts an `a.fc-row-link` in its title, as table rows do (`css/charts.css`). The link's hit area covers the whole row and `data-interactive` on the list adds the hover fill. The focus ring draws on the row. CSS in `css/slip.css`. Specimen: `preview/index.html#slips`.
```html
<ul class="fc-list" data-interactive role="list" aria-labelledby="past-h">
  <li class="fc-list-row">
    <div class="fc-list-row-main"><p class="fc-list-row-title"><a class="fc-row-link" href="/slips?slip=…">Cook and McLaurin</a></p><p class="fc-meta"><span>Week 8</span><span>$15 parlay</span></p></div>
    <div class="fc-list-row-aside">…</div>
  </li>
</ul>
```
- One link per row, and no other controls in it: the link covers them.

## Lanes `[F]`

Owner feedback, 2026-11-02. Add `data-lanes` to a list whose rows carry status and actions. The aside (status, with its relative time stacked under it in secondary, aligned with the status word rather than its dot) and the actions sit in fixed-width lanes (`--fc-list-aside-w` 136px, `--fc-list-actions-w` 112px), so every status lines up down the list however long the times or buttons are. A row without a status keeps an empty aside to hold its lane. Narrow lists still drop the aside under the title.
