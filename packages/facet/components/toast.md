# Toast
> Source: https://vercel.com/geist/toast (captured 2026-11-02)

## Purpose
A short, temporary message that confirms something the user just did.

## Anatomy
- Created with `useToasts()`. `toasts.message({ text, preserve?, action?, onAction?, onUndoAction? })`, `toasts.success(text)`, `toasts.warning(text)`, `toasts.error(text)`.
- `text` can be a string or JSX (e.g. `text-heading-14` emphasis, inline Link).

## Variants & sizes
- message (default), success, warning, error. Multi-line. With link. `preserve` (no auto-dismiss). `action` label plus `onAction`. `onUndoAction` (Undo snackbar).
- Sizes **not specified by the reference**.

## States
Entering, visible, auto-dismissed, preserved, action clicked. Renders above Modals and stays interactive.

## Tokens
`--ds-z-toast` 5000 (captured computed tokens). Inferred: tooltip/menu-like floating material.

## Rules
- Use for non-blocking confirmation of user-started actions (`Domain added`). Not alone for billing, permission or build failures. Pair those with a persistent row carrying recovery steps and an ID.
- Field validation belongs on Input. Persistent warnings belong in Note or Banner.
- Pick the method by how the user experienced the event, not by HTTP status (a user-canceled action is `message`, not `success`).
- Auto-dismiss by default. Use `preserve` only when the user must read or act. Undo snackbars stay 5–10s with a single `Undo`.
- Do not stack toasts to narrate a flow. Emit one at the end.
- One sentence, sentence case, no trailing period. Completion pattern `{Noun} {past participle}`, never `successfully`. Errors are two sentences with periods and end with a recovery step (`Couldn’t verify domain. Try again.`).
- Match destructive button verbs 1:1. Undo label is literally `Undo`.
- Region is `aria-live="polite"`. No primary navigation inside toasts.

## Hidden Gems usage
- `Bet tracked` (with `Undo`), `Filter preset saved`, `Auto-refresh enabled`, `Bet details copied`.
- Error: `Couldn’t refresh odds. Try again.`
- Never toast on every background odds refresh. Use the freshness indicator.

## Facet implementation `[F]`
Implemented in `css/components.css` as `.fc-toast-region` and `.fc-toast`.

```html
<div class="fc-toast-region" role="status">
  <div class="fc-toast">
    <span class="fc-toast-text text-copy-14">Leg removed</span>
    <span class="fc-toast-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
    <button type="button" class="fc-button" data-variant="secondary" data-size="small">Undo</button>
  </div>
</div>
```
- The region stays in the DOM and is a polite live region (`role="status"`), so a toast added to it is announced.
  Bottom right on desktop, above the tab bar on phones, `--fc-z-toast`. Menu material, 12px radius.
- Enters with opacity and a short rise (200ms, swift); still under reduced motion.

### Undo toast
- For one restorable change that already happened (`patterns/moments.md`, rule 3). The text names the change
  (`Leg removed`), the button says `Undo`.
- Five brand dots (`--fc-illus-2`) count `--fc-duration-undo` (5s) down, one per second, last first. They are
  `aria-hidden`; the time is not announced.
- `mountUndo(toast, { onExpire })` from `js/undo.mjs` runs the countdown. It holds while the pointer is over the toast
  or focus is inside it, so Undo stays reachable by keyboard, and resumes when both leave. Reduced motion keeps the
  countdown; only the dots' shrink is instant. The app's React wrapper is `apps/web/lib/moments/undo-toast.tsx`,
  shown through `useMoments().undo(text)`.
- One at a time. A new Undo replaces the old one, which then counts as expired.
- Undo plays the change's motion in reverse.

