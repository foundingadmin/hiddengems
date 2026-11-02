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

## Choosing a note in Facet

Color comes from what the note means, and fill comes from how urgent it is. Start gray and hollow. The live matrix is in the Components section of `preview/index.html`.

| Type | When | Hollow (in context) | Filled (act now, one per view) |
|---|---|---|---|
| Default (gray) | Context with no state: method, source or scope | Estimates use the last 3 to 7 games, so treat small gaps as directional. | Sample data. These picks are not this week's slate. |
| Info (blue) | How something works, or what happens next | Odds refresh every 5 minutes on game days. | Inactives post at 9:30 AM MT, and verdicts update on their own. |
| Success (green) | A check the reader started has passed | All 3 books refreshed. | Slate locked with 7 picks and $50 staked. |
| Warning (amber) | A consequence to weigh before acting | Gesicki depends on Chase and Higgins playing. | The line moved past our fair price. [Re-check] |
| Error (red) | A problem to fix, or data that failed | Couldn't load Burke's snap counts. | FanDuel failed to refresh, so its prices are 3 hours old. [Retry] |

- **Hollow** is the default: it sits beside the thing it describes and is read when relevant.
- **Filled** is for a note that must win attention because it blocks the next decision or can't be missed. One filled note per view; a second one means the page needs restructuring.
- **Color** follows the hue allocation in `DESIGN.md`. Success is green in Facet (the reference renders it blue).
- Freshness on a value uses a status dot, not a note. A note appears only when stale or failed data changes what the reader should do.
- No title. One sentence in active voice naming the impact; an optional 1 to 2 word label never repeated by the sentence. Small size in table-adjacent panels, default size in detail views.
