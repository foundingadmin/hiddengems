# Action link

> Facet component `[F]`, owner decision 2026-11-02. CSS in `css/components.css` (`.fc-link-action`).

A standalone text link that ends in an arrow. The arrow says "link", so there is no underline, and text and arrow share one baseline with whatever sits beside them.

```html
<a class="fc-link-action" href="/runs">View runs</a>
<a class="fc-link-action" data-external href="https://..." target="_blank" rel="noopener noreferrer">Provider status</a>
```

**Ingress and egress** (owner decision, 2026-11-02). Exactly two arrows, used by every arrow link and row affordance in Facet (`--fc-arrow-in`, `--fc-arrow-out` in base.css):

| Arrow | Means | Behavior |
|---|---|---|
| → in | Somewhere inside the app | Same tab |
| ↗ out | Somewhere outside the app | New tab (`target="_blank" rel="noopener noreferrer"`); screen readers hear "opens in a new tab" |

**Chevrons stay, arrows go** (owner framing). A chevron advances you within the space you are already in: expand a row, open a select, drill into the next menu level. Nothing is left behind. An arrow takes you out of the current space, to another place in the app (→) or out of it (↗). So a chevron is never used for navigation, and an arrow never for disclosure.

Chevron direction (owner rule): **a chevron points where the new content will appear, and flips when it is open.**

| What opens | Closed | Open | Examples |
|---|---|---|---|
| Content below, in place | Down | Up (rotate 180°) | "Advanced" in the schedule editor, collapse, filter groups in the pull log |
| A menu below | Down | Down (the menu covers it) | Selects, range select, scope switcher |
| A menu level that slides in from the right | Right › | (a back button ‹ returns) | Sidenav "Data" |

- **Hover:** a soft tint of the link's own color (12%) appears behind the text, reaching 4px past it on every side. It is drawn with a box-shadow spread, so nothing moves and the baseline stays put.
- **Hover and keyboard focus:** the arrow slides out through its own 12px box and back in from the opposite side, one quick pass (360ms, swift easing). Right for internal links, up-right for external. Reduced motion keeps it still.
- **Color:** inherits from its context, so it takes a note's severity color and a page header's link blue.
- **Weight:** 500.
- **In a container edge:** where the link sits against a container's edge (a note's right side), its hover surface keeps an equal 4px inset from the top, bottom and side edges with a concentric corner, by growing into the container's padding with negative margins.
- **Where:** note actions (`.fc-note-link`), page header docs links, fieldset footers, failure overlays, card footers. One per container.
- **Not for:** links inside a sentence, which keep their underline so they read as links without the arrow. Destructive actions, which are buttons that confirm.
