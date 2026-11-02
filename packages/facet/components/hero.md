# Hero

> Facet component `[F]`, marketing surfaces only (see `patterns/surfaces.md`).

## Anatomy
```html
<div class="fc-hero" data-surface="marketing">
  <canvas class="fc-hero-field" data-fc-field aria-hidden="true"></canvas>
  <div class="fc-hero-body">
    <span class="fc-hero-context"><span class="fc-status-dot" data-state="live"></span>Week 8, odds live</span>
    <h1 class="fc-hero-title">Picks, ranked and explained</h1>
    <p class="fc-hero-lede">Every available bet, weighed against the market.</p>
    <div class="fc-hero-actions"><a class="fc-button" data-shape="rounded" data-size="large" href="#">Open the slate</a></div>
  </div>
</div>
```
Mount the field with `mountField(canvas)` or `autoMount()` from `js/field.mjs`.

## Variants
- Default: page moments, about 420px tall, 56px title.
- `data-size="band"`: section headers, about 200px tall, 32px title.
- `data-align="side"`: the field fades from the left instead of the bottom.
- `data-bleed`: full-width band with hairlines above and below, no radius.

## Rules
- The headline names the purpose and stays true when the data changes; live specifics go in the context line.
- One primary action, one secondary at most.
- One animated field per view.
