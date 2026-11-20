# Highlight card, strip and score row

Board pieces built only from Facet tokens. CSS in `css/components.css`.

## Highlight card and strip
- `.fc-strip-wrap > .fc-strip[role=list] > .fc-highlight-card.fc-card[role=listitem]`. The strip scrolls sideways with snap; the wrap fades its trailing edge. Back and forward buttons sit in the section head on desktop.
- Head (`.fc-highlight-card-head`): the score mark (`.fc-score[data-size=lg]`), the entity (`.fc-entity-content`, `components/entity.md`), then the value (`.fc-price`) over the delta (`.fc-delta`).
- Body: a `text-heading-14` heading "Why it stands out" and `.fc-reasons`, three reasons. Each reason carries its number; the accent facet only marks the line.
- Foot (`.fc-highlight-card-foot`): when it was found, and Mark read (`.fc-button[data-variant=tertiary][data-size=small]`).

### States
- `data-unread`: a new highlight the reader has not read. Brand tint and edge, and a slow sheen that crosses the card every
  4.2s (a named exception to the one-loop rule, `patterns/moments.md`). Under reduced motion the tint stays and the
  sheen never runs. Removing the attribute fades the tint over 300ms, after `--fc-state-delay` when a moment staggers
  several cards (Mark all read sets 170ms per card so each fades as its cloud passes).
- `data-selected`: the record is selected, such as one picked to compare. A 2px brand edge (`--fc-control-on`). It can sit with `data-unread`.
- The newest unread card carries six circling dots, drawn by `js/dots.mjs` on a stage inside the strip, not by CSS.
- The card label still says the state in words ("Northwind, new highlight"); the tint is never the only cue.

## Score row
- `.fc-score-row`, the phone form of a board row: score, entity with segment and region, then value over delta (`.fc-score-row-end`). A list of them is `.fc-score-list`.

## Value chip
- `.fc-price`: a value on a quiet fill, tabular figures.

## Section head
- `.fc-section-head`: heading and its line left, `.fc-section-head-actions` right; wraps on narrow screens.

## Tab bar
- `.fc-tabbar`: the phone's primary navigation, pinned to the bottom inside `.fc-shell`, shown only under 768px. Three links, icon over label, 44px targets, `aria-current="page"` on the active one, a `.fc-badge[data-size=sm]` count at the icon's shoulder.
