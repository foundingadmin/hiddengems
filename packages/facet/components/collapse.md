# Collapse
> Source: https://vercel.com/geist/collapse (captured 2026-11-02)

## Purpose
An accordion of stacked headings that each open a related section.

## Anatomy
- `CollapseGroup` (`multiple`) > `Collapse` (`title`, `defaultExpanded`, `size`) > content.

## Variants & sizes
- `size="small"`. Default size otherwise. Pixel values **not specified by Geist**.
- `defaultExpanded`. `CollapseGroup multiple` allows several panels open at once (default is one at a time, inferred).

## States
Collapsed, expanded, animated transition.

## Tokens
Not specified. Demo content is `text-copy-16`.

## Rules
- Use for optional, advanced or repetitive content most users skip (FAQ, advanced settings, payload preview). Never collapse primary content.
- A single Collapse for one block. A group for related items. Use Tabs for sibling views.
- Closed by default unless first-time visitors must read it.
- One open at a time for mutually exclusive items. Allow multiple for independent ones.
- Animate the open and close. No nesting deeper than one level.
- Heading is a Title Case topic (`Advanced Settings`, not `Show …`). No destructive actions inside a closed panel.
- Trigger is a `<button>` with `aria-expanded` and `aria-controls`. Enter/Space toggles. Keep content in the DOM when closed.

## Hidden Gems usage
- **Methodology** in the Sheet: `How This Score Is Calculated`, `Raw Model Inputs` (with JsonView inside).
- **Advanced filter settings** on a settings page (`Model Weights`).
- Use `size="small"` in dense side panels.
