# Slider
> Source: https://vercel.com/geist/slider (captured 2026-11-02)

## Purpose
Picks a value or range by dragging along a track.

## Anatomy
- Track, thumb(s), optional `label`, optional numeric inputs at the start and/or end of a range.

## Variants & sizes
- `value` (array: one value or `[start, end]`), `onValueChange`, `onValueCommitted` (on release), `label`, `showStartInput`, `showEndInput`, `disabled`, `min`, `max` (and step implied by best practices). No size prop.

## States
Idle, dragging, committed, disabled.

## Tokens
Not specified by the reference.

## Rules
- Use when shape and proximity matter more than precision. Pair with a numeric Input for exact values.
- Snap to a sensible step. Clamp min and max to real limits.
- Always show the live value in tabular numbers with a label naming it (`Sample Rate · 44 kHz`).
- Threshold colors match the product's other breakpoints.
- Give it a name through a label or `aria-label`. Leave native arrow, PageUp/PageDown and Home/End behavior alone.

## Hidden Gems usage
- **Min Edge** filter (0–15%, step 0.5) with `showStartInput`. Commit to the URL on release (`onValueCommitted`) so the slate is not re-filtered on every pixel.
- **Odds range** (e.g. -200 to +300) as a range slider with both inputs.
- **Model weight** sliders (quant vs qualitative) on the settings page.

## Facet implementation `[F]`
CSS in `css/forms.css` (`.fc-slider`), fill helper in `js/forms.mjs` (`bindSliders`, `sliderShare`). Specimen: `preview/index.html#batch2-forms`.

### Purpose
A value people move to feel its effect, with the exact number one tab away.

### Anatomy
```html
<div class="fc-slider">
  <div class="fc-slider-head">
    <label class="fc-label" for="price-r">Price</label>
    <div class="fc-input-group" data-size="small">
      <input class="fc-input fc-num" inputmode="decimal" aria-label="Price" value="6.00">
    </div>
  </div>
  <input class="fc-slider-track" id="price-r" type="range" min="1.3" max="30" step="0.05" value="6"
         style="--value: 16" aria-describedby="price-h">
  <p class="fc-helper" id="price-h">Decimal odds. Implied 16.7%, less an assumed cut of 11%.</p>
</div>
```
- Label row: label left, exact number field right (128px, small, with a unit affix when there is one). Then the track, full width. Then an optional helper.
- Track: 4px, fully rounded; the filled share is the brand accent (`--fc-control-on`, a control you set), the rest the gray fill. Thumb 16px in the toggle thumb colors. Hit area 24px tall (INT-04).
- `--value` (0 to 100) is the filled share. `bindSliders()` keeps it in step for plain HTML; a framework sets it while rendering with `sliderShare(value, min, max)`.

### States
Idle, dragging (thumb grows 10%), keyboard focus (focus ring on the thumb, INT-02), disabled (gray fill, flat thumb), invalid number (the field takes the error ring and a helper names the range, FRM-09).

### Rules
- Narrow containers keep the track full width: the number field lives in the label row, never beside the track.
- Two events: change runs live while dragging or typing; commit runs on release, so expensive work and URL writes happen once per change (INT-11). Commit on pointer up, key up and blur for the track, and on blur and Enter for the field.
- The number field accepts any keystroke and validates after (FRM-06); out of range keeps the last good value and says the range.
- Name both inputs: the track by its `<label>`, the field with the same name plus its unit (`aria-label="Our hit chance, %"`, FRM-03).
- Native keys stay: arrows step, PageUp and PageDown jump, Home and End go to the ends.

### Hidden Gems usage
Rating lab, Try a prop: Price, Our hit chance and the four Clarity parts. Each commits to the query string on release.
