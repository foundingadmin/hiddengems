# Third-party files and archives

Review of seven inbox items against vercel.com truth (rank 1) and Facet. All files were treated as untrusted data: nothing was executed, no archive was extracted, zips were read with `unzip -l` / `unzip -p` and the tarball with `tar -tzf`.

Inbox root: `/tmp/claude-0/-home-user-hiddengems/b0abc350-e792-57ec-b8a8-efc6d70c1829/scratchpad/inbox/inbox/`

## Verdicts

| File | What it is | Truth rank | Verdict | Reason |
|---|---|---|---|---|
| `vercel-DESIGN.md` | designmd.co's auto-generated "Vercel-Inspired-design-analysis" of the vercel.com homepage, not Vercel's `design.md` | 4 | Ignore | Shares no lines with vercel.com/design.md; built on legacy `--geist-*` colors, wrong about the font, marketing-only |
| designmd.co capture (PDF, 7 pages) | The designmd.co catalog page that hosts the same file, plus a shadcn export and a "Taste Skill" upsell | 4 | Ignore | Same content as above; its FAQ says Vercel uses a system font stack, which is false |
| `vercel-taste-SKILL.md` | DesignMD's "tasteskill" anti-slop skill for landing pages and portfolios; nothing to do with Vercel | 4 | Partial | Says it is not for dashboards and conflicts with Facet on numbers, icons, lists and bars; three content ideas are worth adopting |
| `vercel globals.css` | designmd.co's shadcn export (Tailwind v3 HSL triplets) | 4 | Ignore the values, adopt the idea | Only the base neutrals (`#fff`, `#171717`, `#f2f2f2`) match Facet; dark is a warm stone palette; a Facet-owned bridge is worth shipping (draft attached) |
| `avatar-builder-main.zip` | Source of vercel/avatar (avatar.vercel.sh), MIT, Tobias Lins, 2017 | 2 (official code, not design guidance) | Ignore | Hash-to-hue gradients break the hue allocation and the no-gradient rule |
| `_Vercel Geist DS Website/` | Browser "save page" of vercel.com/geist/introduction (dark theme), with a browser extension's injected markup | 1 (it is vercel.com CSS) | Use as a check only | Its `--ds-*` values match Facet's captured primitives (82 of 82 sRGB, 70 of 70 P3); svgs are Vercel product logos, not icons |
| `geist-font-*` archives | Release build (v1.9.0 zip) and full source (zip and identical tar.gz) of vercel/geist-font | 2 | Partial | Adds Geist Serif, Geist Pixel, italics, static weights and OpenType feature data; nothing Facet needs to ship now, one typography fact to fix |

## 1. vercel-DESIGN.md

**Where it came from.** It is the DESIGN.md that designmd.co publishes on its Vercel catalog page (item 2 shows the identical text). The front matter says `version: alpha`, `name: Vercel-Inspired-design-analysis` and calls itself "An inspired interpretation of Vercel's design language". The body cites a generator pipeline (`scripts/derive-examples-block.mjs`, `/preview-design`, `/generate-kit`, `TO_FILL` markers). The YAML block (colors, typography, rounded, spacing, components with `{colors.x}` references) follows the alpha DESIGN.md token format used by AI design tools.

**Diff against vercel.com/design.md.** `diff` reports every line changed; `comm` finds zero shared non-blank lines. They are different documents that share a file name:

| | vercel.com/design.md (rank 1) | vercel-DESIGN.md (rank 4) |
|---|---|---|
| Purpose | Agent skill for official Vercel-authored report and decision pages | Style extraction of the marketing homepage |
| Front matter | `name: vercel-brand-guidelines` | `name: Vercel-Inspired-design-analysis`, `version: alpha` |
| Content | Reader's job, composition, tables as evidence, numeric alignment, published type roles, VBG CSS API, accessibility | Hex palette, marketing type sizes, pill CTAs, mesh gradient, pricing cards, nav |
| Data rules | Tabular numerals, right-aligned numeric headers, equal peers | None |

**What it gets wrong versus vercel.com and Facet.**

