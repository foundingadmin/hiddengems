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
- Links inside take the note's color, are medium weight with underline on hover, and get the focus ring on focus-visible.

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
- `NoteLabel` is a 1 to 2 word sentence case topic (`Rate limit`). No `Heads up` or `FYI`. Content is one active-voice sentence that states the impact.

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

## Link action `[F]`

Owner feedback, 2026-11-02. A note that needs a next step always offers one; the reader should never have to guess that the fix lives in a row's overflow menu.

- **Button** (`data-action` + `.fc-note-action`): the fix is yours and the note stands alone ("Rotate key", "Retry").
- **Link** (`a.fc-note-link.fc-link-action`): a short action link with an arrow, no underline (`components/link-action.md`), hugging the note's right edge, outside the message. Use it inside dense rows where a button would compete with the row's own buttons, and for problems out of your hands, where the step is to follow, not fix ("Provider status", with an arrow when it leaves the app). See `patterns/failures.md`.
- **Link-style button** (`button.fc-note-link`) `[F]`, 2026-11-03: the link's look for an action that happens in place, such as an in-row fix that runs a job. A fix is an action, not navigation, so it is a `<button type="button">`, never an `<a>` styled as one (INT-27, CON-20). Same color, weight 500, right-edge position, 4px inset hover tint and concentric corner (DES-03) as the link; no arrow, because the arrow means the action takes you somewhere. While it works it shows a small spinner and carries `aria-busy="true"` (INT-09).
- One action per note, button or link, never both. The CTA never repeats the message.
- **In dense rows** (a list row that already has buttons), the note's action is link-style (`a.fc-note-link` or `button.fc-note-link`), never a second solid button. It never repeats the row's own action: if the fix is the row's button ("Pull now"), the note carries no action and the row's button is the fix. Keep a note action only when it does more than the row can, such as a fix in several steps ("Pull rosters, then results").
- **Links adopt the note's color** (owner decision, 2026-11-02), so the CTA reads at the same severity as the message: amber in a warning, red in an error, blue in info, gray in a default note. Weight 500, the arrow and the right-edge position separate it from the message, so color is never the only cue. Buttons (`.fc-note-action`) stay neutral, like every button.
```html
<!-- Navigation: an arrow link -->
<div class="fc-note" data-type="warning" data-size="small"><svg aria-hidden="true">...</svg><span>SportsDataIO timed out, so injuries are from Saturday.</span><a class="fc-note-link fc-link-action" data-external href="https://status.sportsdata.io" target="_blank" rel="noopener noreferrer">Provider status</a></div>
<!-- An action in place, inside a row that already has buttons -->
<div class="fc-note" data-type="warning" data-size="small"><svg aria-hidden="true">...</svg><span>2 players are not on a roster yet.</span><button class="fc-note-link" type="button">Pull rosters, then results</button></div>
```
- Keyboard and screen readers: the link-style button is in the tab order, takes the Facet focus ring (INT-01, INT-02) and is named by its visible label, so the label says the whole action (CON-18, CPY-14). Hover adds the tint and never moves the layout (DES-07).
- **Never put a destructive action in a note link.** Red already means error and destructive; a red "Delete" link would read as both. Destructive actions are buttons that confirm.

## Brand note `[F]`

`data-type="brand"` tints the note with the brand accent (`--fc-brand-*`). It is for guidance and brand moments only, such as a lesson's test question or an onboarding tip, never for a status: status keeps its own hues.
