# Connections
> Facet [F]. Modeled on the sign-in methods list in the vercel.com app. Built from `components/list.md`.

Sources are connections: the user links them, the product uses them, and they can fail. Each is one `.fc-list-row` whose action follows its state.

## States
| `data-state` | Aside | Actions | Meta line |
|---|---|---|---|
| `available` | Nothing | "Connect": primary when it is the next recommended step, secondary otherwise | What connecting adds ("Adds 296 accounts") |
| `connected`, with its own settings page | Dot + "Connected" | "Manage" (secondary) | Key ending and quota ("Key ending 3f9a · 1,412 of 20,000 requests") |
| `connected` | Dot + "Connected" | "Last used 2m ago" (`.fc-timestamp`) + overflow menu (Test, Rotate key, Disconnect) | Coverage ("412 accounts · Syncing invoices") |
| `failed` | Red dot + "Failed" | Last used + overflow menu | Same as connected |

A failed row adds one `.fc-list-row-note` with an error note: what failed and what it costs the user, plus one action that fixes it. "Billing rejected the key, so its invoices are 3 hours old." with "Rotate key".

## Markup
```html
<li class="fc-list-row" data-state="failed">
  <span class="fc-list-row-lead"><span class="fc-icon-tile" data-size="md"><svg aria-hidden="true">...</svg></span></span>
  <div class="fc-list-row-main">
    <p class="fc-list-row-title">Billing</p>
    <p class="fc-meta"><span>388 accounts</span><span>Syncing invoices</span></p>
  </div>
  <div class="fc-list-row-aside"><span class="fc-status"><span class="fc-status-dot" data-state="failed"></span>Failed</span></div>
  <div class="fc-list-row-actions">
    <time class="fc-timestamp" datetime="2026-11-02T15:04-05:00" title="Monday, Nov 2, 2026, 3:04 PM ET">Last used 3h ago</time>
    <button class="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button"
            aria-label="More actions for Billing" aria-haspopup="menu" aria-expanded="false">...</button>
  </div>
  <div class="fc-list-row-note">
    <div class="fc-note" data-type="error" data-action><svg .../><span>Billing rejected the key, so its invoices are 3 hours old.</span>
      <button class="fc-button fc-note-action" data-variant="secondary" data-size="small" type="button">Rotate key</button></div>
  </div>
</li>
```

## Rules
- Lead: a neutral `.fc-icon-tile`. Use the source's monochrome mark when one is licensed; the plug icon (apps) and database icon (data stores) are the fallback. Never a colored brand logo.
- Status is a dot plus a word. Green "Connected" is success, red "Failed" is failure; nothing else gets color.
- One fixed status vocabulary: Connected, Failed, Paused, Expired.
- Disconnect is the last menu item, in the danger style, and asks for confirmation; it is reversible, so the confirmation says what stops ("Accounts from CRM stop updating").
- Group lists by kind with a label above each ("Apps", "Data stores"); put available connections after connected ones.
- Empty list: "No sources connected." plus "Add source".
- Key values never appear in a connection row; only "Key ending 3f9a". See `components/secret.md`.