| Claim | Truth | Source |
|---|---|---|
| Geist is "proprietary (custom-cut)", substitute Inter or JetBrains Mono | Geist is OFL, on npm (`geist`) and Google Fonts | geist-font readme, `fonts/OFL-LICENSE.txt` |
| Colors `#0070f3`, `#ee0000`, `#f5a623`, `#7928ca`, `#50e3c2`, `#ff0080`, `#888888`, `#f7d4d6` are the brand palette | These are legacy `--geist-*` and `--accents-*` variables still present in vercel.com CSS; current UI uses the `--ds-*` scales | Saved site CSS (item 6) |
| `hairline-strong #a1a1a1` is "the 500-level gray" | Light gray-500 is `#c9c9c9`; `#a1a1a1` is dark-mode gray-900 | `tokens/primitives.tokens.json` |
| `body #4d4d4d` for secondary text | Correct (light gray-900) | primitives |
| `canvas-soft #fafafa` is the default page background | Facet: Background 1 (`#fff`) almost everywhere, Background 2 sparingly | `DESIGN.md` |
| `canvas-soft-2 #f5f5f5`, `mute #888888` | Not current tokens (gray-100 is `#f2f2f2`) | primitives |
| Success is blue | Legacy `--geist-success`; Facet deliberately uses green | `DESIGN.md` deviations |
| Inputs 40 / 32 / 48 tall (`--geist-form-*`) | Measured Geist controls: 32 / 36 / 40 | `foundations/layout-materials-motion.md` |
| `display-xl` 48/48, -2.4px | Facet `heading-48` is 48/56, -2.88px (Geist role); 48/48 is a marketing hero override | `tokens/typography.tokens.json` |
| Mono uppercase eyebrows on every section | Facet: Mono only for code, IDs, timestamps | `DESIGN.md` |
| Mesh gradient is "the entire decoration system" | Facet rejects decorative gradients; vercel.com/design.md rejects them for reports too | `DESIGN.md` "Reject on sight" |
| A condensed display face, Space Grotesk, is loaded | No evidence in the saved vercel.com CSS | item 6 |

Values that do match Facet: ink `#171717` (gray-1000), hairline `#ebebeb` (gray-400), radii 6/8/12/16, the 4px spacing base, page width 1400, and elevation levels 1, 3, 4, 5 (Facet `border-base`, `medium`, `large`, `2xl`).

**Useful differences.** None that Facet should adopt from this file. The breakpoints it lists (600, 960, 1200, 1400) are real, but Facet should take them from vercel.com CSS directly: the saved site's media queries use 400/401, 600/601, 960/961 and 1200/1201 most often. Facet documents columns (12/6/4) but no breakpoint widths, which is a gap (see recommendations).

## 2. designmd.co capture (PDF)

**What it is.** A full-page capture of `designmd.co/d/vercel`, a third-party catalog ("Your AI can code. Give it taste.", Pro plan, MCP setup, "Certify"). The page shows a "real homepage" thumbnail, a color token table, an export panel (shadcn/ui, Tailwind, CSS, JSON, WordPress, Elementor), the DESIGN.md text from item 1, a "Taste Skill (anti-slop)" toggle (item 3), an FAQ, and links to Atlassian, Cloudflare, Cursor and Linear entries. The shadcn export shown on page 1 is the same as item 4.

**What it claims about Vercel.** Everything in item 1, plus:

- "The Vercel design system pairs a #171717 primary color with a clean system font stack" and FAQ "Vercel relies on a system font stack". False: vercel.com loads Geist Sans and Geist Mono. The site's own homepage thumbnail renders in a serif fallback, which suggests its crawler never loaded Geist.
- "Built for Dev Tools interfaces in a light theme". Vercel ships light and dark equally (Facet captured both).
- FAQ "Does Vercel publish a public design system?" answers with the site's own DESIGN.md. Vercel does publish one: vercel.com/geist (84 pages as Markdown) and vercel.com/design.md.

**Missing from Facet.** Nothing that is true and applies to dense data UI. The marketing-specific facts (64px nav, 100px pill CTAs, pricing card polarity flip) are out of scope for a dashboard.

## 3. vercel-taste-SKILL.md

**What it is.** `name: design-taste-frontend`, "tasteskill: Anti-Slop Frontend Skill" by DesignMD (section 15.E points to "DesignMD's `certify_conformance` tool"). The only Vercel link is that it recommends Geist among fonts. Its first line scopes it to "Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI", and section 13 sends dashboards to Fluent, Carbon, Atlassian or Polaris.

**Its rules, summarized.**

