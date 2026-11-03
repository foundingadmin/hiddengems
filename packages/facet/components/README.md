# Facet component specs

Synthesized component specs for **Facet**, the design system behind **Hidden Gems** (NFL bet-research dashboard). Source: vercel.com reference docs, captured 2026-11-02 (Markdown pages plus rendered-page measurements where the prose is silent). Values marked *(measured)* were read from the rendered vercel.com/geist pages. *(inferred)* marks conservative guesses. "Not specified by the reference" means no value was found.

**Tiers:** **P0** needed for the first slate/detail release. **P1** soon after. **P2** later or optional.

## Cross-cutting facts
- **Control height scale:** small **32px** (`--ds-size-small`), medium **36px** (`--ds-size-medium`, default), large **40px** (`--ds-size-large`). Used by Button, Input, Select, Switch, Note min-height and Table header. Button also has `tiny` 24px for icon-only buttons.
- **Focus:** buttons, tabs and switch use `--ds-focus-ring` (2px background gap + 2px ring in the brand accent; the reference uses blue-700). Text inputs and select use `--ds-focus-border` (1px dark ring + 4px soft halo) on focus.
- **Borders:** controls draw a 1px ring with `--ds-gray-alpha-400`, which moves to 500 on hover and 600 on focus. Static dividers use solid `--ds-gray-400`.
- **Materials:** 6px radius (base and small surfaces, tooltip), 12px (medium/large surfaces, menu, modal), 16px (fullscreen).
- **Motion:** popovers .2s, overlays .3s with scale .96, curve `--ds-motion-timing-swift`. Control transitions 150ms.
- **"success" means blue in the reference** (Note `success`, Progress `success`, Toggle on-state). Decide explicitly whether Facet follows this.

## Casing

The reference writes UI labels in Title Case. Facet uses sentence case everywhere (see `foundations/content.md`), and these specs follow Facet.

