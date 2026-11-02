# Brand, marketing and docs captures review

Sources: 8 vercel.com marketing captures (home, fluid, security, for-platforms, passport, workflows, connect, solutions/marketing-sites), the design team page, the Web Interface Guidelines page, the font page, the docs landing page and the vercel GitHub org (all captured 2026-11-01, rank 1 except GitHub). Every capture renders in dark mode.

Measurements were sampled from the full-resolution screenshots. The capture scale is 1.8 device pixels per CSS pixel, confirmed against three known values: the small button (32), the large button (40) and the `text-heading-48` line height (56). Pixel values below are CSS px and are estimates to about ±2px; confirm with computed styles before turning any of them into tokens.

## Top 10 takeaways

1. **The current site has no mesh gradient.** `reference/inbox` `vercel-DESIGN.md` (rank 4) calls the cyan-blue-magenta-amber mesh gradient "the entire decoration system". It does not appear in any of the 13 captures. Today's marketing is black, gray and white, and its decoration uses lightness only. vercel.com wins, so treat that file as outdated wherever it describes color or decoration.
2. **The run-in sentence is Vercel's main density device.** A bold primary-color lead clause runs into a secondary-gray continuation ("**Fluid runs invocations concurrently.** Overall cloud resources..."). The pattern appears in captions, stat blocks, feature cells, CTAs and on every line of the guidelines page. It puts a fast path and an audit path in one sentence, with no extra heading. Adopt it as `.fc-runin` (P0).
3. **Stat blocks are one reading unit.** "**37% lower** bounce rate." The number and its direction are primary, the noun is secondary, and the source (a customer logo) sits underneath. Adopt `.fc-stat` with value, qualifier and basis line for the Hidden Gems KPI strip (P0).
4. **Vercel's own comparison matrix uses Facet's verdict encoding.** The fluid page compares Servers, Serverless and Fluid row by row with a red, amber, green or gray dot plus a short phrase. This is independent confirmation of dot plus word, and it gives us a ready-made comparison-matrix pattern (P0).
5. **Cells share borders instead of sitting in cards.** Stat strips, feature rows, logo walls and certification rows are cells that share hairlines, so each edge is drawn once and nothing nests. In the product, KPI strips and comparison rows should do the same (P0).
6. **The page background flips on marketing and docs.** The page sits on Background 2 (#000 in dark) and raised content (cards, code, product panels) sits on Background 1 (#0a0a0a). Product pages stay on Background 1. Write this down as a surface rule (P1).
7. **The visible guide grid is opt-in.** It appears on only 2 of 8 marketing pages (security, solutions): a 1080 px frame with 12 columns of 90 px, `+` crosshairs and #1f1f1f lines on #000 (dark gray-200, about 1.2:1). Facet's `components/grid.md` claim that guides "must reach 3:1" does not match what ships. Keep the grid out of the product.
8. **The imagery is the product itself.** Live HTML renderings of dashboards, traces and firewalls with plausible data stand in for illustration. Facet marketing should show Facet-built screens with a sample-data disclosure, and fade edges with background images, not CSS masks (DES-11).
9. **Large type follows a strict scale.** Heroes use `heading-64` (64/64), sections use `heading-48` (48/56), headings break into two balanced lines, and marketing CTAs are pills. The 2023 type poster on the font page lists a "Label 11 strong" role (smallest badge) that Facet lacks. Facet's small badge uses a loose `font-size: 11px` instead. The poster also describes `heading-32` and `heading-20` differently from Facet.
10. **Add a scoped marketing surface rule set** (`data-surface="marketing"`). It would allow the guide grid, one hero decoration that varies lightness only, display roles, wider section spacing, pill CTAs, monochrome logo walls and one pausable loop. It would still forbid hue decoration, gradient text, glass, purple outside gems and color-only cues. Docs get their own small pattern set: grouped sidebar, tabbed code blocks, collapsible long blocks, changelog list, breadcrumb pager.

---

## 1. Grid and layout

### 1.1 Two containers, two jobs
- **What Vercel does.** The nav and every unframed page use a 1400 px container, the same as `--ds-page-width`. Framed pages (security, solutions) put a narrower 1080 px frame inside it. The docs content column is about 1024 px beside a sidebar of about 280 px.
- **Why it works.** The nav edge stays fixed across pages while each page picks its own content density.
- **Facet.** `foundations/layout-materials-motion.md` says "docs and marketing 1200px". The captures show 1400 for marketing containers, 1080 for framed grids and about 1024 for docs content. Re-measure with computed styles and correct the doc. Foundation rule. P1.

### 1.2 Framed guide grid
- **What Vercel does.** The hero band shows all 12 column guides. Each section below is a row that keeps the frame's outer verticals and adds only its own cell dividers (3-up, 4-up or 6-up). `+` crosshair marks sit on chosen intersections, never all of them. The security hero image has blue corner brackets, the only colored guide. Lines are #1f1f1f on #000.
- **Why it works.** Every block lands on a visible column, so dozens of small modules read as one sheet. The structure is pure lightness, so it never competes with meaning.
- **Facet.** Marketing only. Add `--fc-guide` (dark gray-200, light equivalent gray-200) and `.fc-guide-grid`. Correct `components/grid.md`: guides are decorative and `aria-hidden`, so a contrast floor is not required, and vercel.com ships about 1.2:1. Corner brackets stay gray, because blue in Facet means interaction. P2.

### 1.3 Unframed is the default
- **What Vercel does.** Six of the eight marketing pages show no guides at all. Whitespace and repeated alignment carry the structure.
- **Facet.** The marketing default is unframed, and the guide grid is a deliberate choice for pages that tile many small modules (feature matrices, stat strips). Pattern note. P2.

### 1.4 Section header split
- **What Vercel does.** An optional eyebrow (16 px icon plus a label-13 or label-14 word in secondary gray) sits above a heading in the left half. The lede sits in the right half, aligned to the heading's last line. Closing bands put the heading on the left and a CTA pair on the right ("Experience fluid" plus two buttons).
- **Why it works.** The heading names the section and the lede elaborates, so neither repeats the other (say it once). Two columns keep long headings from pushing the content down.
- **Facet.** Add `.fc-section-head` with title, optional eyebrow and aside slots. The product analog is the page header: title on the left, freshness and actions on the right. Pattern. P1.

### 1.5 Section rhythm
- **What Vercel does.** Gaps between sections are about 200 to 250 px. Spacing inside a section stays on the product ladder (8 to 32).
- **Facet.** The ladder stops at 64. Add marketing-only steps `--fc-space-24` (96), `--fc-space-32` (128) and `--fc-space-48` (192). Never use them in product. Token. P2.

### 1.6 Footer with system status
- **What Vercel does.** A 6-column sitemap: group headings in primary label-14, links in secondary, gray "New" badges. Below it sits a status line in mono caps with a dot ("ALL SYSTEMS NORMAL." with a blue dot, "LOADING STATUS…" with a gray dot) and a system, light and dark theme switch.
- **Why it works.** Freshness and status are always visible, with a dot plus a word.
- **Facet.** In the product, use a persistent data-status line ("Odds updated 2 min ago" with a freshness dot). Keep Facet's mapping: live is green, not Vercel's blue. Skip the caps in product. Pattern. P1.

## 2. Type at large sizes

### 2.1 Display roles in use
- **What Vercel does.** Heroes use 64/64 ("Agentic Infrastructure", "The power of servers, in serverless form"). Section headings use 48/56 ("Pay for compute, not idle time"). Card and FAQ titles use about 20 to 24. Quotes use display size, centered, with curly quotes. Ledes are copy-16 or copy-18 in secondary gray.
- **Facet.** This matches the existing roles. Codify: hero `heading-64` (`heading-48` on mobile, per the poster), section `heading-48`, never `heading-72` except on a single-word specimen. The headings render visibly lighter than Facet's 600 product headings; confirm the computed weight before changing anything. Foundation note. P2.

### 2.2 Balanced two-line headings
- **What Vercel does.** Nearly every heading breaks deliberately into two lines of similar length ("Pay for compute, / not idle time", "Frequently / asked questions").
- **Facet.** Add `text-wrap: balance` to every `text-heading-*` role (CON-07 already asks for it). Foundation rule. P1.

### 2.3 Run-in lead sentences
- **What Vercel does.** A strong primary clause followed by a secondary continuation, in the same size and line. It appears in fluid diagram captions, the workflows "Zero infrastructure management." cells, the solutions "Personalization." blocks, the "Ready to deploy?" CTA, the home "Zapier serves over 100 million / monthly website visits" proof line and every rule on the guidelines page.
- **Why it works.** Scanning the bold leads gives the whole argument; reading on gives the evidence. One element does the work of a heading plus a paragraph.
- **Facet.** Add `.fc-runin`: the container uses `--fc-text-secondary`, and a nested `<strong>` uses `--fc-text-primary` at the existing Strong weight (copy 550, label 500). In Hidden Gems, use it for pick rationale ("**Edge +4.2 pts.** Model 42%, market 38%."), notes and table captions. Component. P0.

### 2.4 Mono is for technical annotation
- **What Vercel does.** Mono appears in diagram node names (`serverless-1`, `fluid-1`), trace span names, axis ticks (`0ms 230ms 460ms`), font-metric tags (`710 530 0 -150`), command snippets, the product sub-nav label (`CONNECT`), comparison column headers (`FEATURES`, `SERVERS`) and the footer status. Eyebrows above headings are sans with an icon, not mono. That contradicts `vercel-DESIGN.md`'s claim that "every section eyebrow uses the monospace face".
- **Facet.** Keep the product rule: Mono for code, IDs and timestamps only. Allow marketing and docs to set technical annotations in Mono (measurements, axis ticks of diagrams, identifiers). No uppercase mono column headers anywhere, because they slow scanning of dense tables. Foundation note. P2.

### 2.5 Numbered markers
- **What Vercel does.** FAQ items carry `01` to `08` and setup steps carry `01`, `02`, `03`, in secondary gray, tabular, two digits.
- **Facet.** Use the same treatment for rank numbers in Hidden Gems ranked lists (`label-13`, secondary, tabular, fixed width) so names align. Pattern. P1.

### 2.6 Type role usage poster (font page, 2023)
The poster's usage notes differ from `foundations/typography.md`:

| Role | Poster says | Facet says | Action |
|---|---|---|---|
| heading-32 | Subsections of a dashboard tab | Page title (dashboard) | Reconcile against current docs; the poster is older than current CSS |
| heading-20 | Mobile step down from 32 | Panel titles | Add the mobile step-down note |
| heading-16 | Mobile step down from 24 | Subsection, modal titles | Add the mobile step-down note |
| heading-48 | Hero areas on mobile marketing pages | Marketing, rare page display | Adopt the poster's use |
| label-18 | Only used in the Gauge (medium) | Blank | Fill in |
| label-11 strong | Smallest badge; strong so it stands out | Missing; badge sm uses raw `font-size: 11px` in `components.css` | Check production CSS for `.text-label-11`; if present, add the role and use it in the badge (P1) |
| label-12-mono | Smaller alternative, mainly for documenting the library | Blank | Fill in |

## 3. Dense information on marketing pages

### 3.1 Stat block
- **What Vercel does.** On solutions, four cells share hairlines. Each holds "**37% lower** bounce rate." with the customer logo below. On the Zapier screenshot (home), `450K+` sits over "Agents built".
- **Why it works.** The unit and direction sit beside the number, the noun says what was measured, and the source line keeps the claim honest.
- **Facet.** Add `.fc-stat`: value in `text-heading-24` or `text-heading-32` (tabular), an optional qualifier, a label in secondary and a basis line (sample size, window, source). Peers share precision. In Hidden Gems: "**+6.2%** ROI / 41 picks, Weeks 1 to 8". Component. P0.

### 3.2 Metric tabs that drive a chart
- **What Vercel does.** In the security firewall and workflows dashboards, a row of metrics (icon plus label above, value below) doubles as tabs. The selected one is underlined and drives the chart below. A missing value renders as a dash.
- **Facet.** Use this for the Hidden Gems KPI strip on the analytics view, with the selected metric in the URL (INT-11). Unknown stays an en dash with `aria-label="Unknown"`. Pattern. P1.

### 3.3 Comparison matrix with dot and word
- **What Vercel does.** Six features run down the side and three options run across. Every cell is a colored dot plus a phrase: green for good, amber for partial, red for poor, gray for not applicable. Column headers are small caps mono.
- **Why it works.** Color is never alone, and the phrase carries the specific reason. Reading down a column tells you the verdict for an option at a glance.
- **Facet.** Add a comparison-matrix pattern built from `.fc-signal` cells (book versus book, prop versus prop, pick versus alternatives). Use sentence-case sans headers. Pattern. P0.

### 3.4 Side-by-side alternatives
- **What Vercel does.** On for-platforms, two architectures sit side by side under a vertical divider. Each has a diagram, a run-in summary, a key-value spec list (Tenants, Complexity, Best for, Used by) with the same keys in the same order on both sides, and a CTA.
- **Facet.** This is Facet rule 3 (qualitative alternatives on aligned rows) in practice. Add a `.fc-alternatives` pattern for comparing two bets or two lines. Pattern. P1.

### 3.5 Diagrams
- **What Vercel does.** Node-link diagrams in gray: small bordered nodes with an icon and a two-line label (name in primary, role in secondary), 1 px elbow connectors, and lane labels above columns (Team, Project, Domains). One accent marks the point being made (a blue "Vercel SDK" pill). The fluid timelines show state through line style (solid is active, dotted is idle) with mono lane labels.
- **Why it works.** State is carried by stroke style, not hue, so the one accent stands out.
- **Facet.** Add a diagram foundation: gray strokes, line style for state, at most one highlighted element, which uses weight or `--fc-text-primary` rather than a hue unless the hue carries its Facet meaning. In Hidden Gems, use it for "how a pick is built" explainers. Foundation. P2 (P1 if an explainer is planned).

### 3.6 Trace waterfall
- **What Vercel does.** Workflows shows span names in mono on the left with right-aligned tabular durations. A time axis with tick labels runs along the top, gridlines drop at each tick, and bars sit on one shared scale.
- **Facet.** This confirms the shared-lanes rule (label lane, value lane, plot lane). The Hidden Gems analog is a line-movement timeline across books from open to kickoff. Pattern. P1.

### 3.7 Feature grids
- **What Vercel does.** Three columns. Each item has an icon and a small secondary label (13), then a 16 px primary sentence, and on some pages a circular arrow button. The small label names the item and the large sentence states the benefit, which reverses the usual size order.
- **Facet.** Marketing only. P2.

### 3.8 Logo walls and proof rows
- **What Vercel does.** Two forms. (a) An unframed row of six logos, all white, spread evenly under the hero. (b) A framed 3×3 grid with alternating #0a0a0a and #000 cells, some carrying an arrow chip to a case study. Certifications (ISO 27001, SOC 2 and others) use a full-color badge, a green check and a label in a cell row. In the Connect picker, third-party icons are full color.
- **Facet.** Logos in social proof are monochrome (`currentColor` or a gray filter) and optically equal in size. Full-color third-party marks only where identifying them is the task (a picker). In Hidden Gems, show sportsbooks as text names, not logos. Pattern. P2.

### 3.9 FAQ
- **What Vercel does.** The heading sits in the left column across 2 to 3 lines. The accordion sits on the right with numbered items, the first open by default.
- **Facet.** Use this in marketing and docs. Build it from Facet `collapse`. P2.

### 3.10 Product UI as proof
- See section 5.1.

## 4. Color, gradients and decoration

### 4.1 Monochrome by default, even in marketing
- **What Vercel does.** Page chrome is black, gray and white. Color appears only (a) inside product screenshots (status badges, chart series, trace bars), (b) in code syntax, (c) in third-party marks in pickers and (d) in a few small accents: blue corner brackets and a blue horizon on the security hero, a blue "Vercel SDK" pill, the "Pro" plan name in blue and "Enterprise" in purple, purple "Enterprise" badges, purple and teal "Segment A/B" tags, and multicolored collaborator cursors.
- **Facet.** Facet's monochrome-first rule holds on marketing too. Every colored accent in the captures either carries meaning or is a small product-UI detail. Foundation confirmation. P0 (no change).

### 4.2 Where decoration is allowed
- **What Vercel does.** Decoration is confined to the first viewport and the closing band, and it only varies lightness. Examples: a radial white glow behind the hero mark (home, design page), a dot-matrix particle field (fluid), a 3D rolling word carousel driven by a dial (for-platforms), outlined and hollow letterforms (design page, the closing wordmark), a faded multilingual "Hello. Hallo. Hola." band and a sparkle starfield. Content sections below the hero are plain.
- **Why it works.** Decoration that only changes lightness cannot be confused with semantic color, and keeping it to the opening and close leaves the evidence sections calm.
- **Facet.** Allow it only on the marketing surface: one decoration per page, in the hero or closing band, gray or white only. See section 8. P2.

### 4.3 Third-party "inspired" reference is stale
- `vercel-DESIGN.md` (rank 4) describes a light, near-white canvas with a cyan, blue, magenta and amber mesh hero gradient. None of that appears in the November 2026 captures. Mark it in `SOURCES.md` as historical, superseded by these captures. Doc fix. P1.

## 5. Imagery

### 5.1 Product UI is the illustration
- **What Vercel does.** Heroes and feature sections show the real interface, rendered in HTML with realistic data (firewall traffic `1.0M / 950.8k / 3.0k`, trace spans, a customer dashboard with `$48,250 +12.8%`). Panels fade out at the bottom edge.
- **Facet.** Facet marketing shows Facet-built screens and real components with sample data plus a disclosure line ("Sample data from the Week 8 prototype", already a content rule). Fade with a background image, not a CSS mask (DES-11). Pattern. P2.

### 5.2 Wireframe abstractions
- **What Vercel does.** Skeleton blocks and mock browser chrome. The mock windows use red, amber and green traffic-light dots.
- **Facet.** Draw mock window dots in gray. Red, amber and green mean stop, wait and go in Hidden Gems, so a decorative traffic light on a marketing page would contradict the verdict language. Rule. P2.

### 5.3 Photography
- **What Vercel does.** Only the design team page uses photos. All are grayscale, in matching rounded frames with name, role, handle and country in label-12.
- **Facet.** Photos are grayscale by default on the marketing surface, so photography never spends the hue budget. Rule. P2.

## 6. Motion cues visible in captures

- **Input-driven explainers come with keyboard alternatives.** The for-platforms dial says "Turn or click the dial, or use the arrow keys". That is INT-26 in practice. Adopt it as a rule: every interactive explainer states its keyboard alternative in copy. P2.
- **Marquees.** Logo rows and identity-provider chip rows are clipped at both edges, which implies continuous scrolling. Facet bans marquees in the product. On the marketing surface, allow at most one muted loop per page, with a pause control if it runs longer than 5 s, and stop it under reduced motion (ANI-07, ANI-01). P2.
- **Streaming captions** ("Running the generateEmail step…", "Searching for flights…") end with an ellipsis, consistent with INT-13.
- **Tabs that compare** ("With Workflow SDK" and "Without Workflow SDK" over one code panel) swap content in place, with no page motion.

## 7. Dark and light

- Every capture is dark. The footer offers system, light and dark, so the pages are themeable, but the captures cannot show how light marketing renders.
- **Surface polarity, measured.** Marketing and docs pages use #000 (dark Background 2). Cards, code blocks and product panels use #0a0a0a (dark Background 1). The guidelines page uses #0a0a0a as its page. In light mode the same rule gives a #fafafa page with white cards, which matches Vercel's historic light marketing.
- **Facet.** Add a surface rule. Product: Background 1 everywhere (unchanged). Marketing and docs: page `--fc-surface-subtle`, content panels `--fc-surface-canvas`. Foundation rule. P1.

## 8. Conflicts with product rules, and a marketing surface rule set

| Marketing does | Facet product rule | Resolution |
|---|---|---|
| Visible guide grid with crosshairs | "Reject on sight: grid backgrounds" | Allowed only under `data-surface="marketing"` |
| Radial glows, particle fields, outlined letterforms | Rejects glows and decorative motion | One lightness-only decoration per page, hero or closing band only |
| Gradient fades on panel edges | DES-11 banding warning | Allowed with background images, not masks |
| Purple for the "Enterprise" plan, blue for "Pro" | Purple is gems only | Never in Facet. Plans use gray badges with words |
| Blue dot means "All systems normal" | Freshness live is green | Keep the Facet mapping |
| Red, amber and green window dots on mock browsers | Those hues are verdicts | Gray dots |
| Uppercase mono column headers and labels | Mono only for code, IDs, timestamps | Mono allowed for technical annotation on marketing; no uppercase headers |
| Title Case buttons on some pages ("Start Deploying", "Get a Demo") beside sentence case ("Talk to sales") | Sentence case everywhere | Keep sentence case. Vercel is inconsistent here |
| Em dashes in copy (solutions page, collaboration lede) | No em dashes | Keep the house rule |
| Pill CTAs | 6 px radius buttons | Pills allowed on marketing (`button.md` already has `shape`) |
| Marquee logo rows | No marquees | One muted loop with pause and reduced-motion stop |

**Recommendation: yes, add a separate marketing surface rule set.** Scope it with `data-surface="marketing"` on the page root, document it in a new `foundations/surfaces.md`, and teach `scripts/lint-color.mjs` (or a sibling lint) to fail when marketing-only classes or tokens appear under product routes.

What it allows:
1. The guide grid (`.fc-guide-grid`, `--fc-guide`), gray only.
2. One hero or closing decoration per page that varies lightness only.
3. Display roles 48 to 72 and copy 18 to 24.
4. Section spacing steps 96, 128 and 192.
5. Pill CTAs.
6. Product screenshots with sample-data disclosure.
7. Monochrome logo walls.
8. Grayscale photography.
9. One pausable, muted loop that stops under reduced motion.
10. Mono for technical annotation.

What stays forbidden everywhere:
- Hue used as decoration (gradients built from semantic hues, colored glows).
- Gradient text, glass, textures.
- Purple outside gems, and any color-only cue.
- Em dashes.
- Anything that breaks the Web Interface Guidelines.

**For agency reuse:** the hue allocation table is Hidden Gems specific. Keep the principle that every hue has one job, and let each product declare its own jobs, including one brand accent (`--fc-brand-*`) that its marketing surface may use. For Hidden Gems that accent is purple, so purple on its marketing still means gem.

**Report pages** (a likely agency need): product rules apply in full, plus the marketing surface's polarity (Background 2 page, Background 1 panels) and the `.fc-stat` and `.fc-runin` patterns. No decoration.

## 9. Guidelines, design and font pages

- **Guidelines page.** Content matches `guidelines/web-interface-guidelines.md` rule for rule; I found no rules missing from the digest. Two notes:
  - CPY-02 says "Facet decision pending", but `AGENTS.md` already settles sentence case everywhere. Update the digest note.
  - The page ends with "Integrate with agents": a review command and a downloadable `AGENTS.md`. Facet should ship a reusable `packages/facet/AGENTS.md` plus a review command for client projects (P1).
- **Guidelines page format.** One column of about 700 px. Each rule is a run-in ("**Clear focus.** Every focusable element...") with inline code chips and underlined links. Use this format for Facet's own rule pages and specimen (P1).
- **Principles on the font page poster.** Balanced, understandable, intuitive, simplistic, thoughtful, minimalistic, responsive, user-centric, accessible, consistent. Facet's "point of view" already covers these more concretely. Don't add a list of adjectives; it would fail "earn every line".
- **Font page specimen devices** for Facet's typography specimen (P2):
  - Metric guide lines with mono value tags (cap height 710, x-height 530, baseline 0, descender -150).
  - A spec list set at display size in three lanes: icon, label, value.
  - A hairline glyph grid with a selected cell inverted.
  - A live tester with weight, size and spacing sliders plus a reset.
- **Design team page.** The resource cards and segmented pill nav are brand-specific and carry Vercel identity (wordmark tiles, outlined giant wordmark). Do not adopt them.

## 10. Docs page patterns for Facet's documentation site and specimen

- **Top bar.** Mark, `/`, product name ("Docs") as a breadcrumb, then dropdown menus. "Ask AI" sits on the right.
- **Sidebar.**
  - Search with a `⌘ K` hint at the top.
  - Groups headed by small secondary labels ("Start", "Build AI apps"). Items in label-14 primary with a chevron when expandable. A "New" badge in blue (Facet: gray, since blue means interaction).
  - The sidebar sits on the #000 page with no border.
- **Hero.** Two-line heading, copy-16 lede, a button row (primary filled, then secondary outlined). On the right, a code block with underline tabs above it ("Deploy an app", "Set up your agent", "Call a model"), a header row with an icon and the label "terminal", and a copy button.
- **Collapsible long block.** A labeled header ("Agent Prompt") with copy and expand controls. The body is clipped, with a centered "Show more" pill on the fold.
- **Card grid.** Three columns. Each card has an icon, a label-16 title and a copy-13 secondary description. A tier tag in tiny mono sits beside the title ("Pro and Enterprise").
- **What's new list.** A date column (secondary, underlined), then a title and one-line summary, separated by hairlines. Use this for a Facet changelog.
- **End of page.** "Next" with a breadcrumb path ("Start / Getting started ›") and a "Was this helpful?" pill with four faces.
- **Not visible on this landing page:** an in-page table of contents and callouts. Capture an article page before specifying a TOC. For callouts, Facet's `note.md` already applies.
- **Facet.** Build the specimen (`preview/index.html`) and any docs site from these patterns. Code blocks reuse the `snippet` and `misc.md` code block specs (filename header, copy, tabs). P1.

**GitHub org capture** (GitHub's design system, not Vercel's, so rank 4 at most). A dense list row:
- Name plus a visibility badge, then the description.
- Topic chips, then one metadata line of icon-plus-value pairs separated by middots, ending in a relative time.
- A sparkline in its own right lane.

The metadata-line and right-lane sparkline are a useful reference for a Hidden Gems player or prop list row. P2.

---

## Proposed Facet additions

| Name | Type | What it does | Source | Priority |
|---|---|---|---|---|
| `.fc-runin` | Component (type) | Bold primary lead clause runs into secondary continuation | fluid, workflows, solutions, guidelines | P0 |
| `.fc-stat` | Component | Value, qualifier, label and basis line in one unit; peers share precision | solutions, home | P0 |
| Comparison matrix | Pattern | Options across, criteria down, `.fc-signal` dot plus phrase per cell | fluid | P0 |
| Shared-hairline cell strip | Pattern | Cells share borders, no card per metric | security, solutions, fluid | P0 |
| Metric tabs | Pattern | KPI row doubles as tabs that drive a chart; state in URL | security, workflows | P1 |
| `.fc-section-head` | Pattern | Eyebrow plus heading left, lede or actions right | fluid, workflows, passport | P1 |
| `.fc-alternatives` | Pattern | Two options side by side with identical key-value rows | for-platforms | P1 |
| Timeline and waterfall | Pattern | Label, value and plot lanes on one shared time scale | workflows | P1 |
| Ranked number marker | Pattern | Two-digit secondary tabular index for ranked lists | passport, connect | P1 |
| Status line | Pattern | Persistent dot plus word for global data freshness | all footers | P1 |
| Surface polarity rule | Foundation rule | Marketing and docs: Background 2 page, Background 1 panels | docs, all marketing (measured) | P1 |
| `text-wrap: balance` on headings | Foundation rule | Two balanced heading lines | all pages | P1 |
| `text-label-11` | Token (type role) | Smallest badge text, strong; replaces raw 11px in badge sm | font page poster | P1 (verify in CSS) |
| Type usage reconciliation | Doc fix | heading-32, 20, 16, 48 and label-18, 12-mono usage notes | font page poster | P1 |
| Container widths correction | Doc fix | 1400 marketing container, 1080 framed grid, about 1024 docs column | all captures (measured) | P1 |
| `SOURCES.md` stale note | Doc fix | Mark `vercel-DESIGN.md` color and decoration claims as superseded | all captures | P1 |
| Facet `AGENTS.md` and review command | Tooling | Portable agent rules for client projects | guidelines page | P1 |
| Docs kit | Pattern set | Grouped sidebar, tabbed code block, collapsible block, changelog list, breadcrumb pager, feedback | docs | P1 |
| `foundations/surfaces.md` and `data-surface="marketing"` | Foundation | Scoped allowances and bans listed in section 8, with lint enforcement | all marketing | P2 (write rules P1) |
| `--fc-guide`, `.fc-guide-grid` | Token and component | Gray guide lines, 12 columns, crosshairs | security, solutions | P2 |
| `--fc-space-24/32/48` | Token | 96, 128, 192 section spacing, marketing only | all marketing | P2 |
| Diagram foundation | Foundation | Gray strokes, line style for state, one highlight | for-platforms, fluid, passport | P2 |
| Logo wall | Pattern | Monochrome, optically sized, evenly spaced or framed cells | home, workflows, solutions | P2 |
| Imagery rules | Foundation rule | Product UI as imagery, grayscale photos, gray mock window dots | all marketing, design page | P2 |
| FAQ split | Pattern | Heading left, numbered accordion right | passport, connect, security | P2 |
| Type specimen devices | Pattern | Metric guide tags, three-lane spec list, glyph grid, live tester | font page | P2 |
| Brand accent slot `--fc-brand-*` | Token | Per-product accent for agency reuse; Hidden Gems maps it to gem purple | Facet decision | P2 |
