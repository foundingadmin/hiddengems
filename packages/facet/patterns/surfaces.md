# Marketing surfaces inside the product

Owner decision D5. Hidden Gems is a dense research tool built around an exciting sport, so it earns moments of reprieve between data-heavy screens: onboarding, the start of a week, how-it-works explainers, recaps, an empty off-season. Those moments use `data-surface="marketing"`, which unlocks a small, scoped set of allowances. Everything outside it keeps the product rules.

## Where they belong

| Moment | Form |
|---|---|
| First run and onboarding | Full hero with the field |
| A new week's slate opening | Full hero above the slate, the context line shows the week and live status |
| How ranking works, glossary, method | Band hero as the section header, then run-in prose |
| Weekly recap | Full hero with the week's outcome in the lede |
| Empty off-season | Band hero with one action |

At most one animated field per view. Never inside tables, settings, logs or anything a reader scans for numbers.

## What the surface allows

- Display type (`text-heading-40` to `72`, or `.fc-hero-title`), a larger lede, roomier spacing (`--fc-space-section-sm|md|lg`: 64, 96, 128).
- The animated field (`js/field.mjs`): a gemstone-cut lattice, a slow beam of light, and a few hidden facets that flash in the brand accent as the light finds them. Lightness only, plus the brand accent.
- Pill buttons (`data-shape="rounded"`).

## What stays banned

Hue decoration, gradient text, glass, textures, purple outside the brand accent, cards inside cards, all-caps eyebrows, selling copy that a reader cannot act on.

## Motion

The field loops slowly (9 seconds per sweep), pauses off screen and in hidden tabs, and draws one still frame when reduced motion is on. It never sits behind text without the fade mask.
