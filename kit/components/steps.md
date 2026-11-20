# Steps
> Facet `[F]`. CSS in `css/flows.css`.

## Purpose
A short ordered task the reader carries out in turn, often outside the app. Not the stepper (`stepper.md`), which changes a number by one.

## Anatomy
```html
<ol class="fc-steps">
  <li>
    <div class="fc-step-body">
      <h2 class="text-heading-16">Create a read-only key in Billing</h2>
      <p class="text-copy-14">The key reads invoices and plans. It cannot change anything.</p>
      <a class="fc-button" data-variant="secondary" href="…" target="_blank" rel="noopener noreferrer">Open Billing ↗</a>
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
- Headings name the action ("Paste the key"); the line under it says what happens or why.
- An action that leaves the app ends in ↗ and opens a new tab (`link-action.md`).
- Gray only. Done is not a highlight or a brand moment.

## In practice
Connect a source: create a read-only key in Billing, paste the key, run the first sync.
