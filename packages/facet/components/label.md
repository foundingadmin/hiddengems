# Label
> Source: https://vercel.com/geist/label (captured 2026-11-02)

## Purpose
An accessible text label for a form control.

## Anatomy
- `Label` (`id`, `value`, `withInput`, `bypassCasing`). It can also wrap a control as children (see combobox.md modal example: `<Label value="Region"><Combobox/></Label>`).

## Variants & sizes
- `withInput`: spacing and layout for sitting above an Input (inferred).
- `bypassCasing`: turns off the automatic Title Casing (the default casing turns `Email address` into Title Case).

## States
Static.

## Tokens
Not specified. Combobox demo uses `text-label-14 text-gray-900` for a hand-rolled label.

## Rules
- No best-practices section. Related rules: Label title-cases its text, so **never** use it for type-to-confirm prompts (see misc.md, Destructive Confirmation Input). Pair with the control through `id` and `aria-labelledby` / `htmlFor`.

## Hidden Gems usage
- Labels for settings fields (`Default Stake`, `Min Edge`). Use `bypassCasing` for labels containing book or brand names with fixed casing (`FanDuel`, `bet365`).