1. Brief inference: state a one-line design read; ask at most one question.
2. Three dials (variance, motion, density), baseline 8/6/4, with presets.
3. Use an official design system package when the brief matches one; one system per project.
4. Stack defaults: Next.js RSC, Tailwind v4, Motion, `next/font`; verify dependencies before import.
5. Icons: Phosphor, HugeIcons, Radix, Tabler; Lucide discouraged; never hand-roll SVG icons.
6. Typography: avoid Inter as default, strict serif discipline, italic descender clearance.
7. Color: one accent, saturation under 80%, no AI purple glow, no beige-and-brass default, one palette.
8. Layout: anti-centered heroes, cards only for real hierarchy, one radius system, hero fits the viewport, eyebrow budget, no split headers, no zigzag runs, bento rules.
9. States: skeletons, composed empty states, inline errors, button and form contrast, no wrapped CTAs, one label per intent, one verb per action.
10. Forms: label above, no placeholder as label, error below.
11. Images: generate or source real images; no div-built fake screenshots.
12. Content: short sections, no data dumps, copy self-audit, flag fake-precise numbers, one register per page.
13. Motion: GSAP and Motion skeletons, no scroll listeners, transform and opacity only, reduced motion mandatory.
14. Dark mode in both modes, no pure `#000` or `#fff`.
15. AI tells: em dash ban, rationed middle dots, no decorative status dots, no generic names, no "Acme".
16. Redesign protocol: audit first, never silently change URLs, nav labels, form fields.
17. Reference codification: measure the reference, write falsifiable rules with a test each, rebuild from the rules alone.
18. A 60-item pre-flight checklist.

**Rules that conflict with Facet or vercel.com (Facet wins).**

| Taste rule | Facet / vercel.com | Note |
|---|---|---|
| Density 8 to 10: "font-mono for all numbers" | Sans with tabular figures; Mono only for code, IDs, timestamps | `DESIGN.md` Type row |
| Lucide discouraged; prefer Phosphor | Lucide at 16px / 1.5 stroke is a recorded Facet decision | `foundations/layout-materials-motion.md` |
| No pure `#fff` / `#000` | vercel.com background-100 is `#fff` (light); background-200 is `#000` (dark) | Saved site CSS |
| Tint shadows to the background hue | vercel.com shadows are neutral black alpha (`#0000000a` ...) | primitives |
| No `divide-y` lists over 5 items; no hairline per row | Tables are evidence; row borders are the reference table | `DESIGN.md` rule 4 |
| No data tables over 20 rows | Ledgers run 100+ rows; compact density exists for that | `DESIGN.md` deviations |
| No bars with filled background tracks | Facet bars share a documented scale; the rule there is "a bar track is never decoration" (a track is allowed when it shows the scale) | `DESIGN.md` rule 5 |
| Tactile `:active` translate or `scale(0.98)` | Not in Geist buttons; Facet motion only explains a change of state | `DESIGN.md` point of view |
| Spring physics, no linear easing | Facet swift easing `cubic-bezier(.175,.885,.32,1.1)` | tokens |
| En dash banned, ranges use a hyphen | Facet uses `–` with `aria-label="Unknown"` only as the unknown placeholder, not as a separator; no conflict in practice, but do not adopt the en dash ban | `DESIGN.md` deviations |
| Real images required, even on minimal pages | Dashboards are data; images only where they carry data (headshots, logos) | scope |
| Default dark tokens via `dark:` utilities | Facet themes through tokens; utilities never carry per-mode colors | `css/tokens.css` |

**Rules that already agree with Facet** (no action): em dash ban, skeletons over spinners, no glows or gradient text, cards only for real hierarchy, one radius system, reduced motion, transform and opacity only, label above input, no placeholder as label, z-index scale, color never decorative, no decorative status dots.

**Ideas worth adopting, and where.**

1. **One verb per action** (4.5). The same action keeps the same verb everywhere ("Remove pick" never becomes "Delete pick"). Extends WIG CPY-06 (nouns) to verbs. Add a row to the house style table in `foundations/content.md`.
2. **Label sample data and never invent precision** (4.9). Every number is real or visibly marked as sample. Facet already keeps disclosures; add one line to "Honest precision" (`DESIGN.md` rule 9) or `foundations/content.md` "What always stays": prototype and sample values carry a visible "Sample data" disclosure.
3. **Measure the reference, then write one test per rule** (section 15). This is how Facet was built (measured, `[G]` marks); write it down as the method for adding components in `components/README.md` or `SOURCES.md` "Re-sync": each new `[G]` value needs a measurement file in `reference/`, and each rule needs a check a bad copy would fail.
4. **Rationed separators** (9.F). At most one middle dot per metadata line; prefer columns. Useful for dense rows (team, time, market). Add to `foundations/content.md` house style.

## 4. vercel globals.css

