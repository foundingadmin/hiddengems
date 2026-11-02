# Choicebox
> Source: https://vercel.com/geist/choicebox (captured 2026-11-02). Facet CSS in `css/forms.css` [F], measured against the rank 1 security capture (issuer mode tiles).

## Purpose
A large-tile version of Radio or Checkbox, with room for a detail line and a bigger click target.

## Anatomy
```html
<fieldset class="fc-choicebox-fieldset">
  <legend class="fc-label">Odds format</legend>
  <div class="fc-choicebox-group">
    <label class="fc-choicebox">
      <input type="radio" name="odds-format" value="american" checked>
      <span class="fc-choicebox-body">
        <span class="fc-choicebox-title">American <span class="fc-badge" data-size="sm" data-contrast="low">Default</span></span>
        <span class="fc-choicebox-detail">−110, +150</span>
      </span>
    </label>
    ...
  </div>
</fieldset>
```
- `.fc-choicebox`: 16px padding, radius 6, `--fc-border-default` ring. The native input renders as the mark on the right (16px circle, or rounded square for checkboxes).
- `.fc-choicebox-title`: 14px, 500, primary, with an optional small badge. `.fc-choicebox-detail`: 13px secondary, tabular.
- `.fc-choicebox-group`: equal columns, at least 220px each, 12px gap.

## Variants & sizes
Radio (single) or checkbox (multi). Disabled per tile. No size prop.

## States
- Selected: brand ring (`--fc-control-on`, 1px outside plus 1px inside), a faint brand tint (`--fc-selected-bg`, proposed; falls back to a 6% mix) and the filled mark. Never the ring alone.
- Keyboard focus: `--ds-focus-ring` on the tile.
- Hover: ring steps to `--fc-border-hover`.
- Disabled: fill, disabled text, not-allowed cursor; explain why nearby.

## Rules
- Use for 2 to 6 choices that need a detail line. Plain labels use Radio.
- The whole tile is the target. No nested buttons or links.
- Parallel sentence-case titles; the detail line adds the differentiating fact (an example, a limit), never a restatement of the title.
- A badge marks a fact about one option ("Default"). Badge hue follows the hue allocation; gray unless the fact has a job.
- Keep inside `<fieldset>` + `<legend>`. Arrow keys move between radios; Space toggles checkboxes.

## Hidden Gems usage
- Odds format: American (−110, +150) or Decimal (1.91, 2.50).
- Staking profile: Conservative, Standard, Aggressive, each with its min edge and stake sizing.
