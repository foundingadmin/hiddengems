# Action link

> Facet component `[F]`, owner decision 2026-11-02. CSS in `css/components.css` (`.fc-link-action`).

A standalone text link that ends in an arrow. The arrow says "link", so there is no underline, and text and arrow share one baseline with whatever sits beside them.

```html
<a class="fc-link-action" href="/runs">View runs</a>                          <!-- arrow right: stays in the app -->
<a class="fc-link-action" data-external href="https://...">Provider status</a> <!-- arrow up-right: leaves the app -->
```

- **Hover:** a soft tint of the link's own color (12%) appears behind the text, reaching 4px past it on every side. It is drawn with a box-shadow spread, so nothing moves and the baseline stays put.
- **Hover and keyboard focus:** the arrow slides out through its own 12px box and back in from the opposite side, one quick pass (360ms, swift easing). Right for internal links, up-right for external. Reduced motion keeps it still.
- **Color:** inherits from its context, so it takes a note's severity color and a page header's link blue.
- **Weight:** 500.
- **Where:** note actions (`.fc-note-link`), page header docs links, fieldset footers, failure overlays, card footers. One per container.
- **Not for:** links inside a sentence, which keep their underline so they read as links without the arrow. Destructive actions, which are buttons that confirm.