## Index
| Component | Purpose | Tier | Spec |
|---|---|---|---|
| App shell | Sidebar, top bar and scope switcher frame | P0 | [app-shell.md](app-shell.md) |
| Appraisal certificate | A slip as one card: legs, stakes, lose it all | P0 | [cert.md](cert.md) |
| Page header | Page title row with actions | P0 | [page-header.md](page-header.md) |
| Range select | Week, window and date range picker | P0 | [range-select.md](range-select.md) |
| Rail slip | The slip in progress in the desktop rail | P0 | [rail-slip.md](rail-slip.md) |
| Hero | Marketing moment with the animated field | P1 | [hero.md](hero.md) |
| Stat | Headline number with basis line | P0 | [stat.md](stat.md) |
| Chart card | Titled chart with axes, threshold and empty state | P0 | [chart-card.md](chart-card.md) |
| Chat | Assistant transcript, context chips, suggestions and composer | P0 | [chat.md](chat.md) |
| Legend | Series key with totals | P0 | [legend.md](legend.md) |
| Metric row | Value, change and sparkline in one row | P0 | [metric-row.md](metric-row.md) |
| Rank list | Top-N bars (best price share) | P1 | [rank-list.md](rank-list.md) |
| Team mark | Team logos, players and matchups (sport kits) | P0 | [team.md](team.md) |
| Meter | Quota and limit bars | P0 | [meter.md](meter.md) |
| Severity | Alert level glyph and word | P1 | [severity.md](severity.md) |
| Freshness line | How old the data on a panel can be | P0 | [freshness.md](freshness.md) |
| List | Settings collection rows (books, providers) | P0 | [list.md](list.md) |
| Feed | Activity grouped by day | P1 | [feed.md](feed.md) |
| Schedule | Pull schedule row and editor | P1 | [schedule.md](schedule.md) |
| Input group | Input with prefix or suffix | P0 | [input-group.md](input-group.md) |
| Stepper | Minus, value, plus | P1 | [stepper.md](stepper.md) |
| Steps | Numbered steps for a short task done in order | P0 | [steps.md](steps.md) |
| Secret | One-time key reveal and masked value | P1 | [secret.md](secret.md) |
| Action link | Standalone text link ending in an arrow that slides through on hover | P0 | [link-action.md](link-action.md) |
| Guide marker | Correct and incorrect usage in docs; neutral by default, critical for hard rules | P0 | [guide-marker.md](guide-marker.md) |
| Table | Sortable, comparable same-shape rows (the bet slate) | P0 | [table.md](table.md) |
| Badge | Static status/category label (confidence tier) | P0 | [badge.md](badge.md) |
| Status dot | 10px lifecycle dot (deployments only in the reference; feed freshness as a Facet extension) | P0 | [status-dot.md](status-dot.md) |
| Gauge | Circular 0–100 meter (composite gem score) | P0 | [gauge.md](gauge.md) |
| Pie gauge | Inline 13–16px percentage icon (score column) | P0 | [pie-gauge.md](pie-gauge.md) |
| Note | Inline persistent contextual message (data caveats) | P0 | [note.md](note.md) |
| Button | Primary action control | P0 | [button.md](button.md) |
| Tabs | Sibling views within a page (Sheet sections) | P0 | [tabs.md](tabs.md) |
| Toggle | Immediate boolean setting (auto-refresh) | P0 | [toggle.md](toggle.md) |
| Switch | 2–3 option segmented control (odds format) | P0 | [switch.md](switch.md) |
| Select | Native dropdown for short fixed lists (sort, week) | P0 | [select.md](select.md) |
| Combobox | Type-to-filter single choice (player lookup) | P0 | [combobox.md](combobox.md) |
| Multi select | Several values from a known list (books, markets) | P0 | [multi-select.md](multi-select.md) |
| Filter params | URL-backed filter bar (market/sportsbook filters) | P0 | [filter-params.md](filter-params.md) |
| Input | Single-line text (stake, custom line) | P0 | [input.md](input.md) |
| Search input | Search field with clear and ⌘K hint | P0 | [search-input.md](search-input.md) |
| Tooltip | Hover/focus "why" explanation | P0 | [tooltip.md](tooltip.md) |
| Menu | Click-opened action list (row actions, columns) | P0 | [menu.md](menu.md) |
| Sheet | Side panel detail view (bet inspector) | P0 | [sheet.md](sheet.md) |
| Entity | Descriptive row with 1–2 actions (signals, news) | P0 | [entity.md](entity.md) |
| Middle truncate | Keep start and end of long strings (prop names) | P0 | [middle-truncate.md](middle-truncate.md) |
| Relative time card | `2m ago` with absolute-time hover (odds updated) | P0 | [relative-time-card.md](relative-time-card.md) |
| Skeleton | Layout-shaped loading placeholder | P0 | [skeleton.md](skeleton.md) |
| Spinner | Short action-triggered loading indicator | P0 | [spinner.md](spinner.md) |
| Loading dots | Inline "work in progress" dots | P0 | [loading-dots.md](loading-dots.md) |
| Empty state | Zero-results / first-run / outage placeholder | P0 | [empty-state.md](empty-state.md) |
| Error | Block-level load failure with recovery | P0 | [error.md](error.md) |
| Toast | Transient confirmation (`Bet tracked`) | P0 | [toast.md](toast.md) |
| Context card | Rich hover preview (player card, full market name) | P0 | [context-card.md](context-card.md) |
| Description | Key/value metadata (Sheet summary) | P0 | [description.md](description.md) |
| Keyboard input | Shortcut keycaps (`Kbd`) | P0 | [keyboard-input.md](keyboard-input.md) |
| Show more | Expand truncated lists (signals, books) | P0 | [show-more.md](show-more.md) |
| Signed money | Profit and loss with their sign, in edge green or red | P0 | [money.md](money.md) |
| Separator | Section and toolbar dividers | P0 | [separator.md](separator.md) |
| Checkbox | Multi-select and acknowledgements (bulk rows) | P0 | [checkbox.md](checkbox.md) |
| Progress | Determinate progress bar (ingestion/scoring) | P1 | [progress.md](progress.md) |
| Split button | Primary action + related variants (Export) | P1 | [split-button.md](split-button.md) |
| Context menu | Right-click mirror of row actions | P1 | [context-menu.md](context-menu.md) |
| Command menu | Global ⌘K palette | P1 | [command-menu.md](command-menu.md) |
| Modal | Blocking decision dialog | P1 | [modal.md](modal.md) |
| Drawer | Mobile bottom sheet (filters, detail) | P1 | [drawer.md](drawer.md) |
| Calendar | Date-range picker (history/backtests) | P1 | [calendar.md](calendar.md) |
| Collapse | Accordion for optional detail (methodology) | P1 | [collapse.md](collapse.md) |
| Load more button | Append next page of a list | P1 | [load-more-button.md](load-more-button.md) |
| Avatar | Team/player/book imagery and groups | P1 | [avatar.md](avatar.md) |
| JSON view | Collapsible raw payload inspector | P1 | [json-view.md](json-view.md) |
| Scroller | Overflow rails (game strip, news feed) | P1 | [scroller.md](scroller.md) |
| Slider | Range input (min edge, odds range, weights) | P1 | [slider.md](slider.md) |
| Label | Accessible form label | P1 | [label.md](label.md) |
| Fieldset | Settings card with footer actions | P1 | [fieldset.md](fieldset.md) |
| Radio | Small exclusive choice set (settings) | P1 | [radio.md](radio.md) |
| Choicebox | Rich tile choice (risk profile) | P1 | [choicebox.md](choicebox.md) |
| Pagination | Prev/next sibling pages (week navigation) | P2 | [pagination.md](pagination.md) |
| Feedback | Emoji + text feedback on picks | P2 | [feedback.md](feedback.md) |
| Snippet | Copyable text / SecretValue | P2 | [snippet.md](snippet.md) |
| Grid | Marketing guide-line grid | P2 | [grid.md](grid.md) |
| Dots menu | Three-dot overflow trigger for Menu | P0 | [misc.md](misc.md#dots-menu-geistdots-menu) |
| Project banner | Unresolvable-until-fixed global notice (feed outage) | P1 | [misc.md](misc.md#project-banner-geistproject-banner) |
| Error card | Panel-level error tile | P1 | [misc.md](misc.md#error-card-geisterror-card) |
| Breadcrumbs | Hierarchy location | P1 | [misc.md](misc.md#breadcrumbs-geistbreadcrumbs) |
| Copy Button / Text With Copy Button | Copy affordances | P1 | [misc.md](misc.md) |
| Clearable input | Input with clear + Escape | P1 | [misc.md](misc.md) |
| Theme switcher | Light/System/Dark | P1 | [misc.md](misc.md#theme-switcher-geisttheme-switcher) |
| Textarea | Multi-line input | P2 | [misc.md](misc.md#textarea-geisttextarea) |
| Destructive Action Modal / Confirmation Input | Type-to-confirm destructive flows | P2 | [misc.md](misc.md) |
| Banner | Full-width announcement | P2 | [misc.md](misc.md#banner-geistbanner) |
| Code / Code Block | Syntax-highlighted code | P2 | [misc.md](misc.md) |
| File Tree, Address Input, Phone, Browser, Video, Book, Brands | Not relevant to Hidden Gems | P2 (skip) | [misc.md](misc.md) |
