# Input group
> Facet [F]. Built from the rank 1 general settings capture (project name prefix, deployment suffix). CSS in `css/forms.css`.

## Purpose
Join a fixed prefix or suffix to an input so the unit reads as part of the value: `$` before a stake, `pts` after an edge, `min` after an interval.

## Anatomy
```html
<label class="fc-label" for="stake">Max stake per pick<span class="fc-visually-hidden">, in dollars</span></label>
<div class="fc-input-group">
  <span class="fc-input-affix" aria-hidden="true">$</span>
  <input class="fc-input fc-num" id="stake" inputmode="decimal" value="50" aria-describedby="stake-h">
</div>
<p class="fc-helper" id="stake-h">From $1 to $500.</p>
```
- The group owns the ring (`--fc-border-alpha`, hover `--fc-border-hover`, focus `--ds-focus-border`). The inner input has none.
- `.fc-input-affix`: `--fc-surface-subtle` fill, secondary text, one inner rule toward the input. First child is a prefix, last child a suffix.

## Variants & sizes
- `data-size="small"` (32), default (36), `data-size="large"` (40, radius 8, 16px text).
- `data-width="short"`: caps the group at 160px for short numbers.
- Numeric values use `.fc-num` (right-aligned, tabular).

## States
Hover, focus (keyboard and pointer, as inputs do), invalid (`aria-invalid="true"` on the input paints the error ring on the group), disabled (fill, disabled text in the affix).

## Rules
- The affix is visual. Put the unit in the label (visually hidden if needed) so screen readers hear it once.
- The placeholder never repeats the label or the affix. Use a value or nothing.
- Helper text gives range or format, linked by `aria-describedby`. On error the helper turns to the error and says how to fix it ("Enter an amount from $1 to $500.").
- One affix per side. Selects inside groups are out of scope.

## Hidden Gems usage
Max stake (`$`), minimum edge (`pts`), stale after (`min`), Kelly fraction (`%`).
