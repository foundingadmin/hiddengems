# Appraisal certificate
> Facet `[F]`. Promoted from the approved wireframes (`DesktopSlip`, `Slip`; `docs/wireframes/hg-wire.css`). CSS in `css/slip.css`. Specimen: `preview/index.html#slips`.

## Purpose
A slip as one card the reader can check at a glance: every leg with its gem rating and price, what is staked and what it pays, and the chance of losing the whole stake, set large.

## Anatomy
```html
<article class="fc-cert fc-card" aria-labelledby="cert-h">
  <header class="fc-cert-head">
    <p class="fc-cert-kicker text-label-12">Appraisal certificate</p>
    <h2 id="cert-h" class="text-heading-24">Slip 1</h2>
    <p class="fc-cert-meta text-copy-14">Suggested play · 2 leg parlay</p>
  </header>
  <ul class="fc-legs">
    <li class="fc-leg">
      <span class="fc-player">…</span>
      <span class="fc-gem" style="--rating: 92" data-live><svg aria-hidden="true">…</svg><span><span class="fc-visually-hidden">Gem rating </span>92</span></span>
      <span class="fc-price text-label-14"><span class="fc-visually-hidden">Price </span>2.60</span>
    </li>
  </ul>
  <div class="fc-stat-strip" role="group" aria-label="Stake and payout">
    <div class="fc-stat"><p class="fc-stat-label">Stake</p><p class="fc-stat-value">$15.00</p></div>
    <div class="fc-stat"><p class="fc-stat-label">Pays</p><p class="fc-stat-value">$99.45</p></div>
    <div class="fc-stat"><p class="fc-stat-label">All hit</p><p class="fc-stat-value">23%</p><p class="fc-stat-basis">49% × 47%</p></div>
  </div>
  <p class="fc-loseit"><span class="fc-loseit-label text-heading-16">Lose it all</span><span class="fc-loseit-value text-heading-40">77%</span></p>
</article>
```
| Part | Class | Role |
|---|---|---|
| Card | `.fc-cert.fc-card` | 24px padding (16px in the narrow shell), 12px radius, 20px between parts. An inline-size container, so it adapts to its column, not the window |
| Head | `.fc-cert-head` | Kicker, title, then one metadata line naming the play. A hairline closes it |
| Legs | `.fc-legs > .fc-leg` | One shared grid (player, rating, price), so every rating and price sits in the same lane |
| Stakes | `.fc-stat-strip` | Stake, pays and all hit, always three across |
| Lose it all | `.fc-loseit` | Label left, the chance right at `text-heading-40`, on the subtle surface |

## Same game legs
The lose it all chance is only computed for legs from different games (`docs/prd.md`, F3.2). When legs share a game:
- Each of those legs carries a flag beside the name: `.fc-badge[data-variant="amber"][data-size="sm"][data-contrast="low"]` with a link icon and the words "Same game". It drops under the name before the name truncates.
- All hit shows `–` with "Unknown" in `.fc-visually-hidden`, and the basis "Correlated".
- `.fc-loseit[data-correlated]` replaces the number with a `data-size="lg"` amber badge, "Correlated", and adds one `.fc-loseit-note` line: "Same game legs move together, so no chance is shown."
- Never show a number for correlated legs, not even an estimate.

## Editable legs
A slip you can still change (your own play, not placed) adds a remove button to each leg: `data-editable` on `.fc-legs`, then a fourth lane per leg.
```html
<ul class="fc-legs" data-editable>
  <li class="fc-leg">… <button type="button" class="fc-button fc-leg-action" data-variant="tertiary" data-size="tiny" data-shape="square" aria-label="Remove James Cook"><svg aria-hidden="true">x</svg></button></li>
</ul>
```
A suggested play has no remove buttons: Change this slip comes first.

## Rules
- Lose it all is always on the slip and always at the largest size on the card (PRD section 13). It stays gray: it is information, not a verdict.
- Stake and pays are amounts, not results, so they stay plain. Results use signed money (`money.md`).
- A leg with no rating (the handoff summary) leaves the rating out; the price keeps its lane.
- Each rating mark and price carries its name in `.fc-visually-hidden`, never an `aria-label` on a span.
- At most one middle dot in the metadata line and in each leg's meta line (`foundations/content.md`).

## Hidden Gems usage
Slips, this week: the suggested play, with the Jeweler's appraisal and Send to DraftKings beside it. After Change this slip, the meta line reads "Your own play".
