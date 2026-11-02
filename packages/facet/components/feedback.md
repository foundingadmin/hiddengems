# Feedback
> Source: https://vercel.com/geist/feedback (captured 2026-11-02)

## Purpose
Collects short text feedback together with an emoji rating.

## Anatomy
- Trigger (with `label`). Expandable panel with an emoji row, prompt copy, textarea (placeholder fixed to `Your feedback...`) and submit. Optional topic Select (`showTopics`). Optional `metadata` key/values sent with the submission. Optional `prefix` / `suffix` icon.

## Variants & sizes
- Default (popover; **desktop only**), `type="inline"`, `showTopics`, `metadata`, `prefix`, `suffix`, `dryRun` (demo / no submit), `copy` (prompt override).

## States
Collapsed, open, submitting, submitted (panel closes and focus returns).

## Tokens
Not specified by the reference.

## Rules
- Place at the end of a page, doc or completed flow. Not on a surface the user just opened.
- Use topics only when they map to categories the team triages.
- Not a support form, bug intake or NPS replacement.
- Stays collapsed until clicked. Never auto-open.
- Metadata must be non-PII context (route, build ID, plan, viewport).
- Submit closes the panel and returns focus. No extra toast.
- `label` is short sentence case with no `?`. `copy` is sentence case, without "please" or "sorry".

## Hidden Gems usage
- P2. `type="inline"` at the bottom of the bet detail Sheet: `Was this pick useful?` with metadata `{ marketId, modelVersion, week }` to tune signal weights. Desktop popover variant in the app footer.
