# Typography

> Source: the `.text-*` rules in vercel.com production CSS (2026-11-02, see `SOURCES.md`). Values in `tokens/typography.tokens.json`.

## Typefaces

- **Facet Sans** for everything a person reads: prose, headings, labels, controls, tables, KPIs, dates, counts, percentages, odds and money.
- **Facet Mono** only for machine values: code, commands, IDs, keys and cron expressions. Set only the value in Mono, never the whole sentence or table. Times people read (kickoff, "2 min ago") are Sans with tabular figures.
- Fonts are vendored in `fonts/`. Facet Sans and Facet Mono are the open-source `geist` typeface (variable, 100 to 900, SIL OFL 1.1, byte-identical to `geist@1.9.0`). Self-hosting keeps OpenType features that the Google Fonts build strips (stylistic sets, `case`, the plain-zero Mono option).
- In Next.js, load with the `geist` package (`geist/font/sans`, `geist/font/mono`). It sets `--font-geist-sans` and `--font-geist-mono`, which Facet's family tokens already read. The package export is upright only; add italics deliberately if ever needed.

## Roles

Every role fixes size, line height, weight and tracking together. Use the class; never set a loose `font-size`.

| Role | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-heading-72` | 72 / 72 | 600 | -4.32 | Marketing hero only |
| `text-heading-64` | 64 / 64 | 600 | -3.84 | Marketing |
| `text-heading-56` | 56 / 56 | 600 | -3.36 | Marketing |
| `text-heading-48` | 48 / 56 | 600 | -2.88 | Marketing, rare page display |
| `text-heading-40` | 40 / 48 | 600 | -2.4 | Large page titles |
| `text-heading-32` | 32 / 40 | 600 | -1.28 | Page title (dashboard) |
| `text-heading-24` | 24 / 32 | 600 | -0.96 | Section turns, KPI values |
| `text-heading-20` | 20 / 26 | 600 | -0.4 | Panel titles |
| `text-heading-16` | 16 / 24 | 600 | -0.32 | Subsection, modal titles |
| `text-heading-14` | 14 / 20 | 600 | -0.28 | Small group titles |
| `text-button-16` | 16 / 20 | 500 | 0 | Large buttons |
| `text-button-14` | 14 / 20 | 500 | 0 | Default buttons |
| `text-button-12` | 12 / 16 | 500 | 0 | Tiny button inside an input |
| `text-label-20` | 20 / 32 | 400 | 0 | Single-line, large |
| `text-label-18` | 18 / 20 | 400 | 0 | |
| `text-label-16` | 16 / 20 | 400 | 0 | Titles, with `<strong>` |
| `text-label-14` | 14 / 20 | 400 | 0 | The most common style: menus, table cells, controls |
| `text-label-14-mono` | 14 / 20 | 400 | 0 | Mono paired with larger text |
| `text-label-13` | 13 / 16 | 400 | 0 | Secondary line beside a label, numbers (tabular) |
| `text-label-13-mono` | 13 / 20 | 400 | 0 | Mono paired with label-14 |
| `text-label-11` | 11 / 16 | 400 | 0.2 | The smallest role: small badges and dense tags, with `<strong>` (500). From the font page |
| `text-label-12` | 12 / 16 | 400 | 0 | Tertiary text in busy views |
| `text-label-12-mono` | 12 / 16 | 400 | 0 | |
| `text-copy-24` | 24 / 36 | 400 | 0 | Marketing hero copy |
| `text-copy-20` | 20 / 36 | 400 | 0 | Marketing hero copy |
| `text-copy-18` | 18 / 28 | 400 | 0 | Marketing, quotes |
| `text-copy-16` | 16 / 24 | 400 | 0 | Roomier views: modals, page ledes |
| `text-copy-14` | 14 / 20 | 400 | 0 | The most common multi-line style |
| `text-copy-14-mono` | 14 / 20 | 400 | 0 | |
| `text-copy-13` | 13 / 18 | 400 | 0 | Secondary text where space is at a premium, captions |
| `text-copy-13-mono` | 13 / 18 | 400 | 0 | Inline code |

**Modifiers via `<strong>`:** inside copy and label roles a nested `<strong>` becomes the Strong variant (copy: weight 550, gray-1000; label: weight 500, gray-1000). Inside headings 16 to 32 it becomes the Subtle variant (weight 500, gray-900).

**Label vs copy:** labels are single-line with generous line height for aligning with icons. Copy is multi-line with reading leading.

## Numbers

- `font-variant-numeric: tabular-nums` (`.tabular` / `.fc-num`) on any column, KPI or value that is compared. Tables in Facet set it by default.
- Tabular figures equalize digits only. Signs and separators keep their own widths in Facet Sans (`+` 558, `-` 419, `−` 520, `.` and `,` 201 units, digits 600). For American odds and signed deltas in a column, wrap the sign: `<span class="fc-signed"><span class="fc-sign">+</span>150</span>`, or right-align and accept the sign drift for single-sign columns.
- Keep peer precision consistent (all odds to 2 decimals, all percentages whole numbers). No fake precision.

## Measure and rhythm

- Prose 60 to 68 characters per line. Rewrite before shrinking.
- Heading to its first paragraph: close (8px). Paragraph to paragraph: one rhythm (16px). Group to group: 24 to 32px. Section turns: 48 to 64px.
- Headings wrap into balanced lines (`text-wrap: balance`, set in base.css), so no word is left stranded.
- Hierarchy through type before surfaces or color. Never use tiny gray copy to make density fit.
