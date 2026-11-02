# Connections
> Facet [F]. From the rank 1 authentication capture (sign-in methods list), see `reference/inbox-review-2026-11-02/02-dashboard-settings.md`. Built from `components/list.md`.

Sportsbooks and data providers are connections: the user links them, Hidden Gems uses them, and they can fail. Each is one `.fc-list-row` whose action follows its state.

## States
| `data-state` | Aside | Actions | Meta line |
|---|---|---|---|
| `available` | Nothing | "Connect": primary when it is the next recommended step, secondary otherwise | What connecting adds ("Adds 296 markets") |
| `connected`, with its own settings page | Dot + "Connected" | "Manage" (secondary) | Key ending and quota ("Key ending 3f9a · 1,412 of 20,000 requests") |
| `connected` | Dot + "Connected" | "Last used 2m ago" (`.fc-timestamp`) + overflow menu (Test, Rotate key, Disconnect) | Coverage ("412 markets · Tracking bets") |
| `failed` | Red dot + "Failed" | Last used + overflow menu | Same as connected |

A failed row adds one `.fc-list-row-note` with an error note: what failed and what it costs the user, plus one action that fixes it. "FanDuel rejected the key, so its odds are 3 hours old." with "Rotate key".

## Markup
```html
<li class="fc-list-row" data-state="failed">
  <span class="fc-list-row-lead"><span class="fc-icon-tile" data-size="md"><svg aria-hidden="true">...</svg></span></span>
  <div class="fc-list-row-main">
    <p class="fc-list-row-title">FanDuel</p>
    <p class="fc-meta"><span>388 markets</span><span>Tracking bets</span></p>
  </div>
  <div class="fc-list-row-aside"><span class="fc-status"><span class="fc-status-dot" data-state="failed"></span>Failed</span></div>
  <div class="fc-list-row-actions">
    <time class="fc-timestamp" datetime="2026-11-02T15:04-05:00" title="Monday, Nov 2, 2026, 3:04 PM ET">Last used 3h ago</time>
    <button class="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button"
            aria-label="More actions for FanDuel" aria-haspopup="menu" aria-expanded="false">...</button>
  </div>
  <div class="fc-list-row-note">
    <div class="fc-note" data-type="error" data-action><svg .../><span>FanDuel rejected the key, so its odds are 3 hours old.</span>
      <button class="fc-button fc-note-action" data-variant="secondary" data-size="small" type="button">Rotate key</button></div>
  </div>
</li>
```

## Rules
- Lead: a neutral `.fc-icon-tile` (owner decision D1). Use the book's monochrome mark when one is licensed; the ticket icon (books) and database icon (providers) are the fallback. Never a colored brand logo.
- Status is a dot plus a word. Green "Connected" is success, red "Failed" is failure; nothing else gets color.
- One fixed status vocabulary: Connected, Failed, Paused, Expired.
- Disconnect is the last menu item, in the danger style, and asks for confirmation; it is reversible, so the confirmation says what stops ("Odds from BetMGM stop updating").
- Group lists by kind with a label above each ("Sportsbooks", "Data providers"); put available connections after connected ones.
- Empty list: "No books connected." plus "Add sportsbook".
- Key values never appear in a connection row; only "Key ending 3f9a". See `components/secret.md`.
