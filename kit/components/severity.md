# Severity

> Facet component `[F]`. Severity levels appear in the vercel.com New monitor flow (captured 2026-11-01); the bar glyph is a Facet decision. CSS in `css/charts.css`.

## Purpose
States how serious an alert is, as a rising count of bars plus a word.

## Anatomy
```html
<span class="fc-severity" data-level="3">
  <span class="fc-severity-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>High
</span>
```
Four 3px bars rising 4, 7, 10 and 12px, 2px apart. The first `data-level` bars fill; the rest stay `--fc-surface-fill-active`. Word 13/16, 500.

## Levels
| `data-level` | Word | Bars | Color |
|---|---|---|---|
| 1 | Low | 1 | gray (`--fc-chart-5`), word secondary |
| 2 | Medium | 2 | gray, word secondary |
| 3 | High | 3 | `--fc-status-warning-solid`, word warning fg |
| 4 | Critical | 4 | `--fc-status-error-solid`, word error fg |

## Rules
- Red only at the highest level. If everything is red, nothing is.
- Always show the word; the bar count and the word carry the level without color.
- Severity is a property of an alert, not a verdict on a record. Never use it for go, wait or stop (`.fc-signal`) or for scores (`.fc-score`, whose facets it must not imitate).
- Sort alert lists by severity, then time, and say so in the caption.

## In practice
Alerts list and alert rules: a failed source is Critical, a delta above the alert level is High, a quota crossing 80% is Medium, an owner change is Low.
