# Vercel ecosystem reference for Facet

Findings on Vercel's agent skills, the Geist font package, official dashboard-style code, and agent-readable design files. All retrieved 2026-11-02 unless noted. "Verified" means read from the source file or inspected directly; "Unverified" means inferred or not checked.

## Sources captured

| Source | Ref / date | URL |
| --- | --- | --- |
| vercel-labs/agent-skills | `1a2c79d`, 2026-10-27 | https://github.com/vercel-labs/agent-skills |
| vercel-labs/web-interface-guidelines | `434b7f9`, 2026-10-05 | https://github.com/vercel-labs/web-interface-guidelines |
| vercel-labs/writing-guidelines | `83e2316`, 2026-06-01 | https://github.com/vercel-labs/writing-guidelines |
| vercel/vercel-plugin | `67977fd`, 2026-10-29 | https://github.com/vercel/vercel-plugin |
| vercel/geist-font | `2e554ff`, 2026-10-30 | https://github.com/vercel/geist-font |
| `geist` npm | 1.9.0, published 2026-10-30T14:44Z | https://registry.npmjs.org/geist, https://unpkg.com/geist@1.9.0/ |
| vercel/next-learn | `bb25584`, 2026-07-29 | https://github.com/vercel/next-learn/tree/main/dashboard/final-example |
| vercel/nextjs-postgres-nextauth-tailwindcss-template | `fe02671`, 2026-01-15 | https://github.com/vercel/nextjs-postgres-nextauth-tailwindcss-template |
| vercel/chatbot (old name vercel/ai-chatbot, same HEAD) | `c2f8235`, 2026-07-08 | https://github.com/vercel/chatbot |
| vercel/turborepo | `7eed8aa`, 2026-10-30 | https://github.com/vercel/turborepo/tree/main/examples/with-tailwind |
| shadcn-ui/ui | `c0d63c3`, 2026-11-01 | https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(app)/examples/dashboard |
| vercel/examples | `de86723`, 2026-10-16 | https://github.com/vercel/examples/tree/main/solutions/cron |

Access note: api.github.com org listings were blocked in this environment, so repo discovery used known names plus `git ls-remote`. There may be other relevant vercel-labs repos not listed here.

---

## 1. Official agent skills (task 2)

### vercel-labs/agent-skills

Installed with `npx skills add vercel-labs/agent-skills` (or `--skill <name>`). Format follows https://agentskills.io. MIT. Skills present at `1a2c79d`:

| Skill | What it is | Dashboard relevance |
| --- | --- | --- |
| `web-design-guidelines` | Thin wrapper: fetches `web-interface-guidelines/main/command.md` on every run and reviews files, output `file:line - issue`. | High. Our UI lint pass. Digest in `guidelines/web-interface-guidelines.md`. |
| `react-best-practices` (name `vercel-react-best-practices`) | 70 rules in 8 prioritized categories (metadata says "January 2026", README still says "40+"). Each rule has incorrect/correct code. | High. See highlights below. |
| `composition-patterns` | React component API patterns, React 19 aware. | High for Facet component APIs. |
| `react-view-transitions` | `<ViewTransition>`, `addTransitionType`, Next.js `transitionTypes` on `next/link`. Priority list: shared element, Suspense reveal, list identity, enter/exit, route change. Background revalidation should use `default="none"` (no animation). | Medium. Useful for list-to-detail; silence it for live data refresh. |
| `writing-guidelines` | Fetches `vercel-labs/writing-guidelines/main/command.md`; docs prose rules (sentence-case headings, no em dashes, banned "easy/simple/quick", numerals, `64 KB`/`200 ms` units). | Medium. Matches our no-em-dash rule. |
| `vercel-optimize` | Metrics-first Vercel cost/perf audit (needs CLI v53+, linked project, Observability Plus for route-level). | Later, post-launch. |
| `deploy-to-vercel`, `vercel-cli-with-tokens` | Deploy flows; `vercel deploy --temporary` returns a claim URL when not logged in. | Ops only. |
| `react-native-skills` | RN/Expo rules. | None. |

