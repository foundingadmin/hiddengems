# Dashboard and monitoring review (Vercel app screens)

Source: the user's own Vercel dashboard, captured 2026-11-01 (dark theme). Screens reviewed: team projects overview, project analytics, CDN, firewall, firewall traffic, flags, logs, observability overview, observability alerts (with New monitor sheet open), observability query, speed insights, usage, team storage, plus the AI Gateway models table screenshot. Cron jobs settings was glanced at for scheduled-pull context.

Measurement note: the PDFs embed 2x bitmaps. Sizes below are CSS px estimated by halving pixel measurements, so treat them as plus or minus 2px. Where a nominal Facet token is close (32, 36, 48), assume the token.

## Top 10 takeaways

1. **Two-level sidebar, thin top bar.** Navigation lives in a left sidebar (~230px) that drills into a section (back chevron, centered section title, sub-nav with uppercase group labels). The top bar (~48px) only holds scope (project switcher), the page name or a breadcrumb, and two global actions. Hidden Gems should adopt this shell now, with the week as the "project" switcher.
2. **Controls row, not page chrome.** Most monitoring pages drop the big H1 and open straight into a controls row: scope on the left (environment, view), time range on the right, then `...` overflow. Pages that teach (CDN, Analytics, Plan usage) keep an H1 plus one-line description and a blue "Learn more" link.
3. **Time range is one compound control** used identically everywhere: a calendar icon cell, a divider, the label ("Last 12 hours", "Past day", "Last 30 minutes"), a chevron. Charts then label the x-axis relative to now ("12h ago" ... "2m ago").
4. **Legends carry the numbers.** Chart headers read "● Allowed 1.8k  ● Denied 2.6k  ● Challenged 37  ● Logged –". The legend is the KPI row. No separate stat cards above a chart.
5. **Delta color follows good or bad, not sign.** On CDN, "Requests 1.2K +79%" is green but "TTFB (p90) 5ms +67%" is red and "Bypasses 0 −100%" is green. Facet's `.fc-delta` colors by sign only; it needs a polarity attribute for non-edge metrics.
6. **Ranked lists encode share inside the number.** Firewall lists ("Top IPs", "Denied IPs", "Top AS names") show a right-anchored value chip whose gray fill width is proportional to the value, then a 56px gray sparkline, then `...`. Rank, magnitude and trend in one row without a separate bar lane.
7. **Empty charts keep their axes.** "No data in this time range" sits centered on the gridlines with a background knock-out; legend values become "–". The frame never collapses, so the page does not jump when data arrives.
8. **Empty states redirect.** Logs empty state: icon tile, "No Runtime Logs in the Last 30 Minutes", one sentence of why, then an "Other data sources" divider with two link rows. Every empty state names the scope that produced it ("in the selected time period", "in this time range", "in the last 3 days").
9. **Alert rules are sentences with a live preview.** New monitor sheet: "the metric [is above] [2500][ms] at [Medium] severity evaluated over a [1h] window", with a preview chart showing a dashed red threshold line over the last 7 days, and a footer "Back / Create Monitor / Estimated < $0.01/month". This is the right model for Hidden Gems alerts ("gap is above 8 pts for Sunday early").
10. **Color is rationed to data and state.** Chrome is entirely gray; primary buttons are white (gray-1000), not blue. Color appears only in series lines, level dots, delta pills, the quota bar, links, the toggle and the plan badge. Vercel itself breaks this in places (purple series, rainbow sparklines, a blue-gradient status card); Facet should keep its stricter rules there (see "Contradictions").

---

## 1. App shell

### What Vercel does

**Sidebar (~230px, background 1, right hairline gray-400 alpha):**
- Top: team switcher row: logo avatar, "Founding Creativ…" (truncated), blue "Pro" badge, up/down chevrons. Below it a "Find" input (~32px tall) with a single-key `F` keycap hint on the right.
- Nav items ~32px tall, 16px Lucide-weight icons, label in copy-14 gray-1000 (inactive items read slightly dimmer). Active item: gray-200-ish filled rounded rect (radius ~6 to 8), no colored rail. Items that own a section show a `>` chevron at the right edge.
- Groups separated by a full-width hairline, not headings, at team level (Projects ... CDN | Environment variables ... Daemons | Usage, Support, Settings).
- **Drill-in:** clicking Firewall, CDN, Logs, Observability or Flags replaces the sidebar with: back chevron, centered section title ("Firewall"), section sub-nav (Overview, Traffic, Rules, Audit log). Long sections add uppercase small-caps group labels in gray-900 ("COMPUTE", "CDN", "DEPLOYMENTS", "SERVICES", "VERCEL FLAGS", "MARKETPLACE").
- **Logs drill-in turns the sidebar into a filter rail** (data-source select, then "Filters" with collapsible facet groups). Navigation and filtering share one column.
- Bottom: dismissible promo card ("Flat Rate CDN / Keep CDN costs predictable... / Enable"), then a user row ("Founding Dev", `...`, bell with a blue unread dot).

