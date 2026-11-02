# Misc Components
> Source: https://vercel.com/geist/<slug> for each entry below (captured 2026-11-02)

Smaller or less relevant Geist components, grouped here. Each entry follows the standard sections in condensed form.

---

## Textarea (`/geist/textarea`)
- **Purpose:** multi-line text input.
- **Variants & sizes:** `size` `small` | `medium` | `large` (heights not specified; demos set `minHeight: 100`). Also `rows`, `readOnly`, `disabled`, `error` (string), `placeholder`, `aria-label`.
- **States:** default, disabled, read-only, error. Tokens inferred to match Input (gray-alpha rings, red error ring).
- **Rules:** use for wrapping content. Set a generous `rows` value, but never push primary actions below the fold. Validate on blur, and the error replaces helper text. Trim on submit. Title Case labels, example-value placeholders. Errors name field and constraint, end with a period, no "please". Helper text goes in a sibling `<p>` linked by `aria-describedby`.
- **Hidden Gems:** notes field on a tracked bet (P2).

## Clearable Input (`/geist/clearable-input`)
- **Purpose:** Input with a clear button. Escape resets the value.
- **Props:** `value`, `onChange`, `onClear`, `label`, `aria-label`, `cmdk`, `disabled`, `placeholder`.
- **Hidden Gems:** saved-filter name or table quick filter where SearchInput's magnifier is not wanted (P1).

## Destructive Action Modal (`/geist/destructive-action-modal`)
- **Purpose:** confirmation Modal for destructive actions, gated by typing a phrase, with an optional red striped band naming what cannot be undone.
- **Props:** `open`, `title`, `description`, `confirmLabel`, `cancelLabel` (default `Cancel`), `verificationPhrase`, `verificationLabel`, `irreversibleDescription` (omit for reversible actions; the gate remains), `loading` (disables both buttons, spinner on primary), `error` (string or Error; modal stays open), `onConfirm`, `onCancel`.
- **Rules:** use for delete, rotate, revoke, disconnect, downgrade, disabling security. Not for routine confirmations. The input is focused on open, and submit stays disabled until the text matches exactly. Enter only submits when the gate is open. The caller owns `open` and must not close it from inside `onConfirm`. Title and confirm label are the same `Verb + Noun`. For entity deletes the phrase is the resource name. The irreversible line names the action and resource and ends with `cannot be undone.`. Prompt and input use `translate="no"` so browser translation cannot break the match.
- **Hidden Gems:** `Delete Saved Filter` / `Delete Account` (P2).

## Destructive Confirmation Input (`/geist/destructive-confirmation-input`)
- **Purpose:** the type-to-confirm field on its own, for custom destructive layouts. Renders `To confirm, type …` and keeps the phrase exactly as written (no title casing, no translation).
- **Props:** `value`, `onChange`, `onBlur`, `verificationPhrase`, `verificationLabel`, `error`. The ref is forwarded to the `<input>`.
- **Rules:** use it for every type-to-confirm gate, and never build one from Input + `label`, because Label title-cases the phrase. The caller compares with `===`. Mismatch error names the noun (`The project name must match exactly.`). No separate `aria-label`.

## Dots Menu (`/geist/dots-menu`)
- **Purpose:** overflow menu behind a three-dot icon trigger. Children are `MenuItem`s.
- **Props:** `iconSize` (10, 12, 18 in demos), `disabled`. Items support `disabled`.
- **Rules:** see menu.md. Entity and Table rows move extra actions here.
- **Hidden Gems (P0):** row actions in the bet slate and in Entity lists.

## Breadcrumbs (`/geist/breadcrumbs`)
- **Purpose:** shows the current location in the hierarchy.
- **Props:** `Breadcrumb type="text" | "menu"`, `BreadcrumbItem active | disabled`.
- **Hidden Gems:** `Week 9 / KC @ LV / Travis Kelce` on a player or game page (P1).

## Banner (`/geist/banner`)
- **Purpose:** full-width announcement inside its container, with an optional button (`button={{ href, content }}`).
- **Hidden Gems:** feature announcements (`New: Live line-movement alerts`) (P2).

## Project Banner (`/geist/project-banner`)
- **Purpose:** temporary, project-wide notice that needs resolving. Variants: default, `success`, `warning`, `error`.
- **Rules:** cannot be dismissed by design (if it can be dismissed, it should be a Note). One at a time. Always has a `callToAction` that resolves it. `label` is one sentence-case sentence naming the impact.
- **Hidden Gems:** `Odds feed degraded: 3 sportsbooks are delayed.` with `View Status` (P1).

## Error Card (`/geist/error-card`)
- **Purpose:** card communicating an error with `title` and `message`. No other docs.
- **Hidden Gems:** panel-level failure tile in a dashboard grid (P1). Follow error.md copy rules.

## Copy Button (`/geist/copy-button`) and Text With Copy Button (`/geist/text-with-copy-button`)
- **Copy Button:** `textToCopy`, `label` (accessible name) with copied feedback.
- **Text With Copy Button:** `textToCopy`, `textLabel`, `successMessage`, `ellipsis`.
- **Hidden Gems:** copy bet string or market ID next to truncated values (P1).

## Code (`/geist/code`) and Code Block (`/geist/code-block`)
- **Code:** syntax-highlighted code (`syntax="javascript"`).
- **Code Block:** `language`, `filename`, `aria-label`. Highlighted, added/removed and referenced lines, language switcher (optionally tabs), hidden line numbers, `Open in v0`.
- **Rules:** always pass a language. Highlight only the lines under discussion. Use diff props for added and removed lines. Show the filename only when the snippet has a real destination. No `$` prefixes.
- **Hidden Gems:** methodology or API docs pages only (P2).

## File Tree (`/geist/file-tree`)
- `Tree` > `Folder (name, defaultOpen)` > `File (name, href, type)`. Not relevant (skip).

## Address Input (`/geist/address-input`)
- Address search plus country-specific fields (`provider`, `countries`, `errors`, `getAddressErrors`). Not relevant (skip).

## Theme Switcher (`/geist/theme-switcher`)
- Light / System / Dark control (`small`, `disabled`), built on `next-themes`. Place once per app (footer or settings). Do not rebuild it with Switch. **Hidden Gems:** settings or footer (P1, since dark mode matters for long sessions).

## Marketing / irrelevant (skip for Hidden Gems)
- **Phone** (`/geist/phone`): decorative phone frame for screenshots.
- **Browser** (`/geist/browser`): decorative browser frame. Long URLs use Middle Truncate.
- **Video** (`/geist/video`): embedded video with no-loop and no-controls options.
- **Book** (`/geist/book`): decorative book cover for marketing.
- **Brands** (`/geist/brands`): Vercel product logo assets and usage rules.

## Pages that failed to capture
`/geist/icons.md`, `/geist/grid-system.md`, `/geist/geistcn-icons.md` and `/geist/terminal.md` returned 404 ("Not found") on 2026-11-02, both in the original download and on retry. Their content is **not specified** here.