**react-best-practices, rules most relevant to a data-dense dashboard** (rule file names under `skills/react-best-practices/rules/`):

- Waterfalls (CRITICAL): `async-parallel` (Promise.all independent fetches), `async-defer-await`, `async-suspense-boundaries` (stream sections independently), `server-parallel-fetching`, `server-parallel-nested-fetching`.
- Bundle (CRITICAL): `bundle-barrel-imports` (import directly; relevant to how Facet exports components), `bundle-dynamic-imports` (charts via `next/dynamic`), `bundle-defer-third-party` (analytics after hydration), `bundle-preload` (preload on hover/focus).
- Server: `server-serialization` (send minimal props to client components; matters for big odds tables), `server-dedup-props`, `server-cache-react` (`React.cache` per request), `server-cache-lru`, `server-after-nonblocking` (`after()` for logging), `server-auth-actions` (authenticate Server Actions like API routes), `server-no-shared-module-state`.
- Client data: `client-swr-dedup`, `client-passive-event-listeners`, `client-localstorage-schema` (version persisted prefs).
- Re-render: `rerender-transitions` / `rerender-use-deferred-value` (keep filter inputs responsive while the table re-renders), `rerender-derived-state-no-effect`, `rerender-no-inline-components`, `rerender-use-ref-transient-values` (high-frequency values).
- Rendering: `rendering-content-visibility` (long lists), `rendering-hydration-no-flicker` (inline script for client-only data such as theme), `rendering-usetransition-loading`, `rendering-activity` (`<Activity>` for show/hide panels), `rendering-conditional-render` (ternary not `&&`), `rendering-svg-precision` (trim sparkline path precision).
- JS: `js-index-maps`, `js-set-map-lookups`, `js-tosorted-immutable`, `js-combine-iterations` (all relevant to client-side table transforms).

**composition-patterns rules** (`skills/composition-patterns/rules/`): `architecture-avoid-boolean-props`, `architecture-compound-components`, `state-decouple-implementation` (provider is the only place that knows how state is stored), `state-context-interface` (generic `{ state, actions, meta }` context for dependency injection), `state-lift-state`, `patterns-explicit-variants` (separate variant components instead of boolean modes), `patterns-children-over-render-props`, `react19-no-forwardref` (React 19: no `forwardRef`, `use()` over `useContext()`). Facet should adopt these for `Table`, `Filter`, `Menu` style compound components.

### vercel/vercel-plugin

`npx plugins add vercel/vercel-plugin` (Claude Code, Cursor, Copilot CLI, Codex and others). Bundles Vercel context, skills, commands (`/vercel:deploy`, `/vercel:env`, `/vercel:status`, `/vercel:bootstrap`) and the Vercel MCP server. Skills folder includes `ai-sdk`, `ai-gateway`, `flags-sdk`, `vercel-flags`, `vercel-storage`, `vercel-functions`, `queues`, `workflow`, `env-vars`, `deployments-cicd`, `runtime-cache`, `cdn-caching`, `react-best-practices`, `vercel-firewall`, `microfrontends` and more. Platform-oriented, not UI design. Useful when we implement the deployment plan in `docs/vercel-deployment.md`.

---

## 2. Geist font (task 3)

### What is included

| Family | Shapes / weights | Axes | Notes |
| --- | --- | --- | --- |
| Geist Sans | 100 to 900 (Thin, UltraLight, Light, Regular, Medium, SemiBold, Bold, Black, UltraBlack) plus italics | `wght` 100 to 900, default 400 | 975 glyphs in the variable TTF. Italic variable file ships in npm but is not loaded by the `GeistSans` export. |
| Geist Mono | Same 9 weights plus italics | `wght` 100 to 900 | All digits 600 units wide. |
| Geist Serif | Regular, Square, Triangle, Heart | `ELSH` 0 to 100 (0, 25, 50, 100) | Single weight: `geist/font/serif/variable` declares `weight: "400"`. Not on Google Fonts yet. |
| Geist Pixel | Square, Grid, Circle, Triangle, Line | `ELSH` (1, 20, 40, 60, 80) | Display only. |

