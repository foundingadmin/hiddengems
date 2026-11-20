# Brand questions

The chat form of `onboarding/index.html`, for when the page cannot be shown. Ask in this order, with these options and no others. The first option of each question is the default; say so. Two rounds of four fit a question tool that takes four questions at a time, then two questions in plain chat.

Apply the answers with one `node scripts/brand.mjs set ...` command (keys and values are in the right column), then relay the summary it prints.

## Round one

| Question | Options | Sets |
|---|---|---|
| What is the brand color? | Keep Facet violet · Blue `#2f6fed` · Teal `#0d9488` · their own hex (free text) | `accent=<hex>` or `accent=null` |
| Which themes should the product have? | Light and dark, following the device · Light only · Dark only | `modes=both\|light\|dark` |
| How should buttons and inputs be cornered? | Soft (6px) · Square (2px) · Round (10px) · Pill buttons | `controls=soft\|square\|round\|pill` |
| How should cards and panels be cornered? | Soft (12px) · Square (4px) · Round (16px) | `surfaces=soft\|square\|round` |

## Round two

| Question | Options | Sets |
|---|---|---|
| How much shadow? | Subtle · Flat, no shadows anywhere · Raised | `depth=subtle\|flat\|raised` |
| How strong are lines and icons? | Fine · Defined (stronger borders, 2px icon strokes) | `stroke=fine\|defined` |
| What temperature are the grays? | Neutral · Cool · Warm · A trace of the brand color | `neutrals=neutral\|cool\|warm\|tinted` |
| Which typeface? | Geist · Inter · IBM Plex · System UI | `type=geist\|inter\|plex\|system` |

## In chat

1. "What is the product called?" sets `name="..."`.
2. "Attach the logo as an SVG if you have one." Run `node scripts/brand.mjs logo <path>`.

## Notes for the agent

- A brand color is always a hex value. If they give a color name or a screenshot, ask for the hex.
- Do not ask about the accent's role. The build decides it: a color near red, amber or green, or near gray, is kept for identity only. Tell them when that happens.
- If an answer is not one of the options ("can it be 20px?", "use our display font"), say it is outside the brand layer and offer the nearest option.
