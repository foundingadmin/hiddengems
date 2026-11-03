# Step list

> Facet component `[F]`. Built for the agent workflow replay (Settings, Agent workflow). CSS in `css/lists.css`.

## Purpose
The ordered steps of a replay or run, with the current one marked. Each step is a button that moves the replay to it.

## Anatomy
```html
<ol class="fc-step-list" aria-label="Workflow steps">
  <li>
    <button class="fc-step" type="button" aria-current="step">
      <span class="fc-step-index">01</span>
      <span class="fc-step-body">
        <span class="fc-step-actor">triage</span>
        <span class="fc-step-text">Reads every open thread and files sprint.json.</span>
        <span class="fc-step-note">One review per sprint, not per branch.</span>
      </span>
      <span class="fc-step-value">+22k</span>
    </button>
  </li>
  <li><button class="fc-step" type="button" data-state="upcoming">…</button></li>
</ol>
```
| Part | Class | Role |
|---|---|---|
| Index | `.fc-step-index` | Two-digit step number, mono, secondary |
| Actor | `.fc-step-actor` | Who acts (an agent or job id), mono, 500. May hold one small badge ("Not reached here") |
| Text | `.fc-step-text` | What happens, one or two sentences, secondary |
| Note | `.fc-step-note` | Optional caveat that changes the reading, primary |
| Value | `.fc-step-value` | What the step costs or yields ("+22k"), tabular. Empty when nothing |

## States
- **Current:** `aria-current="step"`. Fill `--fc-surface-fill` and a 3px `--fc-text-primary` rule on the leading edge, so position never rests on color.
- **Upcoming:** `data-state="upcoming"`. Actor, note and value drop to secondary.
- **Done:** no attribute.
- Hover fills the row; keyboard focus draws a 2px inset brand ring.

## Rules
- The list lives in a panel that scrolls on its own. When the current step changes, scroll the list so it stays in view; never scroll the page (no `scrollIntoView`).
- One rule between rows, none around the list; the panel owns the edge.
- Steps that a scenario skips stay in the list with a badge on the actor line, so the order reads the same in every scenario.

## Hidden Gems usage
Steps of the agent workflow replay, beside its map.