Source: repo `fonts/` tree, `readme.md`, https://vercel.com/font.md, npm `dist/*.js` (all verified).

### `geist` npm package (1.9.0)

- License field: "SIL OPEN FONT LICENSE"; `LICENSE.txt` is included. Peer dependency `next >=13.2.0`. 148 files, about 8.3 MB unpacked (TTF + WOFF2 for every static and variable cut).
- Entry points (from `exports`): `geist/font/sans`, `geist/font/mono`, `geist/font/sans-non-variable`, `geist/font/mono-non-variable`, `geist/font/serif`, `geist/font/serif/{variable,regular,square,triangle,heart}`, `geist/font/pixel`, `geist/font/pixel/{variable,square,grid,circle,triangle,line}`, plus the aggregate `geist/font`.
- Implementation (verified `dist/sans.js`, `dist/mono.js`): `next/font/local` wrappers.
  - `GeistSans`: `src: ./fonts/geist-sans/Geist-Variable.woff2`, `variable: "--font-geist-sans"`, `weight: "100 900"`. Upright only.
  - `GeistMono`: `GeistMono-Variable.woff2`, `variable: "--font-geist-mono"`, `adjustFontFallback: false`, fallback stack `ui-monospace, SFMono-Regular, Roboto Mono, Menlo, Monaco, Liberation Mono, DejaVu Sans Mono, Courier New, monospace`.
  - Non-variable exports set `--font-geist-sans-non-variable` / `--font-geist-mono-non-variable`.
- CSS variables (README): `--font-geist-sans`, `--font-geist-mono`, `--font-geist-serif`, `--font-geist-serif-{regular,square,triangle,heart}`, `--font-geist-pixel`, `--font-geist-pixel-{square,grid,circle,triangle,line}`.
- Usage (README): apply `${GeistSans.variable} ${GeistMono.variable}` on `<html>`; Tailwind v4 `@theme { --font-sans: var(--font-geist-sans); --font-mono: var(--font-geist-mono); }`. On Next.js older than 15, add `transpilePackages: ["geist"]`.
- Variable WOFF2 sizes: Sans 69,576 B, Mono 71,272 B, Sans Italic 73,504 B.
- Facet status: `packages/facet/fonts/Geist-Variable.woff2` and `GeistMono-Variable.woff2` are byte-identical to geist@1.9.0 (sha256 prefixes `5c5588027e59e74e`, `cf5bf55f69e043b1`), with `OFL-LICENSE.txt` alongside. Verified.

### Google Fonts alternative (`next/font/google`)

- `Geist`, `Geist_Mono`, `Geist_Pixel` are available; Serif is not. Google serves subsets (latin, latin-ext, cyrillic, vietnamese); the latin variable subset is about 13 KB versus 69 KB for the npm file.
- Tradeoff (verified 2026-11-02 by downloading the Google latin WOFF2 and listing OpenType features): Google's Geist keeps `tnum`, `pnum`, `frac`, `kern`, `liga` but strips all stylistic sets (`ss01` to `ss11`), `case`, `sups`, `subs`, `ordn`. Google's Geist Mono keeps none of the stylistic sets (so no `ss09`). vercel.com/font's comparison table agrees: font-feature-settings "Yes" for npm and .zip, "No" for Google Fonts; glyph coverage "Partial" on Google.
- Vercel's own chatbot template uses `next/font/google` (`Geist`, `Geist_Mono`); the Turborepo example uses `geist` npm.

### OpenType features (verified with fontTools on repo commit `2e554ff`; npm 1.9.0 Sans WOFF2 has the identical list)