**What it is.** designmd.co's shadcn/ui export (the export panel on PDF page 1 shows the same values). It uses the Tailwind v3 format (`--background: 0 0% 100%`, read as `hsl(var(--background))`) and a `.dark` class.

**Mapping and disagreements.** Values converted from HSL to hex.

| shadcn variable | globals.css light | Facet equivalent | Facet light | Match |
|---|---|---|---|---|
| `--background` | `#ffffff` | `--fc-surface-canvas` | `#ffffff` | yes |
| `--foreground` | `#171717` | `--fc-text-primary` | `#171717` | yes |
| `--card`, `--popover` | `#f7f7f7` | `--fc-surface-canvas` plus material shadow | `#ffffff` | no (not a token) |
| `--primary` / `-foreground` | `#171717` / `#ffffff` | `--fc-surface-contrast` / `--fc-text-inverse` | `#171717` / `#ffffff` | yes |
| `--secondary` | `#d0d0d0` | `--fc-surface-fill` | `#f2f2f2` | no |
| `--secondary-foreground` | `#0a0a0a` | `--fc-text-primary` | `#171717` | no |
| `--muted` | `#f2f2f2` | `--fc-surface-fill` | `#f2f2f2` | yes |
| `--muted-foreground` | `#6a6a6a` | `--fc-text-secondary` | `#4d4d4d` | no |
| `--accent` / `-foreground` | `#171717` / `#ffffff` | `--fc-surface-fill` / `--fc-text-primary` | `#f2f2f2` / `#171717` | no; shadcn paints hover rows with accent, so this file turns every hovered menu item black |
| `--destructive` | `#dc2626` (Tailwind red-600) | `--ds-red-800` (Facet error button) | `#da2f35` | no |
| `--border`, `--input` | `#dfdfdf` | `--fc-border-default` / `--fc-border-alpha` | `#ebebeb` / `#00000014` | no |
| `--ring` | `#171717` | `--fc-focus-color` | `#0072f5` | no; Facet focus is blue |
| `--sidebar` | `#f4f4f4` | `--fc-surface-subtle` | `#fafafa` | no |
| `--chart-1..5` | `#171717`, `#d0d0d0`, `#141414`, `#8d8d8d`, `#111111` | `--fc-chart-1..5` | gray-1000, blue-700, teal-700, pink-700, gray-700 | no; chart 1, 3 and 5 are indistinguishable (contrast 1.03 to 1.05) |

Dark mode disagrees everywhere: background `#171715`, card `#232321`, border `#3c3c3a` all carry hue 60 (a warm stone tint) while Vercel's grays are hue 0 (dark background-100 `#0a0a0a`, gray-1000 `#ededed`, gray-400 `#2e2e2e`); dark primary is `#535353` where Geist inverts to a light fill; destructive is Tailwind red-500.

**Should Facet ship a shadcn compatibility layer?** Yes, as an opt-in file, for three reasons. vercel.com/design.md itself expects "stock v0 or a generic Next.js, Tailwind, and shadcn project" and says to use installed shadcn "only for necessary behavior" with the foundation owning appearance. Vercel's current templates (vercel/chatbot, the shadcn dashboard block in `reference/vercel-ecosystem.md`) are shadcn-based, and v0 generates shadcn code. And without a bridge, any pasted shadcn component either breaks (Facet's `tailwind.css` resets `--color-*`, so `bg-background` does not exist) or pulls in a parallel theme like this one.

Draft: `/tmp/claude-0/-home-user-hiddengems/b0abc350-e792-57ec-b8a8-efc6d70c1829/scratchpad/review/facet-shadcn-bridge.draft.css`. Design choices:

- Tailwind v4 format only (variables hold whole colors). The v3 HSL-triplet format cannot point at Facet tokens.
- Right-hand side is semantic `--fc-*` only, except `--destructive` (mirrors `.fc-button[data-variant="error"]`, red-800) until a semantic token exists. Nothing maps to purple.
- Declared on every Facet theme selector, so values re-resolve on a `.dark-theme` subtree instead of inheriting stale root values.
- Does not redefine radius. shadcn's `--radius-sm: calc(var(--radius) - 4px)` block would overwrite Facet's 4/6/8/12/16 scale. Known gap: shadcn controls use `rounded-md` (Facet 8px) where Geist controls are 6px (`rounded-sm`); since shadcn components are copied code, fix the class in the copy.
- Known gap: shadcn focus styles are `ring-[3px] ring-ring/50`, not Facet's 2px gap plus 2px ring; replace with Facet's `:focus-visible` treatment in copied components.

