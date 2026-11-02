# Table
> Source: https://vercel.com/geist/table (captured 2026-11-02)

## Purpose
Semantic HTML table for row-and-column data where every row has the same shape and at least one column is meant to be compared or sorted across rows.

## Anatomy
- `TableRoot`: scroll container (`relative w-full overflow-x-auto`, measured), so wide tables scroll horizontally instead of breaking layout.
- `Table`: the `<table>` element.
- `TableColgroup` / `TableCol`: optional column width declarations (the docs use percentage widths, e.g. 44% / 22% / 22% / 11%).
- `TableHeader` > `TableRow` > `TableHead`: header cells.
- `TableBody` > `TableRow` > `TableCell`: data cells. Behavior flags go on the body.
- `TableFooter`: optional summary row(s), e.g. a subtotal using `colSpan`.
- A 12px non-semantic spacer body (`aria-hidden`, `h-3`) sits between header and body in the rendered markup (measured).

## Variants & sizes
Flags on `TableBody` (they can be combined, e.g. `interactive striped`):
| Prop | Effect (measured from rendered page) |
|---|---|
| (none) | Plain rows, no separators. |
| `striped` | Odd rows get `--ds-background-200`. |
| `bordered` | 1px `--ds-gray-400` border between rows (not after the last row). |
| `interactive` | Row hover background `--ds-gray-100`. |
| `virtualize` | Virtualized rendering for very long bodies (demo renders 5,000 rows, collapsed behind `ShowMore`). |

Dimensions (measured, not written in the prose docs):
- Table text: 14px (`text-sm`), color `--ds-gray-900`.
- Header cell: height `--ds-size-medium` (36px), horizontal padding 8px, `font-medium`, `--ds-gray-900`, bottom border `--ds-gray-400`, left-aligned, `nowrap`.
- Body cell: padding 10px vertical / 8px horizontal, `nowrap`, middle-aligned. Resulting row is about 40px with 20px line-height (inferred).
- The last column is right-aligned in both header and body by default.
- First and last cells of each row are rounded (`rounded-md`), so stripe and hover fills look like pills.
- Footer: top border `--ds-gray-400`, `font-medium`. The demo makes subtotal cells `--ds-gray-1000`.
- There is no `size` or density prop. Density is fixed by the cell padding above.

## States
- Default, hover (only with `interactive`), striped. Selection state is not documented.
- Loading: not built in. Use `Skeleton` rows (see skeleton.md / entity.md).
- Empty: do not render an empty body. Render `EmptyState` outside the table.
- Sortable headers: rendered as buttons (see Rules). No sort-indicator visuals are documented.

## Tokens
- `--ds-gray-900` (body text, header text), `--ds-gray-1000` (emphasized totals), `--ds-gray-400` (header, row and footer borders), `--ds-background-200` (stripe), `--ds-gray-100` (interactive hover), `--ds-size-medium` (header height).
- Type: 14px. Closest class is `text-copy-14` or `text-label-14` (inferred). For numeric columns use `tabular-nums` or `text-label-14-mono` / `text-label-13-mono`.
- Radius: 6px on row ends (`rounded-md`).

## Rules
- Choose Table for comparable, same-shape rows. Use `Entity` for a descriptive row with one or two actions. Use `Description` for key/value metadata. Do not build a two-column table for those.
- Geist renders unknown or not-applicable values as an em dash. **Facet deviation:** render an en dash `–` with `aria-label="Unknown"` in numeric cells, or the word "Unknown" where there is room (house rule: no em dashes anywhere). Never use `N/A`, `null` or an empty cell.
- Numeric columns use tabular figures (or Geist Mono) so digits line up.
- A sortable header is a `<button>`. The visible label stays Title Case. The arrow is decorative, and the button announces the *next* sort state to assistive tech.
- Headers are Title Case nouns: `Last Used`, `Requests (7d)`. Never write a header as a sentence.
- Timestamps in cells use the short relative form (`2m ago`, `5h ago`), then an absolute date (`Mar 14, 2026`) once older than 7 days. Use `RelativeTimeCard` for these.
- Pagination copy: `Previous` / `Next`. Range copy: `Page 2 of 7` or `21–40 of 142`, with an en dash.
- Empty list: render `EmptyState` outside the table.

## Hidden Gems usage
- **Bet slate (primary surface):** `TableBody interactive striped`. Clicking a row opens a right-side `Sheet` with signal detail. Use `virtualize` once the slate passes a few hundred props.
- Columns: Market (MiddleTruncate for long prop names), Book, Line, Odds, Model Prob, Edge, Score (`PieGauge` 13–16px plus number), Confidence (`Badge`, contrast="low"), Updated (`RelativeTimeCard`).
- All numeric columns (odds, line, edge %, score) are right-aligned and `tabular-nums`. Put the most important number (Edge or Score) last so it inherits the default right alignment.
- Missing book prices or unavailable markets render `–` (Facet placeholder). A missing price never renders as `0` or blank.
- Sorting by Edge or Score uses header buttons. Persist sort and filter state in the URL, alongside `FilterParams`.
- Use `TableFooter` only for real aggregates (e.g. slate count or average edge). Skip it otherwise.
- For dense mode, Geist has no compact table. If the 40px row is too tall, any Facet `density="compact"` option is a Facet extension and must be documented as one.