- **Geist Sans:** `aalt case ccmp dlig dnom frac kern liga locl mark mkmk numr ordn pnum sinf ss01 to ss11 subs sups tnum`. No `zero`, `lnum` or `onum` (lining figures are the default).
- **Geist Mono:** `aalt case ccmp dnom frac liga locl mark mkmk numr ordn sinf ss01 ss02 ss03 ss04 ss06 ss07 ss08 ss09 ss10 ss11 subs sups`. No `tnum` (not needed, fixed width) and no `zero`.
- **Stylistic set names** (from the fonts' `name` table): ss01 No tail a, ss02 Alt a, ss03 Alt l, ss04 Alt R, ss05 Alt I (Sans only), ss06 Alt G, ss07 Alt arrows, ss08 Rounded dot, ss09 Alt numbers (Sans) / Non-slashed zero (Mono), ss10 Alternative enclosing shapes, ss11 Contextual brand styles (Sans) / Coding ligatures (Mono). Note: vercel.com/font.md says Sans has 9 stylistic sets; the font file exposes 11.
- **Mono zero:** default zero is distinguished (slashed or similar), since `ss09` turns it into a plain zero. Inferred from the feature name; glyph shape not rendered here.
- **Figures in Sans:** default digits are proportional (advance widths 384 to 663 units). `tnum` maps only `zero` to `nine` to `.tf` glyphs at 600 units. Signs and punctuation do not change: `+` 558, hyphen-minus 419, U+2212 minus 520, `.` and `,` 201, `%` 802, `$` 629, space 250. Consequence for odds and spreads: `tabular-nums` aligns digits, but `+150` vs `-110` vs `−3.5` still differ in sign width. Options: right-align plus a fixed-width sign cell, use U+2212 consistently with a figure-width pad, or set those columns in Geist Mono.
- **Features to consider for Facet:** `tnum` for all numeric columns; `case` for punctuation in all-caps labels; `ss03` (Alt l) or `ss05` (Alt I) to separate l/I in player or ticket identifiers; `frac` only if we render fractional odds. Requires the npm/self-hosted files, not Google Fonts.

### License terms

- SIL Open Font License 1.1 (`OFL.txt`: "Copyright 2024 The Geist Project Authors"; package `LICENSE.txt`: "Copyright (c) 2023 Vercel, in collaboration with basement.studio"). No Reserved Font Name is declared (the only RFN text in `OFL.txt` is the license's own definition). Verified.
- What that allows for us: bundling the WOFF2 files in our repo and serving them from our app is permitted. Redistribution must keep the copyright notice and license (we do: `packages/facet/fonts/OFL-LICENSE.txt`). The fonts may not be sold on their own. Modified or subset builds stay under OFL; with no RFN they may keep the Geist name. Consider adding the repo's `OFL.txt` header line as well so both copyright lines are present (minor).
- Trademarks are separate: vercel.com/geist/brands.md lists the Vercel marks (Vercel, Next.js, Turbo, Turborepo, Turbopack, v0, eve, AI SDK) and forbids using them in product names, implying endorsement, or modifying logos. "Geist" is not on that list, but Facet should still not present itself as Geist or as a Vercel product.

---

## 3. Official dashboard-style code worth borrowing (task 4)

1. **Next.js Learn dashboard** (vercel/next-learn `dashboard/final-example`). The canonical App Router dashboard: `app/dashboard/layout.tsx` + sidenav, `(overview)/loading.tsx` with `ui/skeletons.tsx`, Suspense-streamed cards and charts, `ui/search.tsx` writing a debounced query to search params (`use-debounce`), `ui/invoices/pagination.tsx` via search params, Server Actions + Zod in `lib/actions.ts`, `error.tsx` and `not-found.tsx`. Borrow: URL-driven search/pagination and streaming skeleton structure.
2. **Admin Dashboard template** (vercel/nextjs-postgres-nextauth-tailwindcss-template; demo https://next-admin-dash.vercel.app). `app/(dashboard)` route group, server `page.tsx` reading `searchParams` (`q`, `offset`) and querying Postgres via Drizzle, shadcn `Table`/`Card`/`Tabs`. Borrow: route-group shell and server-side filtering. Avoid: dated stack (Next 15, Tailwind 3, last commit 2026-01-15), status `Tabs` that are not URL-synced (breaks INT-24), table nested in a Card.
3. **Chatbot template** (vercel/chatbot). Best snapshot of Vercel's current app stack: Next 16.2, React 19.2, AI SDK 7 (`ai` 7.0.15), Tailwind 4, shadcn (`components.json` style `radix-maia`, base color neutral, CSS variables), `next-themes` with `disableTransitionOnChange`, an inline script that keeps `<meta name="theme-color">` in sync with the theme (DES-08), `react-data-grid` for spreadsheet artifacts, Drizzle + `postgres`, `@vercel/blob`, `@vercel/otel`, `botid`, Biome/Ultracite, Playwright, React Compiler. Borrow: theming and provider setup. Avoid: `viewport.maximumScale: 1` in `app/layout.tsx`, which the Web Interface Guidelines forbid.
4. **Turborepo `with-tailwind` example** (vercel/turborepo `examples/with-tailwind`). Exact monorepo shape we want: `apps/*` + `packages/*`, `@repo/ui` compiling Tailwind v4 to `dist/index.css` and exporting `./styles.css` and `./*`, shared `@repo/tailwind-config`, `geist` npm in `apps/web` (`GeistSans.className`), `turbo.json` build outputs `.next/**`, `!.next/cache/**`, `!.next/dev/**`. Versions pinned there on 2026-10-30: turbo 2.11.10, pnpm 12.16.1, Next 16.4.3, React 19.3.1, TypeScript 7.0.2, Node `>=26.13.0`. Borrow: package boundaries and turbo task config.
5. **shadcn/ui dashboard example and `dashboard-01` block** (shadcn-ui/ui `apps/v4`). `data-table.tsx` built on TanStack Table v9 with row drag reordering (`@dnd-kit`), column visibility, pagination, row drawer; `chart-area-interactive.tsx` on Recharts 3 via the shadcn `chart` wrapper; `section-cards.tsx` KPI row; sidebar navigation. The registry now ships the block for Radix, Base UI and React Aria bases. v0 generates this shadcn style (vercel.com/design.md refers to "stock v0 or a generic Next.js, Tailwind, and shadcn project"). Borrow: TanStack Table column model and chart wrapper pattern; restyle with Facet tokens.
6. **Cron example** (vercel/examples `solutions/cron`). `vercel.json` with multiple `crons` entries plus `"ignoreCommand": "pnpm dlx turbo-ignore"` and `"buildCommand": "pnpm turbo build"`. Pages Router and older, but it is the reference for scheduled odds pulls. See `docs/vercel-deployment.md`.

Not found or not public: `@vercel/geistcn` (Vercel's internal Geist React components; vercel.com/design.md mentions "GeistCN" only for existing Vercel projects). `@geist-ui/core` is a community project, not Vercel.

### Agent-readable files on vercel.com (checked 2026-11-02)

| URL | Status | What it is |
| --- | --- | --- |
| https://vercel.com/llms.txt | 200, text/plain, 5,397 B | Index for agents: docs indexes, REST API/OpenAPI, MCP, plugin and skills, templates, KB, changelog. Identical to `/docs/llms.txt`. |
| https://vercel.com/docs/llms-full.txt | 200, about 11.8 MB | All docs plus REST API reference in one file. |
| https://vercel.com/docs/sitemap.md | 200 | Every docs page with type, `Lastmod`, summary, prerequisites. Any docs URL + `.md` returns Markdown with front matter (`last_updated`). |
| https://vercel.com/design.md | 200, text/markdown, 40 KB | A skill named `vercel-brand-guidelines` for building official Vercel-authored report sites. Comes with a `vbg-*` CSS API at https://vercel.com/geist/vercel-brand.css (108,893 B). |
| https://vercel.com/geist/brands.md | 200 | Logo asset table (Vercel, Next.js, Turbo, Turborepo, Turbopack, v0, eve, AI SDK), naming, usage, misuse and attribution rules. |
| https://vercel.com/font.md | 200, 4.5 KB | Geist install guide (npm, Google Fonts, CSS variables, ELSH values, OFL). |
| https://vercel.com/font | 200, HTML | Interactive specimen; includes the npm vs Google Fonts vs .zip feature table. |
| https://vercel.com/geist.md | 200 but HTML, not Markdown | Not a usable Markdown index right now. |
| https://vercel.com/design/guidelines | 200, HTML | Web Interface Guidelines mirror. `.md` variant is 404. |
| https://vercel.com/.well-known/ai-catalog.json | 200, `application/ai-catalog+json` | Experimental catalog: MCP OAuth metadata, OpenAPI, agent-resources docs, docs graph, AI Gateway models. |

**What `design.md` teaches that applies to Hidden Gems** (it targets Vercel-authored reports, but its evidence rules are directly reusable):

- Use Geist Sans for prose, labels, tables, KPIs, dates, counts, percentages and money; Geist Mono only for code, paths, raw tokens, timestamps and short identifiers, and only the identifier, never the whole table. Use tabular numerals for aligned comparisons; peers share role, size, weight and numeric treatment.
- Tables: semantic `<table>` with caption/head/body/foot; numeric columns and their headers right-aligned (never center a header over right-aligned numbers); body cells `vertical-align: baseline`; multi-line headers bottom-aligned; consistent units and precision, no fake precision; compact density only for real lookup; reorder columns before shrinking; wide tables own the full width.
- Data honesty: zero baselines for length encodings unless a marked range/delta view; shared scales for peer bars; direct labels over legends; a table or text alternative for chart data; state the active filter and total counts on filtered ledgers.
- Restraint: design in monochrome and use color only for meaning, paired with a non-color cue; no badges/pills for ordinary metadata; no cards inside cards; no decorative gradients, glows or icon tiles; default to stillness; no em dashes.

---

## 4. What we use / what we avoid and why

### Use

- **`geist` npm fonts (Sans + Mono variable WOFF2, 1.9.0), self-hosted.** Already vendored and identical to npm. Keeps `tnum`, `case` and all stylistic sets that Google Fonts strips. Load through `next/font` (either the `geist` package in `apps/web` or `next/font/local`) to get preloading and fallback metrics.
- **`tabular-nums` everywhere numbers compare, plus a sign strategy.** Required by the guidelines and by the font's proportional default digits; signs need explicit handling (see section 2).
- **Web Interface Guidelines as a review gate.** `web-design-guidelines` skill or `command.md` checklist on every UI PR; Facet rule IDs in findings.
- **react-best-practices and composition-patterns as Facet engineering rules.** Compound components with explicit variants, no boolean-prop sprawl, React 19 ref handling, no barrel imports in hot paths, minimal client serialization, virtualization.
- **design.md evidence and table rules** for every table, KPI and chart in the dashboard.
- **App Router patterns from next-learn and the admin template:** server components reading `searchParams`, Suspense boundaries per panel, matching skeletons, Server Actions with validation.
- **Turborepo `with-tailwind` package layout** and turbo task config for `apps/web` + `packages/facet`.
- **TanStack Table column model and the shadcn chart wrapper idea** (from shadcn `dashboard-01`), restyled with Facet tokens; Radix or Base UI primitives for behavior only.
- **nuqs** for URL state and **virtua** or `content-visibility: auto` for long tables (both named in the guidelines).

### Avoid

- **`@geist-ui/core`:** community project, not Vercel; would fork our token source of truth.
- **`vercel-brand.css` / `vbg-*` classes and the design.md authorship shell:** built for Vercel-authored pages, carries the Vercel wordmark and triangle; using it would misrepresent authorship and breach the brand usage rules.
- **Vercel, Next.js or v0 logos and naming in product UI:** prohibited by brands.md misuse rules (no marks in product names, no implied endorsement).
- **Google Fonts Geist** if we want stylistic sets, `case`, or a plain Mono zero; it drops them. Acceptable only if we decide those features are unnecessary and want the smaller subset.
- **`viewport.maximumScale: 1`** (present in vercel/chatbot): disables zoom, contrary to INT-05/INT-06.
- **Client-only tab or filter state** (admin template pattern): breaks deep links (INT-11, INT-24).
- **Geist Serif and Geist Pixel:** decorative display faces, extra bytes, no role in a dense data UI.
- **Relying on `GeistSans` for italics:** the export loads only the upright file; if italics are needed, add `Geist-Italic[wght].woff2` via `next/font/local` deliberately.
- **Heavy JS animation libraries for live data** (`framer-motion`/`motion` are in the chatbot): prefer CSS transitions on `opacity`/`transform`; reserve view transitions for navigation.
