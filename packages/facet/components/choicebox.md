# Choicebox
> Source: https://vercel.com/geist/choicebox (captured 2026-11-02)

## Purpose
A large-tile version of Radio or Checkbox, with room for a description or custom content and a bigger click target.

## Anatomy
- `ChoiceboxGroup` (`type="radio" | "checkbox"`, `label`, `showLabel`, `value`, `onChange`, `disabled`, `listClassName`) > `ChoiceboxGroupItem` (`title`, `description`, `value`, `disabled`, children shown when selected).

## Variants & sizes
Single-select, multi-select, group or item disabled, custom content on selection. No size prop.

## States
Unselected, selected (corner check or filled dot plus highlighted border), disabled, focus.

## Tokens
Not specified. Inferred: `--ds-gray-400` border, `--ds-blue-700` or `--ds-gray-1000` selected border (unverified).

## Rules
- Use for choices that benefit from a description (plan, framework, region). Do not mix single and multi in one group. Limit to 4–6 tiles, otherwise use Select or Combobox. Use Radio for plain labels.
- The whole tile is the target. No nested buttons or links.
- Selection is shown by both a corner mark and the border, never border color alone.
- Disabled tiles need a Tooltip explaining why.
- Parallel Title Case titles plus one sentence-case description (ending in a period) that adds the differentiating detail.
- Keep inside `<fieldset>` + `<legend>`. Arrows for radio, Space for checkbox.

## Hidden Gems usage
- P1. **Risk profile** onboarding: `Conservative` / `Balanced` / `Aggressive`, each with a description of min edge and stake sizing.
- **Model preset** picker on the settings page.
