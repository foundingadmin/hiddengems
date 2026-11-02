# Stepper
> Facet [F]. Built from the rank 1 advanced settings capture (bulk redirects: a `- 0 +` control with a derived cost line). CSS in `css/forms.css`.

## Purpose
Change a small whole number by one, and show what the number means as it changes.

## Anatomy
```html
<label class="fc-label" for="picks">Max picks per week</label>
<div class="fc-stepper-field">
  <div class="fc-stepper">
    <button class="fc-stepper-button" type="button" data-step="-1" aria-label="Decrease max picks per week" aria-controls="picks">...</button>
    <input class="fc-stepper-input" type="number" id="picks" value="7" min="1" max="15" step="1" aria-describedby="picks-total">
    <button class="fc-stepper-button" type="button" data-step="1" aria-label="Increase max picks per week" aria-controls="picks">...</button>
  </div>
  <p class="fc-stepper-total" id="picks-total" aria-live="polite">Weekly exposure <strong>$350</strong>, 7 picks at $50</p>
</div>
```
- 36px tall, 36px square buttons, a 56px centered number (500, tabular) between two rules. Native spinners are hidden; the input stays a typeable `spinbutton` with arrow-key support.
- `.fc-stepper-total`: the derived line. The result is `<strong>`, the formula plain.

## States
Minus disabled at `min`, plus disabled at `max`. Typed values are clamped on change. If an input the total depends on is invalid, the total says so instead of showing a wrong number.

## Rules
- Use for small ranges (about 1 to 20). Larger ranges use an input group.
- The total line shows the formula next to the result so the number can be checked (DESIGN.md rule 9).
- Buttons name the field they change. Focus uses `--ds-focus-ring`.

## Hidden Gems usage
Max picks per week with weekly exposure; alert repeat count.
