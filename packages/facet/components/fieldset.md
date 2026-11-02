# Fieldset
> Source: https://vercel.com/geist/fieldset (captured 2026-11-02)

## Purpose
A bordered card that groups related form controls, with an optional footer for status and actions.

## Anatomy
- `Fieldset` (`type`) > `FieldsetContent` (`disabled`) > `FieldsetTitle`, `FieldsetSubtitle`, controls, `ErrorText` / `WarningText`, `DisabledWall`.
- `FieldsetFooter` (`highlight`) > `FieldsetFooterStatus` (left text/link) + `FieldsetFooterActions` > `FieldsetFooterAction` (`variant="secondary"`).

## Variants & sizes
- `type`: default | `error` | `warning`.
- Without footer, without title, long content, multiple fieldsets stacked (24px gap in demo), disabled content with a highlighted footer explaining why, `DisabledWall` overlay for gated content.

## States
Default, disabled (content), error, warning, gated.

## Tokens
Not specified. Inferred: `material-base` (6px radius) or medium (12px), `--ds-gray-400` border, `--ds-background-200` footer, `text-heading-20` title, `text-copy-14` subtitle.

## Rules
- No best-practices section. The demos imply: footer actions are `Verb + Noun` (`Save Changes`, `Update Payment Method`). The disabled state always explains why in the highlighted footer. Footer status shows context (`Last updated…`).

## Hidden Gems usage
- **Settings page** cards: `Default Stake` (Input + Save), `Sportsbooks I Use` (MultiSelect + Save), `Model Weights` (Sliders + Apply Changes). Use `type="warning"` for `Changing weights re-scores the whole slate.`