## 5. avatar-builder-main.zip

**Contents** (22 files, 55.8 KB). A Next.js 16.2.11 app: `pages/api/avatar/[name].tsx` (edge route), `utils/gradient.ts`, `pages/index.tsx`, `next.config.ts` (rewrites `/:path*` to the API), `styles/`, `public/favicon.ico`, `pnpm-lock.yaml`, `LICENSE`, `README.md`.

**What it is.** The source of avatar.vercel.sh. MIT license, "Copyright (c) 2017 Tobias Lins". `generateGradient` sums the bytes of a SHA-1 of the name, takes it mod 360 as a hue, builds `hsl(h, 95%, 50%)` and its first triad color, and renders a diagonal two-stop gradient square (PNG via `next/og` `ImageResponse`, or SVG with optional white initials in `sans-serif`). Options: `size` (default 120), `rounded`, `text`.

**Useful for Facet?** No, for players, sportsbooks or anything else in Hidden Gems:

- Any hue can come out, including purple (gems only), green and red (go and stop) and amber (wait). A purple avatar beside a pick would read as a gem. This breaks the hue allocation, which is a hard rule.
- Saturated decorative gradients are on the "reject on sight" list.
- Players and sportsbooks have real identities: Facet's `components/avatar.md` already plans headshots, team logos and sportsbook logos, with an uppercase-letter fallback.
- The MIT license would allow reuse, so licensing is not the blocker; the design rules are.

If a deterministic fallback is ever needed, the safe version is the existing letter avatar on a gray fill (`--fc-surface-fill`, `--fc-text-secondary`), not a hue.

## 6. _Vercel Geist DS Website

**What it is.** A browser "save page" of `https://vercel.com/geist/introduction` (the `.webloc` points there), captured in the dark theme. The HTML contains injected markup from a browser extension (`plasmo-csui`, a `chrome-extension://` stylesheet); ignore those parts. Files: 3 CSS, 50 JS chunks, 12 SVG.

**Token comparison.** `--ds-*` definitions live in `27u1fqc0zeu4m.css` (764 declarations) and `32sjzx2_xsk_o.css` (477); `2ryj4miypvh4v.css` has none. I parsed the cascade with a script kept outside the inbox:

- sRGB scales: the winning declarations are `--ds-<scale>-<step>: hsla(var(--ds-<scale>-<step>-value), 1)`. All 82 color steps (gray, blue, red, amber, green, teal, purple, pink, background) match `tokens/primitives.tokens.json` in light and dark. Eight differ by one unit in a single channel only because my HSL-to-hex rounding is half-even where Chromium's is half-up (for example gray-900 `0, 0%, 30%` is `#4d4d4d` in Chromium).
- gray-alpha 100 to 1000: identical to Facet (light `#0000000d` to `#000000e8`).
- Display P3: the `@media (color-gamut: p3)` `oklch()` overrides match `reference/geist-p3-oklch-2026-11-02.json` exactly, 70 of 70 light and 70 of 70 dark.
- Shadows sampled (`2xs`, `2xl`, `border-base`, `border-inset`) match Facet.
- Dark backgrounds: background-100 `#0a0a0a`, background-200 `#000`.
- One dormant block: the first rule in `27u1fqc0zeu4m.css` declares hex and `lab()` values (purple-700 `#9f00f4`, blue-700 `#0070f7`) that differ from Facet in 67 of 70 steps. It is overridden later in the same file by the `hsla()` rules (same specificity, later order), so it does not render today. It looks like an sRGB fallback of the P3 palette. Do not adopt it; if a future `sync-primitives.mjs` run shows those values computed, review it as a Vercel palette change.

Conclusion: the saved site confirms Facet's primitives. Nothing to change.

**SVG files.** All 12 are light and dark pairs of product logos: `logo-vercel` (the triangle), `logo-next`, `logo-turborepo`, `ai-sdk`, `v-zero` (v0), `eve` (a wordmark). None is an interface icon. They are Vercel trademarks: Facet's rules forbid the Vercel logo, and Vercel's icons are not openly licensed. Do not copy any of them. Facet keeps Lucide.

## 7. geist-font archives

| Archive | Contents |
|---|---|
| `geist-font-v1.9.0.zip` (8.7 MB, 171 entries) | Release build: `Geist`, `GeistMono`, `GeistPixel`, `GeistSerif`, each with `otf/`, `ttf/`, `variable/`, `webfonts/`; plus `OFL.txt`, `DESCRIPTION.en_us.html`, `ARTICLE.en_us.html` |
| `geist-font-1.9.0.zip` (70 MB) and `geist-font-1.9.0.tar.gz` (68 MB) | Same source tree, 5,226 entries each: Glyphs sources, build scripts, Fontspector QA output, docs and the `geist` npm package (`packages/next`) |

