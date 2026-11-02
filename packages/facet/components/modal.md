# Modal
> Source: https://vercel.com/geist/modal (captured 2026-11-02)

## Purpose
A blocking dialog for a decision the user must make before going back to the page.

## Anatomy
- `Modal` (`active`, `onClickOutside`, `sticky`, `initialFocusRef`).
- `ModalBody` > `ModalHeader` (`ModalTitle`, `ModalSubtitle`) + content. `ModalInset` (`last`) is an inset content band.
- `ModalActions` > `ModalAction` (`variant="secondary"`, `disabled`, `fullWidth`, `prefix`, `ref`).
- Becomes a bottom sheet on mobile viewports.

## Variants & sizes
- `sticky`: header and actions stay pinned while long content scrolls.
- Single full-width action. Disabled primary. Inset section. Initial focus control (button or input).
- No width or size prop is shown on the page (**not specified by the reference**).

## States
Closed, open, submitting (use action `disabled` / loading), error inside (focus stays), mobile bottom-sheet.

## Tokens
`material-modal`: radius 12px, `--ds-shadow-modal`. Overlay backdrop `--ds-overlay-backdrop-color` with `--ds-overlay-backdrop-opacity` .8, `--ds-motion-overlay-duration` .3s, `--ds-motion-overlay-scale` .96, `--ds-z-modal` 300 (captured computed tokens). Body copy is likely `text-copy-16` ("used in simpler, larger views like Modals", typography page) or `text-copy-14` (inferred).

## Rules
- Use when a decision must block the page. Use `Sheet` (desktop) or `Drawer` (mobile) for persistent side context. Skip Modal for create flows that have their own page.
- Destructive confirmations happen in a Modal, never a Drawer or Sheet. For high-stakes actions use the typed confirmation (`DestructiveActionModal`, see misc.md).
- Default focus goes to `Cancel` in destructive modals. Enter must never trigger a destructive action without typed confirmation.
- Escape and outside click dismiss non-destructive modals. Block dismissal when a destructive modal has unsaved input.
- Trap focus and return it to the trigger. Restore body scroll on unmount.
- Toasts render above the modal and stay interactive. The focus trap does not block them.
- The title is a sentence case statement, never a question. Body is 1 to 3 sentences, consequence first. Primary action is `Verb + Noun` matching the title. Cancel stays `Cancel`. Acknowledgement-only modals use `Done`.
- Irreversible flows end with `This cannot be undone.`. Partial-cascade flows end with `Some effects cannot be undone.`.
- `aria-labelledby` points to the title.

## Hidden Gems usage
- Rare in a research dashboard. Use for `Save filter preset` (name input with `initialFocusRef`), `Delete saved filter` (destructive, Cancel focused), and first-run responsible-gambling acknowledgement (`Done`).
- Never use Modal for bet details. Those go in `Sheet` so the slate stays visible.
