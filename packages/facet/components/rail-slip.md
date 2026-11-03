# Rail slip
> Facet `[F]`. Promoted from the approved wireframes (`DesktopJeweler`, `DesktopMain`; `docs/wireframes/hg-wire.css`). CSS in `css/slip.css`. Specimen: `preview/index.html#slips`.

## Purpose
The slip in progress, visible from every desktop screen, with one way back to it.

## Anatomy
```html
<aside class="fc-sidenav">
  <nav class="fc-sidenav-level">…</nav>
  <section class="fc-railslip fc-card" aria-labelledby="rs-h">
    <header class="fc-railslip-head"><h2 id="rs-h" class="text-heading-14">Slip 1</h2><span class="text-label-12">Suggested parlay</span></header>
    <ul class="fc-railslip-list text-label-13">
      <li class="fc-railslip-row"><span>James Cook</span><span>2.60</span></li>
    </ul>
    <hr class="fc-separator">
    <dl class="fc-railslip-list text-label-13">
      <div class="fc-railslip-row"><dt>$15 pays</dt><dd>$99.45</dd></div>
      <div class="fc-railslip-row"><dt>Lose it all</dt><dd>77%</dd></div>
    </dl>
    <a class="fc-button" data-size="small" href="/slips">Review slip</a>
  </section>
  <ul class="fc-sidenav-list">Ask the Jeweler</ul>
  <div class="fc-sidenav-foot">freshness</div>
</aside>
```
- Place it after the nav level, which grows and pushes it down, and before the pinned Ask the Jeweler item.
- 12px inset and padding, 8px radius, 8px between rows. Names truncate with an ellipsis; prices and totals are tabular and never shrink.
- Head: the slip's name, then the play in secondary text. Totals: labels secondary, values primary.
- One full-width small primary button.
- The leg count in "3 leg parlay" is `<span class="fc-railslip-count">`. When a gem is added it pops: render the new count as a new element with `data-pop`, and it scales down into place over `--fc-duration-pop` (220ms). Transform only; none under reduced motion (`patterns/moments.md`, Add a gem).

## States
- Nothing on the slip: render no panel.
- Same game legs: the Lose it all row reads "Correlated" instead of a number (`cert.md`).
- Under 768px of shell width the panel hides, because Slips is a tab there.

## Rules
- Hide it on the Slips pages themselves: the certificate is already on screen.
- Show the same numbers the certificate shows, never a rounded copy.

## Hidden Gems usage
Every desktop screen except Slips, above Ask the Jeweler.
