# Error
> Source: https://vercel.com/geist/error (captured 2026-11-02)

## Purpose
An inline error message block for a resource or section that failed to load.

## Anatomy
- Error icon, optional bold `label` prefix (default label shown; `label="..."` replaces it; `label={false}` hides it), message text.
- With `error={{ message, action, link }}`: message plus an action link.

## Variants & sizes
- `size`: `small` | default | `large`. Pixel values **not specified by Geist**.
- Examples import both `Error` and `GeistError`.

## States
Static.

## Tokens
Not specified on this page. The Input's inline error (measured) uses a red octagon icon with the message, and `--ds-red-900` is used for error rings. Inferred: `--ds-red-900` text, `text-copy-13`/`14`.

## Rules
- Use as a block when a panel, card or route failed to load. Use `toasts.error()` for transient action failures and the Input `error` prop for field validation.
- System errors always include a stable ID (request ID, trace ID) on a monospace line, collapsed under `<details>`. User-state errors (validation, permission) do not need one.
- The recovery action must be concrete (`Try Again` if safe to retry, otherwise a named verb such as `Reconnect GitHub`). No silent background auto-retry.
- Full-page route errors move focus to `Try Again`.
- Say what happened, then what to do. No `Oops` or `Unfortunately`. Use `Couldn’t` / `Can’t` for user-state errors and `Failed to` for system errors. Never title an error `Something Went Wrong`. Name the resource (`Couldn’t Load Deployments`). Never joke.
- Async errors go in an `aria-live="polite"` region. Use `assertive` only for blocking errors.

## Hidden Gems usage
- **Odds feed failure in a panel**: `Couldn’t load odds from BetMGM.` with `Try Again` and a collapsed request ID.
- **Model run failure**: `Failed to score Week 9 slate. Model timed out.` with run ID.
- One failing book should not block the slate. Show `–` in its cells plus a small Error or Note above the table naming the book.