**Top bar (~48px, bottom hairline):**
- Left: project switcher (project avatar, "akc", up/down chevrons), aligned to the content column, not the window edge.
- Center-left: page name in gray-1000 ("Project CDN", "Team Overview") or a breadcrumb "Project Firewall / Traffic" (parent gray-900, slash gray-500ish, current gray-1000).
- Right: text buttons "+ Create New" and "Agent". No avatars, no search; search lives in the sidebar.

**Content column:** centered, roughly 1450px wide at this window (consistent with Facet's 1400 + 24 margins). Gutter between sidebar and content is generous and empty.

### Why it works
The top bar never changes shape, so scope (which project, which page) is always in the same place. Section drill-in keeps the sidebar short (5 to 12 items) even though the product has 60+ destinations. Putting filters in the same rail on logs means the main column is 100% data.

### Facet adoption
- **New pattern `patterns/app-shell.md` + classes `.fc-shell`, `.fc-sidenav`, `.fc-topbar` (P0).** Tokens: `--fc-shell-sidenav-width: 232px` (measured ~230), `--fc-shell-topbar-height: 48px`, nav item height `--fc-control-small` (32). Active item `--ds-gray-alpha-200` fill, radius `--fc-radius-sm`; never a colored rail (matches the existing slate rule).
- **Hidden Gems mapping:** the "project switcher" slot becomes the **week switcher** ("Week 9" with up/down chevrons); the team switcher becomes the app name. Sidebar items: Slate, Watchlist, History, Alerts, Data (ingestion), Settings. "Data" drills in to Odds pulls, Injuries, Sources, Schedules (P1/P2).
- Breadcrumbs move into the top bar (promote Breadcrumbs from P1 to P0, render inline in `.fc-topbar`). Pick detail reads "Slate / Mike Gesicki receiving yards".
- Use a single-key keycap hint (`.fc-kbd`) on the Find input, not a "⌘K" pair, if Find is focusable with one key.

## 2. Page header anatomy and scope controls

### What Vercel does
Three header types appear:
1. **Teaching page** (CDN, Web analytics, Plan usage): H1 ~32px semibold with tight tracking, one-line description in gray-900 ending with a blue "Learn more ↗" link, controls row aligned to the H1 baseline on the right ("[cal | Last 12 hours ⌄] [View Routing Order]").
2. **Monitoring page** (Observability, Firewall, Logs, Query): no H1. The top bar already names the page. First row is controls: left = scope ("Production ⌄", "[cal | Past Day ⌄] | [search Overview ⌄]"), right = actions ("Bot Management" primary white with shield icon, "Add New", `...`).
3. **Onboarding page** (Flags, Speed insights, Storage): a single raised card "Start using Flags" / "Create a database" with inline first action (input + "Create Flag").

Control heights measure ~34px (Facet small/default 32/36). The time-range control is a compound field: icon cell with its own right border, then label, then chevron, total ~200px wide.

### Why it works
Monitoring readers return daily; they do not need a title they already clicked. Putting scope left and actions right gives a stable scan order: what am I looking at, then what can I do.

### Facet adoption
- **`.fc-page-header` (P0)** with two variants: `data-variant="teach"` (H1 `.text-heading-32`, `.text-copy-16` description, link) and `data-variant="controls"` (no title, flex row, scope group left, action group right, `...` last). Slate uses the controls variant: left "[Week 9 ⌄] [Window: Early ⌄] [Market ⌄] [Book ⌄]", right "Re-sort", `...`.
- **`.fc-range-select` (P0):** compound select with a leading icon cell (16px icon, own right border, same height). Use for week, kickoff window and later history ranges. Keep labels in sentence case ("Last 7 days"; Vercel mixes "Last 7 Days" and "Last 12 hours").
- One primary button per header at most, gray-1000 fill (already Facet's primary).

## 3. Metric cards, KPI rows and comparison

### What Vercel does
- **Stat tabs (Analytics):** "Visitors 17,994 [+1%]", "Page Views 53,982 [+1%]", "Bounce Rate 45% [−7%]" sit in a strip of equal cells (~130px wide each) joined by hairlines, directly on top of the chart. The active cell has a 2px gray-1000 bottom border and selects the chart series. Label copy-14 gray-900, value ~32px semibold tabular, delta in a small gray pill.
- **Metric rows with sparklines (CDN cards):** card title "CDN Requests" with `↗` to the full view. Rows: label gray-900 ("Error Rate (5xx)"), value gray-1000 at ~16px plus a delta pill, and a full-width sparkline to the right on the same row. Three rows per card, each row ~54px.
- **Delta pills:** filled pill, ~11 to 12px text, green bg + green text for good ("+79%", "+4.7%", "−100%" bypasses), red for bad ("+67%" TTFB, "+92%" misses), neutral gray for no change ("0%"). The comparison period is implicit (previous equal period). No arrows.
- **Usage card (overview):** "23 days remaining in cycle" + "Billing" button; inner panel "Included Credit $2.07 / $20" with a blue progress bar and "On-Demand Charges [shield] $0" right-aligned; line items "Build CPU Minutes ⓘ $1.65"; collapsed with a fade and a round chevron button to expand.
- **Legend summaries (Observability):** "Outgoing / ● 11MB", "Incoming / ● 2MB" (label above, dot + value below) in the chart card header.

### Why it works
KPIs are attached to the chart they summarize, so the reader never matches a number to a graph by eye. Polarity coloring answers "is this good" in one glance, which sign coloring cannot do for latency or error metrics.

### Facet adoption
- **Extend `.fc-stat-strip` with `data-selectable` (P1):** cells become `role="tab"`, active cell gets the 2px gray-1000 underline, and the strip sits flush on a chart card. Hidden Gems use: History page ("Bets 42 / Hit rate 55% / ROI +6.1 pts / Avg gap +4 pts") switching the chart below.
- **`.fc-metric-row` (P1):** label, value, delta, sparkline lanes on a shared grid so sparklines align across rows. Use in Data health ("Odds pulls 288", "Failed pulls 2", "Median lag 41 s").
- **`.fc-delta` polarity (P0, contradiction, see section 10):** add `data-polarity="higher-is-better | lower-is-better | neutral"` resolving to `--fc-edge-positive/negative` by goodness, and `data-variant="pill"` (filled, uses `--fc-status-success-bg` / `--fc-status-error-bg`). Edge stays as is (higher is always better for the bettor) and keeps sign + arrow + color. Non-edge pills must keep the sign so color is not the only cue.
- State the comparison basis once in the card or caption ("vs previous 12 hours"); Vercel leaves it implicit, Facet rule 9 (honest precision) requires it.

## 4. Charts

### What Vercel does
- **Gridlines:** horizontal only, gray-alpha-300ish, 3 to 5 lines. No vertical gridlines, no chart border inside the card.
- **Y-axis:** 3 to 5 ticks, abbreviated units ("2K", "1K", "0"; "1MB", "500kB", "0B"; "4%", "2%", "0%"; "2s", "1s", "0ms"), copy-12 gray-900, left of plot.
- **X-axis:** either dates ("Oct 25 ... Oct 30"), times ("9:15:00 PM", "2:15:00 PM", "8:00:00 PM"), or **relative endpoints only** ("12h ago" left, "2m ago" right). Relative labels double as freshness.
- **Lines:** ~1.5px, no markers, no smoothing in monitoring; smoothed only in tiny usage sparklines. Analytics (demo) uses a very faint area fill.
- **Bars:** observability uses stepped outlined bars (1px stroke + low-alpha fill), stacked by status class (2XX blue, 4XX amber, 5XX red).
- **Incomplete bucket:** the last segment of a live series is dotted (CDN sparklines, Query chart right edge). It tells the reader "this bucket is still filling" without a label.
- **Thresholds:** New monitor preview draws the threshold as a dashed red line across the plot. Speed insights draws dashed gray lines at 90 and 50 with **shape markers on the axis label** ("90 ●", "50 ▲").
- **Series selection:** Speed insights legend top-right is a radio set "● P75 ○ P90 ○ P95 ○ P99" (selected in blue, others hollow).
- **Chart toolbar (Query):** granularity select "[clock] 5 minutes ⌃⌄" + segmented chart type (line, bar, percent icons). Usage: segmented "Daily | Weekly | Monthly" + "Cumulative" checkbox.
- **Full-period axis (Usage):** the x-axis spans the whole billing cycle (Oct 25 to Nov 24) even though only 7 days have data, so position in the cycle is visible.
- **Tooltip:** not captured in static screens; dotted-underlined table values ("$2.40/hr") signal that a tooltip exists.
- **Map:** CDN uses a dot-matrix world map with blue circles whose size and blue intensity encode share, mirrored in a list "● Stockholm, Sweden 49.4%" where the dot's blue intensity follows the value (a sequential single-hue ramp).

### Why it works
Few ticks, relative time and dotted tails keep charts readable at a glance and honest about live data. Shape markers on thresholds keep the threshold readable without color.

### Facet adoption (all in a new `foundations/charts.md` or the dataviz pattern doc)
- **Chart spec (P1):** horizontal gridlines only (`--ds-gray-alpha-300`), 3 to 5 y ticks with abbreviated units, `.text-copy-12` gray-900 axes, 1.5px lines, no markers except hover.
- **Incomplete-bucket rule (P1):** last live bucket drawn dashed (`stroke-dasharray: 2 3`). Pairs with Facet rule 11 (freshness). Use for line movement when odds are still updating.
- **Threshold line (P0 for pick detail):** dashed 1px line with a direct label on the axis that includes a shape glyph. In Hidden Gems line movement: "Our fair price" as a dashed gray-1000 line labelled at the axis, open and now labelled directly (existing pattern doc already asks for direct labels; this gives the visual spec). Do not color the fair-price line green or red; it is a reference, not a verdict.
- **Relative time axis (P1):** endpoints-only relative labels for any chart whose right edge is "now" (odds history today, ingestion lag).
- **Series radio legend (P2):** for switching between books or percentiles; selected series in blue (blue = interaction), others hollow.
- **Sequential single-hue intensity (P2):** allowed for share-of-total dots in lists, using gray intensity by default in Facet (Vercel uses blue; Facet's chart-2 blue is acceptable only when the list is interactive). Not purple.

## 5. Tables and lists

### 5a. AI Gateway models table (the closest match to the slate)
- **Toolbar above the table:** search pill ("Search models and providers..."), "Add Filter" button with filter icon, **applied-filter chips** that read key then values ("Type  Text | Image", key in gray-900, values in gray-1000, segmented inside one pill), a "More filters  Free | Zero Data Retention | US Regional Inference" chip group, and a sort select at the far right ("[sort icon] Featured ⌄").
- **Header row:** filled band (gray-100), header text copy-14 gray-900, numeric headers right-aligned ("Input", "Output", "Latency"), the active sort column shows a small chevron in a circle ("Released ⌄").
- **Frozen first column:** "Model" column has a vertical hairline on its right and stays put while the rest scrolls horizontally.
- **Row anatomy:** provider avatar (20px circle) + name in gray-1000 + optional green badge ("Free", "50% off"). Names use **middle truncation** ("elevenlabs/elev…e-v1-max", "inclusionai/ling-3.1… ash-1019") so the distinguishing suffix survives.
- **Numeric cells:** right-aligned, tabular, unit attached ("$0.70/M", "1.5 s", "$40/M chars"). Values with extra detail get a **dotted underline** (tooltip affordance).
- **Unknown:** dash in gray-700ish.
- **Booleans:** gray check and gray x icons, no color.
- **Icon lists:** capability icons with "+1" overflow.
- **Dates:** "10/30/2026" right-aligned in the last column.
- Rows are roomy at this zoom (estimate 52 to 56px CSS); a marketing-context table, so Facet's 40px body row stays right for the slate.

### 5b. Usage table (ledger with groups)
- Columns "Product", sparkline, "Usage", "Charge". Group header rows ("Vercel Delivery Network", "Application Firewall", "Vercel Functions") are full-width bands on background 1 (darker than the gray-100 card), label in gray-900, no values.
- Quota cells: a 16px pie gauge then "17.58K / 10M"; plain usage cells: "8.02 seconds", "791 MB-months".
- Footer subtotals right-aligned as "Infrastructure Subtotal: $0.58" lines.
- Freshness footnote below the card: "Usage data can be up to 1 hour old."

### 5c. Ranked lists (Firewall)
- Card title row ("Top IPs", "Denied IPs", "Top User Agents"), then rows inset 8px inside the card with radius ~6, **zebra striped** (alternate rows background 1 vs gray-100).
- Row: country flag, value in gray-1000 (Mono only for hashes: "t13d1516h2_8daaf..."), then the **magnitude chip**: the count sits on a gray-200 fill whose width is proportional to the row's share, anchored right ("949" has a full chip, "266" only a sliver), then a 56px gray sparkline, then `...`.
- Long strings truncate with an end ellipsis ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Ap...").

### 5d. Bar list (Analytics)
- Tabs inside the card header ("Pages | Routes | Hostnames", "Referrers | UTM Parameters") with an uppercase column label on the right ("VISITORS").
- The bar is the **row background**: gray-100 fill behind the label, width = share, value right-aligned bold ("5.8K"). Bottom rows fade out to imply more rows below.

### 5e. Cards and activity lists (Projects overview)
- 3-column project card grid (cards ~340px), each: avatar, name gray-1000, domain gray-900, status ring icon, up/down chevrons; commit line with commit icon; repo + date line ("foundingadmin/akc · 2d ago", older items "Oct 29").
- "Recent Previews" list: truncated title, chips "[eye] Preview", "[github] #24", "● CrMuj2cuh" (teal status dot + Mono ID), `...` per row.
- Grid/list view toggle (segmented icons), filter icon button, search with `/` keycap, "Show More" full-width button under the grid.

### Why it works
Search, filters and sort sit on one line, so the active state of the table is visible without opening anything. Frozen first column plus middle truncation keeps identity readable while scanning wide numbers. The magnitude chip gives rank and share without spending a column on a bar.

### Facet adoption
- **`.fc-table[data-sticky-column="first"]` (P0):** frozen row-header column with right hairline. The slate has 8+ columns; on laptop widths Pick must stay visible while odds and signals scroll.
- **Header band (P1):** optional `data-header="filled"` gray-100 thead. Keep the default unfilled for the slate if it reads lighter; decide in preview.
- **Sort indicator (P0):** chevron-in-circle on the active sort header only, plus `aria-sort`. The slate caption still states sort in words (rule 4).
- **`.fc-filter-chip` (P0):** key/value chip ("Market  Receiving yards | Rushing yards", "Book  DK"), clear on hover, matches the Filter params spec. Toolbar order: search, Add filter, chips, then sort select at right.
- **Middle truncate (P0, spec exists):** apply to player + market strings and source URLs.
- **Dotted underline tooltip affordance (P0):** `.fc-has-tip` (1px dotted gray-600 underline) for numbers with a hover explanation (priced chance "vig removed", our estimate's sample size).
- **`.fc-rank-list` with magnitude chip (P1):** for "Biggest line moves", "Most-bet books", ingestion "Top failing sources". Chip fill `--ds-gray-alpha-200`, width from `--share`, value tabular. Sparkline gray. Zebra via existing `data-striped`.
- **`.fc-bar-list[data-variant="fill"]` (P2):** fill-behind-label variant. Keep Facet's separate track as default because rule 5 (shared lanes) wants a documented scale; the fill variant is fine for share-of-total lists.
- **Group and subtotal rows (P2):** extend `.fc-group-row` with a band variant and add `.fc-subtotal-row` for History ledgers ("Week 8 subtotal +$14.00").
- **Load more:** Vercel uses a full-width "Show More" button under the grid; Facet already has Load more (P1). Use it in History, not in the slate (the slate should show all picks for the scope).

## 6. Logs and observability

### What Vercel does
- **Logs layout:** filter rail (left) + main column. Rail: data source select ("[list] Runtime Logs ⌄"), "Filters" heading, collapsible groups with chevrons: Timeline (time range control), Level (checkbox, colored dot, label, count pill: "● Info 0", "● Warning 0", "● Error 0", "● Fatal 0"), Source, Environment ("Production 0", "Preview 0"), Route, Request Path, Host, Service / Daemon, Request Method, Branch, Deployment ID. Level and environment groups render as a bordered list with hairline separators; others are collapsed.
- **Toolbar:** two icon buttons (layout, settings) joined as a pair, full-width "Search logs..." input, then "[play] Live" button (a plain bordered button, no pulse), refresh icon button, download icon button.
- **Timeline strip:** a thin histogram axis under the toolbar with time ticks ("19:49:00", "19:54:20", ... "20:18:50") in small gray text; brushing presumably narrows time.
- **Table header:** "Time | Source | Message", lighter weight, gray-900.
- **Level colors:** info gray, warning amber, error red, fatal red. Every level has a word next to the dot.
- **Observability overview:** a 2-column grid of chart cards, each with title, `>` chevron to drill, legend summary, chart, relative axis. Empty cards keep axes.
- **Query builder:** label column ("Metric", "Group By", "Filter") with chip controls ("[globe] Requests Count ⌃⌄", "N Sum ⌃⌄", "+ Add", "[filter] Add filter"); a collapsible "Query Assistant" with a natural-language input ("Show me requests by host...") and `/` keycap; result card with granularity and chart-type controls; footer actions "[download]  Create Monitor  [Add to Notebook]" (last one primary).
- **Detail drawer:** the New monitor flow uses a right sheet (~720px, radius 16 on the leading corners, dimmed page behind) with a close X, a vertical stepper (done = check in a circle, current = filled number, future = gray number), each step's fields in bordered sub-cards.

### Why it works
Facet counts in the rail show the shape of the data before filtering, so the reader knows "0 errors" without running a query. "Live" as a toggle button respects the reader's scroll position. Turning any query into a monitor closes the loop from looking to watching.

### Facet adoption
- **`patterns/data-ops.md` (P1 for odds ingestion, P2 for the rest):** an ingestion log view for scheduled odds pulls: rail facets "Source (DK, FD, MGM...)", "Status (● OK, ● Stale, ● Failed)", "Market", "Week"; table columns Time (Mono, relative on hover per rule 11), Source, Status (dot + word), Rows, Lag, Message. Reuse the same freshness tokens.
- **`.fc-facet-group` (P1):** collapsible filter group with checkbox rows, optional status dot, and a right-aligned count pill (tabular, gray-alpha-200). Counts update for the current scope.
- **Live toggle (P1):** a bordered button "[play] Live" that becomes "[pause] Pause" with `aria-pressed`. No pulsing dot (Facet already rejects pulsing live indicators; Vercel agrees).
- **Sheet with stepper (P2):** extend the Sheet spec with `.fc-steps` (vertical, dashed connector, check / number / muted number) for alert creation and API connection setup.
- **Query builder (P2):** only if History grows ad-hoc analysis. The label-column layout is the reusable part.

## 7. Firewall, flags, usage: status panels, thresholds, quotas, toggles

### What Vercel does
- **Status hero (Firewall):** a tall card with a large shield-check icon, "Firewall is active" / "All systems normal", then a key/value list: "System Mitigations  Active", "Custom Rules  1 active", "Bot Protection  Inactive". Values are words in gray-1000/900, no color. (The card itself uses a blue gradient, see contradictions.)
- **Traffic chart beside it** with a legend summary of action types.
- **Tables with empty bodies:** "Persistent Actions | Action | Requests | IP Address | Started | End" header stays, body shows a centered icon tile and "No persistent actions in this time range".
- **Quota bars:** overview usage uses a blue progress bar on a gray track for "Included Credit $2.07 / $20"; usage table uses pie gauges "17.58K / 10M".
- **Threshold bands (Speed insights):** three columns under the chart: "(!) Poor  <50", "(⚠) Needs Improvement  50 - 90", "(✓) Great  >90". Each heading is icon shape + word + color + range. Routes are bucketed under the band they fall in.
- **Toggles:** Cron jobs uses a blue toggle with an adjacent word "Enabled" plus a paragraph explaining what disabling does. Flags had no flags yet, so the in-list toggle state is visible only in the illustration (toggle glyph + mono flag name + value "true" / "false" / "\"mono\"").
- **Upgrade gating:** Speed insights shows "Available in Plus [Upgrade]" in the metric list and a lock + "Upgrade to Speed Insights Plus to compare performance..." over a dimmed map. Analytics (not enabled) shows the real layout with dimmed demo data and a "Demo Data" pill on the chart.

### Why it works
The status panel answers "is it working" in words before any chart. Threshold bands make the cut points explicit and visible, so a reader learns the rule, not just the color.

### Facet adoption
- **`.fc-health` panel (P1):** Hidden Gems "Data health": headline "Odds are current" / "Last pull 2 min ago" (status dot + relative time per rule 11), then rows "Odds feed  Live", "Injury report  Updated 41 min ago", "Model run  Scheduled 6:00 PM". Gray card, no gradient, words carry the state, dot carries color.
- **`.fc-meter` quota (P1):** "used / limit" + pie gauge or thin bar; neutral gray-1000 fill under 80%, amber `--fc-status-warning` 80 to 100%, red over. Odds APIs meter requests per month, so this is needed as soon as scheduled pulls exist. Vercel's blue fill would read as "info" in Facet; use gray by default.
- **Threshold bands (P1):** a verdict-banded view of the slate is a natural fit: three columns Go / Wait / Stop with dot + word + rule ("Gap ≥ 5 pts", "2 to 5 pts", "< 2 pts"). It doubles as the place to state the verdict rule. Keep the Facet verdict dot; do not import Vercel's three different icon shapes unless a colorblind review finds dot + word insufficient.
- **Toggle with state word (P0, small change):** Facet's toggle should render the state word next to it ("Auto-refresh  On") as Vercel does with "Enabled", so the state does not depend on blue.
- **Demo data state (P2):** for first-run History ("No bets tracked yet") show the real layout dimmed with a "Sample data" pill rather than a blank page. Never on the slate (real money, no fake picks).

## 8. Empty states, loading, banners, upgrade prompts

### What Vercel does
- **Inline card empty:** small bordered icon tile (~28px, radius 6, gray-alpha-100 bg) above one line in gray-900: "No alerts in the last 3 days.", "There are no recent alerts", "No ISR activity in the selected time period".
- **Chart empty:** axes and gridlines kept; "No data in this time range" centered with a background knock-out; legend values replaced with "–".
- **Page empty (Logs):** icon tile, bold title, one sentence, "Other data sources" divider, link rows ("Request Logs / Logs grouped by request >", "CDN Requests / HTTP traffic served by Vercel >").
- **Onboarding empty (Flags, Storage, Speed insights, Cron):** raised card with H2 ("Start using Flags", "Create a database", "Get Started"), numbered step cards (circled 1, 2, 3 joined by a dashed connector), inline primary action, a template or provider list of entity rows (icon, title, description, "Create" button or `>`).
- **Alerts templates:** dashed-border cards "Blank Monitor / Choose any metric  +", "AI Gateway Cost / Triggers on cost threshold".
- **Notes:** info note inside a form "(i) Enable usage billing to investigate alerts / You have 10 included investigations remaining this billing cycle.  [Add Credit]" (gray border, action button right).
- **Promo card:** dismissible card pinned at the sidebar bottom.
- **Loading:** no skeletons captured (pages were loaded). Live chart tails are dotted rather than spinning.

### Why it works
Each empty state names its scope, so "nothing here" never reads as "broken". The Logs pattern turns a dead end into navigation.

### Facet adoption
- **`.fc-empty` additions (P0):** `.fc-empty-icon` (neutral bordered tile, see contradiction 1), required scope phrase in the message, optional `.fc-empty-links` list of entity rows under a labelled separator. Hidden Gems copy: "No picks for Week 9 in the early window" + links "Afternoon window (6 picks)", "All windows (19 picks)". Counts in the links make them worth clicking.
- **`.fc-chart-empty` (P1):** overlay message on preserved axes, legend values "–" (Facet en dash with `aria-label="Unknown"`).
- **Template cards (P2):** dashed-border entity card with trailing "+" for alert presets ("Gap above threshold", "Line moved against us", "Injury status changed").
- **Note with action (exists):** use `.fc-note[data-action]` for "Odds API key missing  [Connect]".
- **Promo card (P2, repurposed):** no upsells in Hidden Gems, but the slot works for one dismissible setup nudge ("Connect a sportsbook feed").

## 9. Color restraint (where color appears and where it does not)

| Element | Vercel color | Facet equivalent |
|---|---|---|
| Sidebar, top bar, cards, table chrome | Gray only | Same |
| Primary button | White fill (gray-1000), black text | Same |
| Secondary buttons | Transparent, gray-alpha-400 border | Same |
| Links ("Learn more", "View Documentation") | Blue + external-link icon | `--fc-text-link` |
| Plan badge "Pro" | Blue badge | Not needed |
| "Beta" badge | Pink badge | Gray badge in Facet (pink is chart-only) |
| Toggle on | Blue | Same (Facet keeps blue toggles) |
| Quota bar | Blue | Gray by default, amber/red near limit |
| Deploy status dots | Teal/green | `--fc-freshness-*` |
| Log levels | Gray / amber / red / red + word | `--fc-status-*` + word |
| Delta pills | Green/red by goodness, gray for zero | `.fc-delta` + polarity |
| Chart series | Blue 1st, red, amber, purple, teal | Gray 1st, blue 2nd, teal, pink (never verdict hues or purple unless encoding verdicts) |
| Usage row sparklines | Per-row rainbow | Gray |
| Status hero card | Blue gradient | Flat gray card |
| Price cells "Free", "50% off" | Green text/badge | Gray (green is for go, not for prices) |

Where color never appears in Vercel: headings, table headers, nav icons, metadata, timestamps, borders, focus-free chrome. That matches Facet.

## 10. Contradictions with current Facet rules

1. **Icon tiles in empty states.** Facet "Reject on sight" lists "Icon tiles". Vercel (rank 1) uses a small neutral bordered icon tile in every empty state (alerts, firewall, logs, storage). **Recommendation:** amend the rule to "Icon tiles as decoration" and allow exactly one neutral `.fc-empty-icon` per empty state (gray-alpha-100 fill, gray-alpha-400 border, 16px icon, no color). Rank 1 wins per the truth hierarchy.
2. **Delta color by sign vs by goodness.** Facet `.fc-delta` colors by direction (positive = green). Vercel colors by whether the change is good ("TTFB +67%" red). **Recommendation:** add `data-polarity`; keep edge (always higher is better) unchanged. Document in DESIGN.md under hue allocation: green = good for the reader, which already matches Facet's wording "Green: go, and good for the bettor".
3. **Legends.** Facet rejects "Legends where direct labels fit". Vercel's legend-summary headers ("● Allowed 1.8k") are legends that also carry totals. **Recommendation:** allow a legend when it carries each series' total for the range (it then replaces a KPI row); keep direct labels on single-chart line movement.
4. **Purple as a chart series** ("● Logged", Function Storage sparkline, Global Config icon). Facet: purple is gems only. **Keep Facet.** Use gray, blue, teal, pink.
5. **Per-row rainbow sparklines** (Usage). Facet: charts monochrome first. **Keep Facet:** gray sparklines; one colored sparkline only for a row in warning or error state.
6. **Gradient status card** (Firewall "Firewall is active"). Facet rejects decorative gradients. **Keep Facet.**
7. **Left-aligned numeric column** (Usage "Usage" column: "8.02 seconds", "17.58K / 10M"). Facet rule 4: right-align numbers. **Keep Facet.**
8. **Em dash for unknown** (AI Gateway table). Facet uses en dash with `aria-label="Unknown"`. **Keep Facet** (house rule).
9. **Title case** ("No Runtime Logs in the Last 30 Minutes", "Deploy & Visit your Site", "Last 7 Days"). Facet: sentence case. **Keep Facet.**
10. **Green for prices** ("Free", "50% off"). Facet: green never for money because it looks nice. **Keep Facet.**
11. **Blue quota and progress fills.** Facet treats blue as interaction/info; a usage bar is neither. **Recommendation:** gray fill by default, status hues only at thresholds (DESIGN.md already notes the reference's blue "success"; extend that deviation row to quota bars).
12. **Shape-coded rating icons** (Speed insights: ! circle, triangle, check circle). Not a contradiction, but Facet verdicts use a dot. **Recommendation:** keep the dot for density; consider shape glyphs only in large band headings if accessibility review asks for a third cue.
13. **Facet has no app-shell guidance.** DESIGN.md covers page layout but not navigation. **Recommendation:** add the app-shell pattern (section 1) so Hidden Gems does not invent its own.

## Proposed Facet additions

| Name | Type | What it does | Source screen | Priority |
|---|---|---|---|---|
| App shell (`.fc-shell`, `.fc-sidenav`, `.fc-topbar`) | Pattern + component | 232px drill-in sidebar, 48px top bar with scope switcher, page name or breadcrumb, global actions | All project screens | P0 |
| Shell tokens `--fc-shell-sidenav-width`, `--fc-shell-topbar-height` | Token | 232px, 48px | All | P0 |
| Scope switcher (week switcher) | Component | Avatar/name + up/down chevrons, opens a menu; holds the week | Top bar "akc ⌃⌄" | P0 |
| Top-bar breadcrumb | Component change (Breadcrumbs P1 to P0) | "Slate / Player market" inline in the top bar | Firewall traffic, Query, Alerts | P0 |
| `.fc-page-header` (teach, controls variants) | Component | H1 + description + link, or controls-only row with scope left, actions right, `...` last | CDN, Analytics, Observability, Firewall | P0 |
| `.fc-range-select` | Component | Compound select with icon cell for time range, week, window | CDN, Firewall, Logs, Observability | P0 |
| `.fc-delta` polarity + pill variant | Component change | Color by goodness via `data-polarity`; filled pill for KPI rows; edge unchanged | CDN cards | P0 |
| Sticky first column `.fc-table[data-sticky-column]` | Component change | Freeze row-header column with right hairline | AI Gateway table | P0 |
| Active sort indicator | Component change | Chevron-in-circle on sorted header + `aria-sort` | AI Gateway "Released" | P0 |
| `.fc-filter-chip` + table toolbar order | Component | Key/value applied-filter chips; search, Add filter, chips, sort at right | AI Gateway toolbar | P0 |
| `.fc-has-tip` dotted underline | Component | Signals a value has a hover explanation | AI Gateway prices | P0 |
| `.fc-empty-icon`, scope phrase, `.fc-empty-links` | Component change | Neutral icon tile, scoped message, redirect links with counts | Logs, Firewall, Overview alerts | P0 |
| Toggle state word | Component change | Visible "On/Off" or "Enabled" next to toggles | Cron jobs | P0 |
| Threshold line spec | Pattern (charts) | Dashed reference line with direct axis label and shape glyph | Alerts preview, Speed insights | P0 |
| Freshness footnote | Pattern | One-line caption under aggregated data ("Odds can be up to 2 min old") alongside the status dot | Usage | P0 |
| Selectable stat strip | Component change | `.fc-stat-strip[data-selectable]` cells as tabs driving a chart | Analytics | P1 |
| `.fc-metric-row` | Component | Label, value, delta, sparkline on aligned lanes | CDN cards | P1 |
| Chart card + legend summary (`.fc-chart-card`, `.fc-legend`) | Component | Title, drill chevron, legend with totals, chart, footer actions | Observability, Firewall | P1 |
| `.fc-chart-empty` | Component | Message over preserved axes; legend values "–" | Observability, Alerts preview | P1 |
| Incomplete-bucket and relative-axis rules | Pattern (charts) | Dashed last bucket; "12h ago ... 2m ago" endpoints | CDN, Query, Observability | P1 |
| `.fc-rank-list` with magnitude chip | Component | Ranked rows with share-width value chip, gray sparkline, `...` | Firewall lists | P1 |
| `.fc-health` status panel | Component | Words-first system status with key/value rows | Firewall overview | P1 |
| `.fc-meter` quota | Component | used / limit with pie gauge or bar; gray, amber, red by threshold | Overview usage, Usage table | P1 |
| Verdict bands view | Pattern | Go / Wait / Stop columns with dot, word and rule range | Speed insights bands | P1 |
| `.fc-facet-group` | Component | Collapsible filter group with checkbox, dot, label, count | Logs rail | P1 |
| Live toggle button | Component | "[play] Live" / "[pause] Pause" with `aria-pressed`, no pulse | Logs | P1 |
| Data ops pattern (ingestion logs, pulls) | Pattern | Rail + toolbar + timeline + log table for scheduled odds pulls | Logs, Cron jobs | P1 |
| `.fc-bar-list[data-variant="fill"]` | Component change | Bar as row background behind label | Analytics | P2 |
| Group band and `.fc-subtotal-row` | Component change | Ledger group headers and subtotals | Usage | P2 |
| Series radio legend | Component | Pick one series (book, percentile) from the legend | Speed insights | P2 |
| Sheet stepper `.fc-steps` | Component | Vertical stepper inside a sheet | New monitor | P2 |
| Sentence rule builder `.fc-rule` | Pattern | "Alert when [gap] [is above] [8] pts for [window]" + preview chart + estimate | New monitor | P2 |
| Template cards (dashed) | Component | Preset gallery for alerts and integrations | Alerts, Storage | P2 |
| Query builder | Pattern | Label column + chip controls + optional NL assistant | Observability query | P2 |
| Sample-data state | Pattern | Dimmed real layout with "Sample data" pill for first-run History | Analytics | P2 |
| Sidebar nudge card | Component | One dismissible setup prompt in the sidebar footer | Overview, CDN | P2 |
| Integration entity list | Pattern | Provider rows with icon, description, Create or `>` | Storage | P2 |
