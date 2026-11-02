# Secret
> Facet [F]. The rank 1 tokens screen never lists key values; the one-time reveal is a Facet decision. CSS in `css/forms.css`, built on `.fc-snippet`.

## Purpose
A key the user must protect. It is shown in full exactly once, when it is created, then only its last 4 characters ever appear again.

## Anatomy
New (the only time the full value exists in the page):
```html
<div class="fc-secret" data-state="new">
  <div class="fc-snippet" role="group" aria-labelledby="key-l">
    <code class="fc-snippet-value">hg_live_9f3K...7e4c</code>
    <button class="fc-button fc-snippet-copy" ... aria-label="Copy export key" data-copy>...</button>
    <span class="fc-visually-hidden" aria-live="polite"></span>
  </div>
  <div class="fc-note" data-type="warning"><svg .../><span>Hidden Gems shows the full key only once.</span></div>
  <div><button class="fc-button" data-size="small" type="button">Done</button></div>
</div>
```
Masked (every view after creation):
```html
<div class="fc-secret" data-state="masked">
  <div class="fc-secret-row">
    <div class="fc-snippet" role="group" aria-labelledby="key-l">
      <code class="fc-snippet-value" aria-label="Key ending 8c21"><span class="fc-secret-mask" aria-hidden="true">•••• •••• ••••</span> 8c21</code>
    </div>
    <button class="fc-button" data-variant="secondary" data-size="small" type="button">Rotate key</button>
  </div>
  <p class="fc-meta"><span>Added Oct 2</span><span>Last used 4m ago</span></p>
</div>
```

## Variants & sizes
- `data-state="new"`: the value wraps so all of it is visible; warning note; Copy; Done.
- `data-state="masked"`: last 4 only, no Copy (there is nothing useful to copy), Rotate key beside it, `.fc-meta` with added and last used.

## States
New, masked. Leaving the page or pressing Done moves to masked. There is no Reveal control.

## Tokens
Those of `.fc-snippet`, plus `--fc-text-secondary` for the mask and the warning note tokens (`--fc-status-warning-*`, amber is caution).

## Rules
- Never re-show a saved key. On Done, remove the full value from the DOM, not just hide it; the server never returns it again.
- The masked value's accessible name is "Key ending 8c21"; the dots are `aria-hidden`.
- Keys the user pastes (provider keys) go straight to masked after Save; only keys Hidden Gems generates have a new state.
- Rotating creates a new key (new state again) and ends the old one; say so in the confirmation.
- The activity feed logs "key added", "rotated" and "removed", never the key.

## Hidden Gems usage
Export API key (generated, new then masked). Provider keys for The Odds API and SportsDataIO (pasted, masked only).
