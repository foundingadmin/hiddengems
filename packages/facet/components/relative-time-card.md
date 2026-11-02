# Relative Time Card
> Source: https://vercel.com/geist/relative-time-card (captured 2026-11-02)

## Purpose
Shows a short relative time (`2m ago`). Hovering opens a popover with the exact local and UTC time.

## Anatomy
- Trigger: the formatted relative time, or custom `children`.
- Popover (`side`) with absolute UTC and local time.

## Variants & sizes
- Props: `date` (number, Unix ms), `side` (e.g. `top`), `children` (only for non-time labels).
- Canonical short forms: `2m`, `5h`, `Yesterday`. The formatter adds ` ago` itself.

## States
Idle, hover/focus (popover open).

## Tokens
Not specified by the reference. Inferred: popover material (`--ds-shadow-menu` or tooltip shadow), `text-label-13` / `text-copy-13`.

## Rules
- Use for recent timestamps in scannable places (Table cells, Entity rows, feeds). In prose, write absolute dates (`Mar 14, 2026`) once older than 7 days.
- Pass a number. Do not pre-format, and do not replace `children` with a formatted string.
- Never add `ago` after it (`2m ago ago`).
- Use `children` only for states such as `Just now`, `Pending`, `Queued`.
- Add a leading label when the context is unclear (`Last deploy <RelativeTimeCard/>`). Do not repeat absolute time elsewhere in the row.

## Hidden Gems usage
- **Odds last updated** in each slate row (`Updated` column) and next to the freshness indicator.
- **Line moved** times in Line History (`Moved 18m ago`).
- **News published** times on qualitative signals.
- Hidden Gems note: odds go stale within minutes. Pair the time with freshness color (Badge or Facet StatusDot extension) once older than the stale threshold. The card itself carries no staleness color.

## Facet implementation `[F]`
Implemented in `css/data.css` as `.fc-time` (trigger) and `.fc-time-card` (popover).

```html
<p class="fc-status"><span class="fc-status-dot" data-state="live" aria-hidden="true"></span>
  <span>Odds updated <time class="fc-time fc-has-tip" datetime="2026-11-02T18:31:25Z" tabindex="0" aria-describedby="odds-time">2 min ago</time></span></p>
<div class="fc-time-card fc-float" popover="manual" role="tooltip" id="odds-time">
  <dl class="fc-time-rows">
    <div class="fc-time-row"><dt class="fc-time-zone">MST</dt><dd class="fc-time-date">Nov 2, 2026</dd><dd class="fc-time-clock">11:31:25 AM</dd></div>
    <div class="fc-time-row"><dt class="fc-time-zone">UTC</dt><dd class="fc-time-date">Nov 2, 2026</dd><dd class="fc-time-clock">6:31:25 PM</dd></div>
  </dl>
</div>
```
- Times, relative and absolute, are Facet Mono (owner decision, 2026-11-02).
- The trigger is a focusable `<time>` with the dotted tip underline. Freshness pairs it with a status dot; the card itself carries no staleness color.
- The card lists the viewer's zone first, then UTC (deviation: the reference lists UTC first; Hidden Gems kickoffs are local). When the viewer is on UTC, show one row.
- `.fc-time-card-head` is optional. Leave it out when it would only repeat the trigger text.
- Tooltip material: 6px radius, `--ds-shadow-tooltip`, 8px by 12px padding, zone chips on `--fc-surface-fill`, three-column grid shared by both rows.
- Opens on hover after a short delay and on keyboard focus, stays open while the pointer is over it, and Escape closes it (WCAG 1.4.13). It is a `popover` placed by script, so a scrolling table never clips it.
- Render times on the client only to avoid hydration mismatch (AGT-02); format with `Intl.DateTimeFormat` in the viewer's locale (CON-15).
