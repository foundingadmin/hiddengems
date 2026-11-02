# Snippet
> Source: https://vercel.com/geist/snippet (captured 2026-11-02)

## Purpose
A copyable shell command (or other text to copy exactly) with a copy button.

## Anatomy
- Optional `$` prompt, text (string or array for multi-line), copy button with checkmark feedback. `SecretValue` (masked, revealable secret) is shown on the same page.

## Variants & sizes
- `text` (string | string[]), `width`, `dark` (inverted), `prompt={false}`, `onCopy`, `type` (`success` | `error` | `warning`), `copied` (controlled checkmark), `copyText` (plain payload for rich `text`), `placeholder` (with empty `text`).
- `SecretValue`: `label`, `value`, `defaultRevealed`. Short values stay fully masked. Long values scroll with a fade.

## States
Idle, copied (checkmark), empty with placeholder. SecretValue masked or revealed.

## Tokens
Not specified. Inferred: mono type (`text-copy-13-mono` / `text-label-13-mono`), `--ds-gray-alpha-400` border.

## Rules
- Use for runnable shell commands. Use InlineCode for tokens and CodeBlock for multi-line source.
- Never type the leading `$`. The prompt adds it.
- `prompt={false}` for non-shell content (URLs, JSON).
- Use `copyText` only when `text` has rich nodes. One command per snippet. Use CodeBlock for long scripts.
- Use `copied` plus `onCopy` when a parent surface triggers the copy.

## Hidden Gems usage
- P2. **Copy bet string** (`Kelce o64.5 Rec Yds -115 @DK`) with `prompt={false}`.
- **API key** for a personal data export using `SecretValue`.
