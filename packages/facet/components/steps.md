# Steps
> Facet `[F]`. Promoted from the approved wireframes (`DesktopHandoff`, `Handoff`; `docs/wireframes/hg-wire.css`). CSS in `css/slip.css`. Specimen: `preview/index.html#slips`.

## Purpose
A short ordered task the reader carries out in turn, often outside the app. Not the stepper (`stepper.md`), which changes a number by one.

## Anatomy
```html
<ol class="fc-steps">
  <li>
    <div class="fc-step-body">
      <h2 class="text-heading-16">Open your slip in DraftKings</h2>
      <p class="text-copy-14">Both legs land in your DraftKings bet slip. The link only adds the picks.</p>
      <a class="fc-button" data-variant="secondary" href="…" target="_blank" rel="noopener noreferrer">Open DraftKings ↗</a>
    </div>
  </li>
</ol>
```
- The number is drawn by a CSS counter in a 32px ring, `text-label-14`, tabular. The body starts 16px to its right, and the heading's first line centers on the ring.
- Steps are split by a hairline with 20px above and below; the first and last steps lose their outer padding.
- The body holds a heading, one line in secondary text, and at most one action (a button or a `.fc-row` of two).

## States
| State | Markup | Look |
|---|---|---|
| Upcoming | none | Gray ring, number |
| Current | `aria-current="step"` on the `li` | Primary ring, number |
| Done | `data-state="done"` on the `li`, plus `<span class="fc-visually-hidden">, done</span>` at the end of the heading | Filled contrast circle with a check |

States are optional. A handoff where every step stays open uses none.

## Rules
- Three to five steps. More than that is a flow, not a list.
- Headings name the action ("Mark it placed"); the line under it says what happens or why.
- An action that leaves the app ends in ↗ and opens a new tab (`link-action.md`).
- Gray only. Done is not a gem or a brand moment.

## Hidden Gems usage
Send to DraftKings: open the slip in DraftKings, set the parlay and stake, mark it placed.