**Beyond what Facet ships** (`fonts/Geist-Variable.woff2`, `fonts/GeistMono-Variable.woff2`, `OFL-LICENSE.txt`):

- **Geist Serif** (new in 1.9.0): variable `GeistSerif[ELSH]` and four statics (Regular, Square, Triangle, Heart). Not on Google Fonts yet; npm entry points `geist/font/serif/*`. A high-contrast display serif.
- **Geist Pixel**: variable `GeistPixel[ELSH]` and five statics (Square, Grid, Circle, Triangle, Line). Display only.
- **Italics**: `Geist-Italic[wght]` and `GeistMono-Italic[wght]` variable fonts plus italic statics. The npm package's `dist/fonts` ships uprights only.
- **Static weights**: Thin to Black for Sans and Mono (woff2, ttf, otf).
- **OpenType features** (from the Glyphs sources): Geist Sans has `tnum`, `pnum`, `case`, `frac`, `numr`, `dnom`, `sups`, `subs`, `sinf`, `ordn`, `liga`, `dlig`, `locl` and stylistic sets `ss01` to `ss11` (named sets include ss03 "Alt R" and ss08 "Alt numbers"). Geist Mono has the same minus `tnum`, `pnum`, `liga`, `dlig` and `ss05`. There is no feature documentation file; the names live only in the sources.
- **Readme correction**: the package readme now describes Geist Sans for "body copy, headlines" (older text said headlines and display only).

**Needed by Facet?** Not now. Serif and Pixel are display faces; Facet's point of view is two families (Sans everywhere, Mono for code), and vercel.com product UI uses neither. Italics are not in the type roles. `tnum` is the one feature Facet relies on, and it is present in Sans. Mono has no `tnum` because it is already fixed width.

## Recommended Facet changes

Prioritized. None touches generated files directly; token changes go through `tokens/*.json` and `node scripts/build.mjs`.

1. **Ship the shadcn bridge** as `packages/facet/css/shadcn.css`, generated by `scripts/build.mjs` from the mapping in the draft so it cannot drift. Document it in `DESIGN.md` "How to use it" with the two known gaps (rounded-md is 8px, shadcn focus ring) and the instruction to delete shadcn's generated theme blocks.
2. **Add a semantic destructive token**: `action.destructive` = red-800 and `action.destructive-hover` = red-900 in `tokens/facet.semantic.json`, then point `.fc-button[data-variant="error"]` and the bridge's `--destructive` at it, removing the last hue primitive from the bridge.
3. **Add two content rules** to `foundations/content.md` house style: "One verb per action: the same action keeps the same verb everywhere" and "Separators: at most one middle dot per metadata line; use columns in tables". Add "Sample and prototype values carry a visible disclosure; never invent precision" under "What always stays".
4. **Record the method** in `SOURCES.md` or `components/README.md`: every `[G]` value comes from a measurement file in `reference/`, and every rule has a check that a bad copy would fail.
5. **Document breakpoints** in `foundations/layout-materials-motion.md` from vercel.com CSS (rank 1): 600 and 960 are the main product breakpoints (max-width 600 / min-width 601, max-width 960 / min-width 961), with 400 and 1200 as secondary. Verify with `sync-primitives.mjs` or a live measurement before committing; do not cite designmd.co.
6. **Small typography fix**: `foundations/typography.md` says the `geist` package export is upright only; keep that, and add that italic variable fonts exist in the v1.9.0 release (`Geist-Italic[wght]`) if italics are ever needed. Mention that Geist Serif and Geist Pixel are out of scope for product UI.
7. **Note the dormant palette block** in `SOURCES.md` "Known inconsistencies": vercel.com CSS contains an overridden hex and `lab()` color block that differs from the computed palette; re-check on each re-sync.
8. **Optional**: `tailwind.css` declares the `dark` variant for `.dark-theme` and `data-theme="dark"` only, so `dark:` utilities (Facet's and shadcn's) do not fire when dark comes from the OS preference while tokens do. Consider a block-form custom variant that also covers `prefers-color-scheme: dark` without `.light-theme`.

Do not adopt from these files: any designmd.co color, the warm dark palette, gradient avatars, Vercel logos, mono numbers, Lucide replacement, tinted shadows, list-length bans.
