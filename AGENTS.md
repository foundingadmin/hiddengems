# Agent instructions for this repository

These apply to any AI coding session (Claude Code, Cursor, v0, etc.) working here.

## UI work must use Facet

- Read `packages/facet/DESIGN.md` before designing or building any interface.
- Use Facet tokens and classes. Semantic names first (`--fc-*`), Geist primitives second
  (`--ds-*`), raw hex or px values never. Type uses the `.text-*` role classes only.
- Never edit generated files (`packages/facet/css/tokens.css`, `typography.css`, `materials.css`,
  `tailwind.css`, `js/tokens.mjs`). Edit `packages/facet/tokens/*.json` and run
  `node packages/facet/scripts/build.mjs`.
- Truth hierarchy for design questions: vercel.com (captured tokens, measurements, Geist docs) >
  Vercel's Web Interface Guidelines > Facet decisions > third-party references. See
  `packages/facet/SOURCES.md`.
- Hue allocation is a hard rule (see `packages/facet/DESIGN.md`, "Hue allocation"). Every hue has one
  job; purple is for gems only. Run `node packages/facet/scripts/lint-color.mjs apps` before pushing UI.
- Hidden Gems encodings are fixed: verdict = dot + word, edge = sign + arrow + color, gem tier =
  facet count + purple intensity, freshness = status dot + relative time. Color is never the only cue.
- Do not use Vercel logos, the Vercel name, or Vercel authorship styling in the product.
- Review UI changes against `packages/facet/guidelines/web-interface-guidelines.md` and cite rule IDs.

## Writing style (house rules)

- Never use em dashes in any output: code comments, docs, UI copy, commit messages.
- Sentence case for headings and UI labels; headings state a finding or question.
- No colons in titles, headings or nav labels.

## Repo layout

- `packages/facet/` design system (self-contained, reusable in other projects)
- `apps/web/` Hidden Gems app (Next.js, deploys on Vercel with Root Directory `apps/web`)
- `docs/` project documentation
