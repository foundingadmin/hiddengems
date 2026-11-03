# Gem card, strip and gem row

Hidden Gems pieces built only from Facet tokens, promoted from the approved wireframes (`docs/wireframes/hg-wire.css`).

## Gem card and strip
- `.fc-strip-wrap > .fc-strip[role=list] > .fc-gem-card.fc-card[role=listitem]`. The strip scrolls sideways with snap; the wrap fades its trailing edge. Back and forward buttons sit in the section head on desktop.
- Head (`.fc-gem-card-head`): the gem rating mark (`.fc-gem[data-size=lg]`), the player (`.fc-player`), then the price (`.fc-price`) over the edge (`.fc-delta`).
- Body: a `text-heading-14` heading "Why it's a gem" and `.fc-why`, three reasons. Each reason carries its number; the purple facet only marks the line.
- Foot (`.fc-gem-card-foot`): when it was found, and Mark read (`.fc-button[data-variant=tertiary][data-size=small]`).

### States
- `data-unread`: a new gem the reader has not read. Brand tint and edge, and a slow sheen that crosses the card every
  4.2s (a named exception to the one-loop rule, `patterns/moments.md`). Under reduced motion the tint stays and the
  sheen never runs. Removing the attribute fades the tint over 300ms, after `--fc-state-delay` when a moment staggers
  several cards (Mark all read sets 170ms per card so each fades as its cloud passes).
- `data-selected`: the gem is on the slip. A 2px brand edge (`--fc-control-on`). It can sit with `data-unread`.
- The newest unread card carries six circling dots, drawn by `js/dots.mjs` on a stage inside the strip, not by CSS.
- The card label still says the state in words ("Ja'Marr Chase, new gem"); the tint is never the only cue.

## Gem row
- `.fc-gem-row`, the phone form of a board row: rating, player with position and matchup, then price over edge (`.fc-gem-row-end`). A list of them is `.fc-gem-list`.
- `.fc-gem-item` (CSS in `css/slip.css`): a list item holding the row link and its slip button, a small square button (`data-variant="secondary"` with a plus to add, `tertiary` with a check once on the slip). The two share the row's hairline. Never put the button inside the link. A row with no button (Fool's Gold) spans both lanes, so its name and label keep the room.
- The button's accessible name says the action and the player: "Add James Cook to slip", "Remove James Cook from slip".

## Price chip
- `.fc-price`: a decimal price on a quiet fill, tabular figures.

## Section head
- `.fc-section-head`: heading and its line left, `.fc-section-head-actions` right; wraps on narrow screens.

## Tab bar
- `.fc-tabbar`: the phone's primary navigation, pinned to the bottom inside `.fc-shell`, shown only under 768px. Three links, icon over label, 44px targets, `aria-current="page"` on the active one, a `.fc-badge[data-size=sm]` count at the icon's shoulder.
