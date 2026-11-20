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

## In practice
- **Checks list** in the detail Sheet: each row is one check (left: source icon; title `Usage trend`; description `+6% over last 3 weeks`; right: `Badge` Positive/Negative + weight).
- **Watched accounts list** with a `Remove account` secondary small button on the right.
- **Notes** (qualitative signals): left source icon, title headline, description `Support desk · 2h ago` (RelativeTimeCard), right sentiment Badge.
- Use Table instead of Entity for the main board.

## Facet implementation `[F]`
Implemented in `css/data.css`.

```html
<ul class="fc-entity-list" aria-labelledby="sources-h">
  <li class="fc-entity">
    <span class="fc-icon-tile" data-size="md"><svg …/></span>
    <div class="fc-entity-content">
      <p class="fc-entity-title">CRM</p>
      <p class="fc-entity-desc"><span class="fc-status-dot" data-state="stale" aria-hidden="true"></span>Stale, updated 19m ago</p>
    </div>
    <span class="fc-entity-meta">24 tables</span>
    <div class="fc-entity-actions"><button class="fc-button" data-variant="secondary" data-size="small">Refresh</button> …overflow button…</div>
  </li>
</ul>
```
- Row: 16px padding and gap, 72px minimum height [G]. Title 14px semibold, description and meta 14px secondary, all tabular.
- Leading visual: `.fc-icon-tile` (neutral, one per item), an avatar, or a `.fc-check` for selectable lists. Sources use a neutral tile, never a brand logo in Facet specimens.
- `.fc-entity-list` draws one 8px-radius ring and inset hairlines between rows. `button.fc-entity` makes the whole row clickable.
- Actions: at most two, the overflow menu last. Show a direct action only where it applies (Refresh on a stale source).
- Under 480px the description wraps instead of cutting a state word, and `.fc-entity-meta` steps aside.
