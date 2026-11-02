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
- The reference renders unknown or not-applicable values as an em dash. **Facet deviation:** render an en dash `–` with `aria-label="Unknown"` in numeric cells, or the word "Unknown" where there is room (house rule: no em dashes anywhere). Never use `N/A`, `null` or an empty cell.
- Numeric columns use tabular figures (or Facet Mono) so digits line up.
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
- For dense mode, the reference has no compact table. If the 40px row is too tall, any Facet `density="compact"` option is a Facet extension and must be documented as one.

## Facet additions `[F]`
Implemented in `css/data.css` (load after `components.css`). Specimen: `preview/index.html#data`.

### Sortable headers
```html
<th scope="col" data-align="numeric" aria-sort="descending"><button type="button" class="fc-th-sort">Gap</button></th>
```
- The `<th>` carries `aria-sort` (`ascending` or `descending`) on the one sorted column; remove it from the others. The label is a `<button class="fc-th-sort">`.
- Indicator: a chevron in a soft circle (the reference's AI Gateway table), drawn by CSS. It shows on the sorted column only, and at half strength on hover or keyboard focus as a preview. Ascending rotates it.
- Numeric headers (`data-align="numeric"`) put the indicator on the inner side so the label stays aligned with the values.
- Numbers start largest first, text A to Z, times earliest first. A second click reverses.
- The caption states the sort in words and updates with it ("Sorted by gap, largest first."). Keep any sort select in the filter bar in sync with the headers.

### Frozen first column
`<table class="fc-table" data-sticky-column>` freezes the row-header column (plus the selection column when it comes first) while the rest scrolls inside `.fc-table-wrap`. A 1px `--fc-border-default` hairline marks the edge. Frozen cells repaint stripes, hover, checked and open rows, so fills never break. Set `--fc-frozen-width` on the wrap to the frozen width so keyboard focus scrolls clear of it (INT-02).

### Selection column
```html
<td class="fc-cell-select"><label><input type="checkbox" class="fc-check" aria-label="Select Mike Gesicki"></label></td>
```
- 40px column, 16px box, the whole cell is the hit target (INT-04). The header cell holds "Select all" and goes `indeterminate` when some rows are checked.
- Checked rows take `--fc-surface-fill`; the open row (the one shown in a sheet) keeps `aria-selected="true"` and gray-200. The check mark is the non-color cue.
- `.fc-check` is the 16px checkbox: unchecked ring `--fc-border-hover`, checked `--fc-surface-contrast` with an inverse check.

### Row actions
```html
<td class="fc-cell-actions"><span class="fc-row-actions"><button class="fc-button" data-variant="tertiary" data-shape="square" data-size="small" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for Mike Gesicki">…</button></span></td>
```
- Last column, header text visually hidden ("Actions"). One overflow button; put the rest in its menu.
- With a fine pointer the buttons appear on row hover, and always while focus is in the row or the menu is open. Touch screens always show them.
- The accessible name includes the row ("More actions for Mike Gesicki").

### Tip affordance
`.fc-has-tip` adds a 1px dotted gray-600 underline to a value or header that carries an explanation. Make it focusable (`tabindex="0"`) and point it at its tooltip with `aria-describedby`. Tooltips, time cards and menus open as `popover` elements with `.fc-float`, so a scrolling table never clips them. Tips add information (the vig basis, a small sample); never restate the value.

**Header help (owner decision, 2026-11-02).** Data-rich tables give every derived or jargon column header a tip, so headers stay one or two words and never wrap. A sortable header puts `.fc-has-tip` and `aria-describedby` on its `.fc-th-sort` button; the underline stays and the cursor stays a pointer. The tip defines the column in under ten words ("Our estimate minus the priced chance") and never repeats the header. Plain columns (Pick, Kickoff) get none.

### Notes
- `.fc-table-wrap` is now `position: relative`, so visually hidden header text and sticky cells stay inside the scroller instead of widening the page.
- Headers in Facet are sentence case (house rule), not Title Case as the reference says.

**Time cells (owner feedback, 2026-11-02).** A time column pairs the clock time with its day word, in mono and primary text ("Today 5:52 PM"), and the relative time under it in secondary sans ("8m ago"), generated by `stampTimes()` from the same `datetime` (`td.fc-time-cell`). Never a bare clock time in a table.

**Column widths (owner feedback, 2026-11-02).** Numeric columns hug their content (`width: 1%`). Mark the main text column's header `data-grow` (pick, message) and every other column hugs its content too, so the slack lands in one place and values never sit far from their header with a wide empty gap.

**Row count (owner feedback, 2026-11-02).** In a selectable table, the count sits in the main column header next to the select-all box (`.fc-th-count`): "5 of 31" when nothing is checked, "2 selected" when rows are. No "Showing 5 of 31" caption line; the visible sort arrow states the sort, and the caption keeps it for screen readers only.

**Divider clearance (owner rule, 2026-11-02).** Cell content never sits closer than 16px to a vertical divider, on either side: the frozen column's divider, and any column marked `data-divider`.
