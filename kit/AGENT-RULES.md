# Agent rules for a project that uses Facet

Copy the section below into the project's `AGENTS.md` or `CLAUDE.md`, and change `design/facet` to where the folder lives.

```markdown
## UI work must use Facet

- Read `design/facet/DESIGN.md` before designing or building any interface.
- Use Facet tokens and classes. Semantic names first (`--fc-*`), Facet primitives second (`--ds-*`), raw hex or px
  values never. Type uses the `.text-*` role classes only.
- Never edit generated files (`css/tokens.css`, `fonts.css`, `typography.css`, `materials.css`, `tailwind.css`,
  `shadcn.css`, `js/tokens.mjs`, `onboarding/index.html`). Edit `tokens/*.json` or `brand/brand.json` and run
  `node design/facet/scripts/build.mjs`.
- The look is set only through the brand layer: `node design/facet/scripts/brand.mjs` (`brand/README.md`).
  Do not add brand options, fonts or hues outside it.
- Hue allocation is a hard rule (`DESIGN.md`, "Hue allocation"). Every hue has one job. Status, verdict, delta and
  freshness colors never follow the brand. Run `node design/facet/scripts/lint-color.mjs <app dirs>` before pushing UI.
- Encodings are fixed: verdict = dot + word, delta = sign + arrow + color, score = one 0 to 100 number + accent
  intensity, freshness = status dot + relative time. Color is never the only cue.
- When work needs a part Facet lacks, build it in Facet (tokens, CSS, a component doc, a specimen), not in app
  CSS. App CSS is only layout glue between Facet parts, using `--fc-*` tokens.
- Review UI changes against `design/facet/guidelines/web-interface-guidelines.md` and cite rule IDs.
```
