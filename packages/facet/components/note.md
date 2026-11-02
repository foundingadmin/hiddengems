# Note
> Source: https://vercel.com/geist/note (captured 2026-11-02)

## Purpose
An inline, persistent message placed next to the field, card or section it is about.

## Anatomy
- Root `role="note"`, bordered box, radius 6px, content wraps.
- Icon slot (14px, default depends on variant). `icon` replaces it and `icon={null}` removes it.
- `NoteContent`: the message text.
- `NoteLabel`: optional bold 1–2 word prefix inside the content.
- `NoteAction`: optional single action, usually a `Button size="small"`.
- Links inside are medium weight with underline on hover, and get the focus ring on focus-visible.

## Variants & sizes
- `variant`: default (info icon, gray), `success`, `error`, `warning`, `secondary`, `violet`, `cyan`. **No `info` variant exists.**
- Measured colors (outline style): default → border `--ds-gray-400`, text `--ds-gray-900`. `success` → **blue** (border blue-400, text blue-900). `error` → red-400 / red-900. `warning` → amber-400 / amber-900. `secondary` → gray-alpha-400 / gray-alpha-900. `violet` → purple. `cyan` → teal.
- `fill`: background `{color}-200` with border `{color}-100` (measured).
- `size`: `small` | default (medium). Small: padding 6px/8px, min-height 32px (`--ds-size-small`), `text-copy-13`. Medium: padding 6px/12px, min-height 36px (`--ds-size-medium`), `text-copy-14` (measured).
- `disabled`: grays the note out (text gray-700, background gray-100, pointer events off, measured).

## States
Default, filled, disabled. A Note has no dismissed state by design.

## Tokens
`--ds-{gray|blue|red|amber|purple|teal}-400` (border), `-900` (text), `-200` / `-100` (fill), `-1000` (links). `--ds-focus-ring` on links. `text-copy-13` / `text-copy-14`. `--ds-size-small` / `--ds-size-medium` as min-heights.

## Rules
- Use for inline context. Use `ProjectBanner` / `Banner` for page-wide or system-wide messages, `Toast` for transient acknowledgments, and `Modal` for destructive confirmation.
- Choose the variant by meaning: error = must fix, warning = consequence to acknowledge, success = passed check, secondary = neutral.
- Persistent: it stays until the underlying state changes. Do not add a dismiss control.
- One Note per concept. Several Notes stacked on one card means the layout needs rethinking.
- `NoteAction` holds one CTA, never two.
- `NoteLabel` is a 1–2 word Title Case topic (`Rate Limit`). No `Heads Up` or `FYI`. Content is one active-voice sentence that states the impact.

## Hidden Gems usage
- **Data-quality caveats** next to a bet's signal breakdown: `variant="warning" size="small"` with `<NoteLabel>Stale Odds</NoteLabel>` and `Last price from this book is over 30 minutes old.`
- **Model limitations** above a market section (e.g. `Low Sample`: `Fewer than 5 games of usage data for this player.`): default or `secondary`.
- **Responsible-gambling / jurisdiction notices**: `secondary`, persistent, one per page.
- Watch out for `variant="success"` rendering blue. For "positive edge confirmed", decide whether Facet keeps the reference's blue or adds a green-success option (a deviation).
- Use small size in table-adjacent panels. Keep medium for detail sheets.
