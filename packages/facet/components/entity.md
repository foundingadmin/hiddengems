# Entity
> Source: https://vercel.com/geist/entity (captured 2026-11-02)

## Purpose
A one- or two-column row: descriptive content on the left, related controls or actions on the right.

## Anatomy
- `EntityList` (list wrapper) > `Entity` (`as="li"` / `as="button"`, `left`, `right`, `leftClassName`, `rightClassName`, `onClick`) > `EntityContent` (`title`, `description`, `fill`).
- `left` slot: avatar, icon or checkbox. `right` slot: text or one or two controls.

## Variants & sizes
- Default, with Skeleton content, as a list, list with leading Checkbox (row is a button), `fill` (content takes the remaining space), custom column classes.
- Measured: list card has a `--ds-gray-alpha-400` border and 8px radius. Row padding 16px, 16px gaps. Title `text-copy-14` semibold, truncated. Description `text-copy-14` `--ds-gray-900`, truncated. Right-side text `text-copy-14` `--ds-gray-900`.

## States
Default, loading (skeleton variant), selectable (checkbox), clickable (`as="button"`).

## Tokens
`--ds-gray-alpha-400`, `--ds-gray-900`, `text-copy-14`, 8px radius (`rounded-lg`).

## Rules
- Use for descriptive rows with one or two controls. Use Table for sortable same-shape data and Description for static key/value.
- At most one or two controls on the right. Put the rest in a `DotsMenu`.
- Multi-select rows: the leading Checkbox has `aria-label="Select {entity name}"`.
- Show the skeleton variant while loading, never an empty row.
- Left column leads with an identifier (avatar or icon), then a Title Case label, then sentence-case metadata.
- Right-side buttons are `Verb + Noun`.

## Hidden Gems usage
- **Signals list** in the bet Sheet: each row is one signal (left: source icon; title `Target share trend`; description `+6% over last 3 games`; right: `Badge` Positive/Negative + weight).
- **Tracked bets list** with a `Remove Bet` secondary small button on the right.
- **News items** (qualitative signals): left source logo, title headline, description `ESPN · 2h ago` (RelativeTimeCard), right sentiment Badge.
- Use Table instead of Entity for the main slate.
