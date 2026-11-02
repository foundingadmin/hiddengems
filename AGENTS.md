# Agent instructions for this repository

These apply to any AI coding session (Claude Code, Cursor, v0, etc.) working here.

## UI work must use Facet

- Read `packages/facet/DESIGN.md` before designing or building any interface.
- Use Facet tokens and classes. Semantic names first (`--fc-*`), Facet primitives second
  (`--ds-*`), raw hex or px values never. Type uses the `.text-*` role classes only.
- Never edit generated files (`packages/facet/css/tokens.css`, `typography.css`, `materials.css`,
  `tailwind.css`, `js/tokens.mjs`). Edit `packages/facet/tokens/*.json` and run
  `node packages/facet/scripts/build.mjs`.
- Truth hierarchy for design questions: vercel.com (captured tokens, measurements, reference docs) >
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
- Say it once: never repeat on a page what a tab, heading, label, column header, icon or control already said.
  Lessons and exceptions in `packages/facet/foundations/content.md`.
- Earn every line: cut any text whose removal would not reduce understanding (ledes that describe the layout,
  reasons nobody asked for, selling lines, restated sentences, captions on examples, numbers already shown).
- Headlines are simple and objective, naming the purpose; specifics live in the content so headlines never go stale.
- Sentence case for headings and UI labels.
- No colons in titles, headings or nav labels.
- The design system is called Facet. Never call it Geist in UI copy, docs or comments; the upstream
  name appears only in provenance (`packages/facet/SOURCES.md`, `reference/`) and real package names.

## Working agreements

- Integrate approved scalability decisions as soon as they come up (tokens, slots, generators), rather than deferring them.
- A product's accent goes through `--fc-brand-*` (`packages/facet/tokens/facet.semantic.json`); reusing Facet for another product means changing those four tokens, not hunting for hues.

## Repo layout

- `packages/facet/` design system (self-contained, reusable in other projects)
- `apps/web/` Hidden Gems app (Next.js, deploys on Vercel with Root Directory `apps/web`)
- `docs/` project documentation
