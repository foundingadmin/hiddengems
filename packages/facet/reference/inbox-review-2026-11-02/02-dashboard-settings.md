# Dashboard settings review

Source: 11 full-page captures of the owner's own Vercel dashboard (rank 1 truth), captured 2026-11-01. Short names used below:

| Short name | File |
|---|---|
| general | `...-akc-settings-general-...pdf` |
| advanced | `...-akc-settings-advanced-...pdf` |
| security | `...-akc-settings-security-...pdf` |
| cron | `...-akc-settings-cron-jobs-...pdf` |
| alerts | `...-akc-settings-alerts-...pdf` |
| activity | `...-akc-settings-activity-...pdf` |
| domains | `...-akc-settings-domains-...pdf` |
| auth | `...-account-settings-authentication-...pdf` |
| billing | `...-account-settings-billing-items-...pdf` |
| tokens | `...-account-settings-tokens-...pdf` |
| help | `...-vercel-help-...pdf` |

Measurement note: every capture is 4092px wide. A Save button measures 58px tall and a toggle 72 x 43px, which match Facet's 32px small button and 40 x 24 large toggle at a 1.8x scale (a 2x display at 90% zoom). All CSS pixel values below divide by 1.8 and are accurate to about 1px. Text sizes come from cap heights (Facet sans cap height is about 0.7em).

## Top 10 takeaways

1. **Settings are one route per section, not one long page with anchors.** A fixed left nav (256px) lists 19 project sections or 9 account sections. Each item opens its own page, and the page is a centered single column (about 912px) of stacked setting cards 32px apart. No in-page table of contents, no sticky save bar. Hidden Gems should copy this exactly (P0).
2. **The setting card is Facet's `.fc-fieldset`, and the measurements match.** The values are 20px padding, a 20px semibold title, a 14px secondary description, a 36px control, and a 56px footer band with a 1px rule and a 32px small button on the right. What Facet lacks is the card's *behavior*: Save stays disabled until the card is dirty, a danger type, a control-beside-title layout, internal section rules, and defined footer-status content. (P0)
3. **One save per card, scoped to that card.** Every card saves on its own, so a change can never be lost to a save somewhere else on the page. Toggles inside a card are staged and saved with the footer button. Outside cards (toolbars), toggles persist immediately. Facet's toggle rule ("persist on change") needs this split written down. (P0)
4. **The footer status slot does four jobs.** It holds one of these: a docs link, a scope-of-impact line ("Preview deployments, settings, and data are unaffected."), an inheritance line ("Disabled globally at team level. To manage, open team settings."), or a cost line ("Available for $100 per month."). Facet should define these four and ban everything else. (P0)
5. **Destructive actions get their own card at the bottom, in rising severity.** First a neutral card (Transfer), then amber (Pause, warning button), then red (Delete: red ring, red-tinted footer, red button). The delete card shows a preview of exactly what will go, with a thumbnail, name and "Last updated 2d ago". Facet has `data-type="error"`, which is the wrong word for this. Add `danger`. (P0 for disconnect and delete-data flows)
6. **Connection rows are the template for sportsbooks and data providers.** On the auth screen each row has an icon, a name, a one-line detail, and an action that changes with state: Connect (primary) when absent, Add or Manage when present, or "Last used Oct 23" plus a dots menu when connected. This is the anatomy Hidden Gems needs for API keys and book connections. (P0)
7. **Lists are sentences, not grids.** Each activity row reads as a sentence: actor and objects in primary weight, verbs and prepositions in secondary gray. The time is right-aligned: relative under about 4 days ("4m", "2d"), then an absolute date ("Oct 27"). Rows are grouped under month headings and end with a full-width Load more. For a single-user audit log this beats a table. (P1)
8. **Secrets and IDs are mono, short and copyable, and human times are sans.** Project and rule IDs (`prj_...`, `ar_default`) sit in mono with an inline copy icon. Times and dates are sans. Facet currently says "Mono only for code, IDs, timestamps", so the rule should split: mono for machine timestamps, sans tabular for human times. (P0)
9. **Cron is shown only as a kill switch plus setup docs.** The captured cron page has no job list. It has a global "Enabled" toggle whose description states the consequence in primary text, and a numbered three-step setup guide. Borrow the kill switch and the consequence copy. The schedule row (next run, last run, status) has to be a Facet decision, because rank 1 shows none. (P0 for odds pulls)
10. **Vercel's copy breaks several Facet rules, so adopt the structure, not the strings.** Title Case everywhere, uppercase labels on tokens, a blue "success" check, an amber gradient glow on the 2FA card, an icon tile in an empty state, purple syntax highlighting, selling lines ("Easily monitor...", "Be careful!") and a plural bug ("1 passkeys registered"). Each item is listed in the contradictions section below.

## Settings layout

### What Vercel does
- **Shell.** A 56px top bar holds a centered breadcrumb ("Project Settings / Cron Jobs"), muted parent then primary current page. On the general page the top bar shows only the section name, so the page itself has no H1. Content starts 24px below the top bar rule.
- **Left nav (project).** 256px wide, fixed to the viewport (in the full-page captures the nav border stops at viewport height while content runs on). From the top: a team switcher, a Find field with an `F` keycap, a back row ("< Settings"), then a flat list of text-only items. Items are 36px tall with 14px text, secondary gray at rest. The active item gets a gray fill, a radius of about 6px and primary text. No icons, no counts, no groups.
- **Left nav (account).** Same width. A "Back" row, then top-level items with 16px icons (Overview, Domains, Activity, Invites, Support), a rule, then "Settings" with indented children (Authentication, Billing Items, Tokens and others). The user menu sits at the bottom.
- **Content width.** Setting pages use a centered column of about 912px (1647px in the capture), centered in the space right of the nav, not left-aligned against it. List-heavy pages go wider: domains runs to about 1620px with the toolbar and list on the same edges. Help uses a narrower column of about 770px.
- **Page header only on list pages.** Activity, alerts ("Monitors") and tokens open with an H1 and a one-line description, then filters. Pages made of setting cards have no H1. The breadcrumb names the section and the first card starts the content.
- **Sticky elements.** Only the nav and top bar. Card footers are not sticky, and there is no global "unsaved changes" bar.

### Why it works
Each section fits on one or two screens, so nobody needs anchors. A save in one card cannot be lost to a save elsewhere, which removes the global dirty state. The centered measure keeps descriptions readable even on a 2273px-wide window.

### How Facet should adopt it
- New layout pattern `patterns/settings.md` plus classes `.fc-settings` (grid: nav column + main), `.fc-settings-nav`, `.fc-nav-item` (36px, 14px, `aria-current="page"` gets `--fc-surface-hover` fill and primary text), `.fc-settings-main` (centered, `max-width` about 912px, 24px top padding, 32px gap between fieldsets). P0.
- Add a `--fc-measure-settings` layout token (912px) next to the existing page max of 1400. List pages use `.fc-page`. P0.
- One route per section. URL is the state (DESIGN.md rule 10), so `/settings/schedules` and not `#schedules`.
- Hidden Gems section list (sentence case): General, Data providers, Sportsbooks, Schedules, Alerts, Bankroll, Activity, Security, Danger zone. Nine items, no icons, matching the project nav.

## The setting card compared with `.fc-fieldset`

### Measured anatomy (general, advanced, security)

| Part | Vercel (CSS px) | Facet today | Gap |
|---|---|---|---|
| Card | 1px ring, radius 6, body `background-100` (dark: #0a0a0a) | Same | None |
| Padding | 20 | 20 | None |
| Title | 20px semibold (cap 14.4px) | 600 20/26 | None |
| Description | 14px secondary, runs the full card width (about 120ch) | 14/20, max 68ch | Keep Facet's 68ch, which reads better |
| Title to description | about 8 | 8 | None |
| Description to control | about 20 | 20 | None |
| Control | Input 36, select 36, toggle 40 x 24 (large) | Toggle defaults to small 28 x 14 | Settings toggles should be `data-size="large"` |
| Footer | 56 tall, rule on top, `background-200` (dark: #000), padding 12/12/12/20 | Same | None |
| Footer button | Small 32, primary (inverted) on the right | Not specified | Specify |
| Gap between cards | 32 | 24 in the demo | Use 32 (`--fc-space-32`) |

### Behaviors Vercel has and Facet does not
1. **Dirty gating.** Save renders disabled (gray fill, gray text) until a value in that card changes, then turns primary. Seen on project name, directory listing, skew protection, bulk redirects and every security card. Facet should add `.fc-fieldset[data-dirty]` guidance: the footer action is `disabled` until dirty, and Cancel or Reset appears only when dirty (domains shows Cancel + Save while a row is being edited). P0.
2. **Danger type.** The delete card has a red ring, a red-tinted footer band, a red button and an entity preview above the footer. Facet's `data-type="error"` paints the same colors but means "this card has an error". Add `data-type="danger"` for irreversible actions and keep `error` for validation failures. P0.
3. **Control beside the title.** The avatar card puts its control in the top-right corner, level with the title. The 2FA card does the same with an "Active" badge. Add `.fc-fieldset-header` (flex, title block left, control or badge right). P1.
4. **Internal sections.** Skew protection splits its body with full-width rules into toggle + note, "Maximum age" select, and "Allowed domains" list. Each sub-section has a 14px label, optional helper and a control. Add `.fc-fieldset-section` with a top rule from edge to edge and 20px padding. P1.
5. **Footer with no status.** When there is nothing useful to say, the footer holds only the button, right-aligned (support code visibility). The left slot stays empty and is never filled with filler. P0.
6. **Footer with no action.** Read-only cards (project ID, cron, recently deleted) keep the footer band for the status line only. P0.
7. **Cards titled outside.** On billing, group headings ("Personal", "Teams") sit above the cards as 20px headings, and the cards' titles carry the entity name plus plan and status badges. Use this for "Data providers" grouped by "Active" and "Available". P2.

### Footer status content (define all four, ban the rest) P0
| Kind | Vercel example | Hidden Gems example |
|---|---|---|
| Docs link | "Learn more about Project Name" (blue link + external icon) | "How odds pulls are scheduled" (only if the doc exists) |
| Scope of impact | "Preview Deployments, settings, and data are unaffected." | "Tracked bets and history are kept." |
| Inheritance | "Disabled globally at Team level. To manage, open Team settings" | "Set by your bankroll limit. To change it, open Bankroll." |
| Cost or quota | "This feature is available for $100 per month." | "Uses about 1,400 of 20,000 monthly requests." |

The docs link repeats the card title on almost every card ("Learn more about Cron Jobs" under "Cron Jobs"), which "Say it once" forbids. Facet's version should name what the doc answers, or leave the slot out.

## Forms

### Inputs and selects
- **Prefix and suffix segments.** Project name shows a gray read-only prefix (`vercel.com/...ng-creative-projects/`) joined to the input. Deployment suffix does the reverse (`my-deployment.` + muted `vercel.app`). The prefix is middle-truncated. Add `.fc-input-group` with `.fc-input-affix`. Hidden Gems uses: `$` before stake inputs, `min` after intervals, `%` after Kelly fraction. P0.
- **Icon prefix inside selects.** Maximum age shows a clock icon and "12 hours", scope shows a search icon (combobox), and the activity date filter shows a calendar segment as its own bordered cell. Facet `.fc-select` should allow a leading 16px icon slot. P1.
- **Labels sit above the control.** 14px secondary, about 8px gap, sentence-like ("Pre-Production Deployments"). Two related selects sit side by side in equal columns with a 12 to 16px gutter. The tokens form uses UPPERCASE labels ("TOKEN NAME", "SCOPE"), which is an older style that Facet should reject.
- **Helper text sits under the label, not under the control,** when it explains the format: "Enter hostnames or full origins. Wildcards are supported. Use * to allow all domains. Examples: ..." It is 14px secondary on two lines. An info icon after the label opens more detail. P1.
- **Empty list inside a form.** "No domains configured." in secondary text, then a secondary button with a plus icon ("Add Domain"). Use this for "No books connected." + "Add sportsbook". P1.
- **Radio with dependent controls** (domains edit). Each radio row owns a select. The unselected row's controls render disabled (gray fill, gray text) but stay visible, so the alternative is still readable. P1 for "Pull on a schedule" vs "Pull manually".
- **Stepper with a derived total** (advanced, bulk redirects). The rows read "Included redirects / 1K included", then "Additional redirects / $50 for every 25,000 redirects" with a `- 0 +` stepper, then a summary row "1,000 redirects / 1K included, 0 additional" beside "Cost / $0 (0 x $50 / month)". This shows the consequence of a number as you change it, which suits bankroll limits: "Max stake per pick" stepper, then "Weekly exposure $350 (7 picks x $50)". P1.

### Toggles
- Large size (40 x 24) in setting cards, with a state word to the right in 14px secondary: "Enabled" or "Disabled". On cron the toggle label is primary ("Enabled") because the toggle is the card's whole purpose.
- The card title names the setting, so the toggle label carries state, not name. That also gives the non-color cue Facet requires (blue fill plus a word). Facet's `toggle.md` says the label is a noun phrase for the ON state, so add a fieldset exception (see contradictions).
- Inherited or locked toggles render disabled at reduced contrast, and the footer explains why ("Disabled globally at Team level...").

### Choice tiles
Security "Issuer mode" uses two equal tiles, each with a title, a mono value line and a radio on the right. The selected tile has a blue ring and a deep blue tint, and the recommended one carries a blue "Recommended" badge after its title. Facet has `choicebox.md` but no CSS. Hidden Gems use: odds format, or the "Conservative / Standard / Aggressive" staking profile. Blue for selection is within the blue job (interaction). P1.

### Secret and ID fields
- **Read-only ID.** A bordered box with the value in mono and a 16px copy icon inside on the right (`prj_BjuWeFRUCi8j9j37A6aT8wHfzFFx`). Header IDs in sheets show the mono ID and copy icon with no box (`ar_default`).
- **Code with copy.** The cron setup uses a file header row (file icon, path, copy icon at far right) above a numbered code body.
- **Tokens list never shows token values.** It shows only name, created and expiry metadata, scope, type and last active. The screens do not show the create flow's one-time reveal, so that part is a Facet decision.
- **Facet adoption.** Build `.fc-snippet` (mono value + copy button, copied state swaps the icon to a check for 2s and announces "Copied" via `aria-live`) and `.fc-secret` (masked `•••• 3f9a`, last 4 visible, Reveal only on create, Copy, never re-shown after save). For provider API keys: save once, then show masked with "Added Oct 2, last used 4m ago". P0.

### Validation and errors
The captures show no field-level error state, so nothing here outranks Facet's existing `aria-invalid` ring and `.fc-helper[data-type="error"]`. The one inline warning pattern visible is the 2FA filled amber note with an icon, one sentence and a single action button ("Set Up Authenticator App"). It matches Facet's filled-note rule (one per view, one action). Keep Facet's error rules: the message goes under the field, says what went wrong and how to fix it, and the card switches to `data-type="error"` only when the save itself failed.

### Destructive zones and confirmations
- Order of the last three cards on general: Transfer (secondary button), Pause project (amber `warning` button, footer says what is unaffected and that it is reversible: "You can resume it at any time"), Delete project (danger card).
- The delete description lists everything that will be lost: "Permanently delete this project and all deployments, domains, environment variables, serverless functions, and settings."
- Delete and Remove sit on the **left** of an edit row while Cancel and Save sit on the right (domains), so the destructive verb is never next to Save.
- Recoverable deletion is surfaced as its own card ("Recently deleted deployments", restorable for 30 days).
- The confirmation modal is not in the captures. Keep Facet's existing typed confirmation (`misc.md`, destructive action modal) with Cancel focused by default.
- Hidden Gems danger zone: Disconnect sportsbook (amber, reversible), Delete tracked bet history (danger, typed confirm "delete history"), Delete account (danger). P1.

## Lists in settings

### Row anatomy observed

| Screen | Left | Middle | Right | Row height |
|---|---|---|---|---|
| Domains | Status icon (blue check), name (14px medium) over status text ("Valid Configuration") | Target: redirect arrow + "308" badge + mono host, or environment icon + mono "Production" | Secondary small buttons "Refresh", "Edit" | about 70 |
| Tokens | Checkbox, avatar with provider sub-badge, name + "Current" badge over meta "Created 1h ago • Expired November 2, 2026" | Scope icon; type two-line ("App" over "Signed in via GitHub") | Relative "1h ago" right-aligned, dots menu | 64 |
| Auth connections | 24px brand or line icon, name (14px medium) over detail | | State action (Connect, Add, Manage) or "Last used Oct 23" + dots | about 72 |
| Alerts monitors | Name + lock icon (built-in), meta "All projects · All Types" | | | about 56 |
| Activity | Avatar with source sub-badge | Sentence | Relative or absolute time | about 38 per line |

Common rules:
- **Two-line left cell.** Name in primary, metadata in secondary on the line below, joined with a middle dot. Peer metadata uses the same order on every row.
- **Status is a word, and sometimes an icon.** "Valid Configuration", "Revoked", "Expired" and "Current" are all text. Tokens put expired or revoked only in the meta line, so a revoked token reads almost the same as an active one. Facet should lead with a status dot + word for anything that can fail (connections, keys, schedules).
- **Actions.** At most two visible secondary buttons, everything else in a dots menu. The header row of a selectable list carries a bulk dots menu next to "Select all".
- **Filtering.** Tokens use a segmented control (All, Active, Expired, Revoked) above the list. Domains use a filter icon button + full-width search + two buttons ("Add Existing" secondary, "Buy" primary). Alerts use search with a `/` keycap + a scope select.
- **Pagination.** A full-width secondary "Load More" at the bottom (tokens, activity). This matches Facet's `load-more-button.md`.
- **Inline expand to edit** (domains): the row grows in place into a form with its own Remove / Cancel / Save. There is no modal for routine edits.

### Facet adoption
- `.fc-list` (bordered container with radius 6, rows divided by gray-400 rules, no nested card styling) and `.fc-list-row` with slots `-lead` (icon, avatar, checkbox), `-main` (title + meta), `-aside` (time, value), `-actions`. Two-line rows are 64px, one-line rows 48px, matching table row tokens in spirit. P0.
- `.fc-meta` for middle-dot-joined secondary metadata, with the separator as a styled pseudo element so screen readers do not read "bullet". P0.
- `.fc-avatar` sub-badge (provider icon at bottom left). P2.

## Cron jobs and scheduled odds pulls

### What the captured screen shows
1. A setting card titled "Cron Jobs" with a large blue toggle labelled "Enabled". Its description is two parts: a weak marketing line in secondary ("Easily monitor and manage your cron jobs.") and the **consequence in primary text**: "Disabling this feature will prevent all cron jobs from being executed. New cron jobs will still be created, updated, and deleted on each production deployment, but they will not run until the feature is reactivated."
2. A "Get started" card with framework tabs (underline tabs), then three numbered step cards joined by a dotted vertical connector. Each step has a number disc + a heading ("Add a cron job to your vercel.json") + a code block with a file header and copy button. The schedule appears only as raw cron (`"0 10 * * *"`) with no human translation.
3. No job list, run history, next-run time or status is visible in this capture.

### What to borrow
- **Global kill switch first.** A "Schedules" fieldset whose single toggle pauses every pull. The description names what still happens and what stops: "Paused pulls keep their settings but do not run until you resume them." Footer scope line: "Manual refresh still works." P0.
- **Consequence in primary color.** Vercel uses primary text for the sentence that changes behavior and secondary for the descriptive line. Facet can encode this as `.fc-fieldset-subtitle` (secondary) plus a `.fc-fieldset-consequence` paragraph (primary 14px). P1.
- **Numbered steps for first run.** The step disc and connector are a good empty state when no provider key exists ("1 Add a data provider key, 2 Choose books, 3 Turn on pulls"). Render the steps as rows with a disc, not as nested cards. P2.

### Facet decision needed (not in rank 1 captures) `[F]`
A schedule row for odds pulls, built from the list row above:
- Lead: status dot + word for the last run (Succeeded green, Failed red, Running blue, Paused gray). Color is never the only cue.
- Main: name ("Odds, all books"), then meta "Every 5 min on game days · 9 AM to 11 PM ET". The raw cron goes in mono as a tooltip or third line (`*/5 13-3 * * 0,1,4`).
- Aside: "Next in 3m" over "Last 2m ago · 4.1s", tabular, with the exact timestamp on hover (DESIGN.md rule 11).
- Actions: "Run now" secondary button; dots menu with Pause, Edit, View runs.
- Edit form: a frequency select (Every 1, 5, 15, 60 min), a time window (two time selects), days (checkbox group or segmented "Game days / Every day"), a timezone select defaulting to the user's zone, and a live preview line "Next 3 runs: 1:05 PM, 1:10 PM, 1:15 PM ET" (the stepper-with-derived-total pattern). Show the raw cron only in an "Advanced" disclosure.
- Quota line in the footer: "About 1,400 of 20,000 monthly requests" (cost or quota footer kind).
- Run history goes in Activity, filtered by "Schedules", not in a second log.

## Alerts and notifications

### What Vercel does (alerts)
- A list page titled "Monitors" with the description "Create monitors that determine when alerts are triggered. Each monitor controls team destinations and your personal notifications." Search (with a `/` keycap) + a scope select, then monitor rows (name, lock icon for built-in, meta "All projects · All Types").
- Selecting a row opens a **sheet** from the right (radius 12, full height). Its header holds the title + "Default" and "Built-In" badges, the mono ID + copy, then pill tabs (Overview, Configure, Notifications; the active tab is filled).
- Overview sections, each a 16px semibold heading with an optional right-aligned text action ("Edit" with a pencil, "Manage"), followed by a bordered key/value box:
  - Trigger: "Built-in Triggers / All built-in alert types".
  - Details: Projects "All Projects", Tags "None".
  - Notifications: Severity shown as badges with a signal-bar icon ("High", "Critical", bars filled by level, red), then Slack "None", Webhooks "None", Team Owners "Subscribed automatically", You "Web, Email, Push".
- **Unset values render as "None" in secondary gray. Set values are primary.** This is a clean way to show defaults without extra badges.

### Why it works
The rule (what triggers) is separate from routing (who hears it). Severity uses bar count plus word, so color is a third cue. Key/value boxes let a reader audit the whole rule at once.

### Hidden Gems adoption
- Alerts page = list of rules ("Line moved past fair price", "Feed stale over 15 min", "Gem tier rose to polished", "Weekly stake limit reached", "Pull failed twice"). Each opens a `.fc-sheet` with Overview / Configure tabs. P1.
- Channels matrix in Configure: rows are rule types, columns are In app, Email, Push. Use a checkbox grid (table semantics, header row and column). This is denser than Vercel's per-rule routing and fits one user. P1.
- Severity: bar icon + word. Low and medium gray, high amber, critical red, following the hue allocation. Never red for "hot". P1.
- `.fc-description` already covers key/value. Add a `data-layout="rows"` variant (bordered, label column about 35%, rows divided, "None" muted via `.fc-value-empty`). P1.
- Quiet hours and digest frequency belong in a fieldset on the same page, not per rule. P2.

## Activity and audit log

### What Vercel does
- H1 "Activity" + description "A log of events and changes for this project."
- Filters: actor combobox ("All users..."), date range select with a calendar segment ("All Time"), "Filter by Event" button. Filters sit on one line, with the actor on the left and time + event on the right.
- Month group headings (20px semibold: "November 2026", "October 2026").
- Rows: 32px avatar with a source sub-badge (GitHub), then a sentence in which actor, objects and targets are primary medium and verbs and prepositions are secondary regular: "**You** deployed **akc** from **foundingadmin/akc** (**139d759** in **main**) to **production**". Long sentences wrap and keep the right time column aligned to the first line.
- Time: right-aligned, secondary, compact relative ("4m", "2d", "3d") switching to absolute "Oct 27" after about 4 days. No year inside the current year.
- Grouped sub-thread: an "in akc" header row with a vertical rule on the left indents related events. The provenance suffix "(via Claude.ai)" is muted.
- No borders between rows. About 38px per line, with whitespace as the separator.
- Full-width "Load More" at the end.

### Hidden Gems adoption
- `.fc-feed` with `.fc-feed-row` (lead icon, sentence, time) and `.fc-feed-group` headings. The sentence uses `<strong>` for entities and plain text for verbs, so meaning survives without color. P1.
- Group by NFL week ("Week 9", "Week 8"), not by month: the week is how the user thinks.
- Actors are "You", "Scheduler", "Provider name" and "System". Use a 20px Lucide icon per actor type instead of avatars.
- Event types to log: setting changed (with old and new value: "You changed **max stake** from **$50** to **$75**"), key added, rotated or removed (never the key itself), book connected or disconnected, pull failed or succeeded (failed only by default, success behind a filter), bet tracked or settled, alert fired.
- Time rule: relative under 7 days, absolute date after, exact ISO timestamp in a tooltip. Use tabular sans, not mono (see contradictions).
- Filters go in the URL (rule 10). Default filter is "All events", never pre-filtered to successes (DESIGN.md rule 4, neutral defaults).
- Security events (sign-ins, 2FA changes, key reveals) also appear on Security as a short "Recent sign-ins" list linking to Activity filtered by "Security". P2.

## Account and security

- **Sign-in methods** (auth) use a bordered list inside the card: Email "Manage", Passkeys "1 passkeys registered" with a disclosure chevron + "Add", Google "Connect" (primary, because it is the only unconnected method), GitHub "Last used Oct 23" + dots menu, then a "More options" disclosure row with provider icons.
- **Two-factor card**: an "Active" status badge top-right in the header, a one-line description, a filled amber note with an inline action, then the factor list.
- **Hidden Gems Security page**: Sign-in (email, passkey), Two-factor (status badge + factor rows), Sessions (tokens-style list: device, "Current" badge, "Created May 3 • Never expires", last active, dots menu with Revoke), and a "Sign out other sessions" footer action. P1.
- The sportsbooks page and the data providers page reuse the connection row exactly (P0):
  - Not connected: "Connect" (primary if it is the next recommended step, otherwise secondary).
  - Connected: status dot + "Connected" or "Failed", meta "Last pulled 2m ago · 412 markets", dots menu (Test, Rotate key, Disconnect).
  - Failed: red dot + "Failed", plus a hollow error note under the row: "FanDuel rejected the key. Rotate it to resume pulls." with a single "Rotate key" action.

## Billing, usage and help

- **Billing items** are plan cards: entity name (20px) + plan badge ("Free", "Pro" blue) + status badge ("Active"), footer with a link and "View Billing Settings". The captures have no line items. The closest line-item pattern is bulk redirects on advanced: included, additional (unit price), total with the formula "$0 (0 x $50 / month)".
- **Hidden Gems use**: a "Usage" fieldset per paid data provider with rows Included / Used / Projected and a formula line ("Projected 18,600 of 20,000 at the current pull rate"), plus a `.fc-progress` bar. Projected must be marked as projected (DESIGN.md rule 9). P1.
- **Help page**: a status pill at the top ("All systems normal." with a dot and text), a two-tone title (primary "Vercel Support" over secondary "How can we help you today?"), two link cards with an arrow-out icon and one-line descriptions, then an agent composer with a context chip. Hidden Gems use: a feed health pill in the app header or on Settings > General ("All feeds fresh", green dot + words, or "2 feeds stale", amber). Link it to Activity filtered by "Pulls". P2.

## Copy patterns

### Descriptions
- One sentence that says what the setting does, starting with a verb or "Used to": "Used to identify your Project on the Dashboard, Vercel CLI, and in the URL of your Deployments." "Temporarily stop serving your Production Deployment so the project stops using metered resources."
- When an action is reversible, the second sentence says so: "You can resume it at any time." "Most deployments can be restored within 30 days of their initial deletion."
- Destructive descriptions list what goes: "...and all deployments, domains, environment variables, serverless functions, and settings."
- The consequence sentence that changes behavior is in primary text (cron).
- Weak ones Facet should not copy: "This is your project's avatar." (restates the title), "Easily monitor and manage your cron jobs." (selling), "These tokens allow other apps to control your whole account. Be careful!" (exclamation, a hedge in the house-style sense). Rewrite as "Tokens give other apps full control of your account."

### Buttons
| Vercel | Pattern | Facet rewrite |
|---|---|---|
| Save, Transfer, Create, Connect, Add, Manage, Edit, Refresh, Remove, Cancel | Bare verb when the card or row already names the object | Keep: "Save", "Connect", "Manage" |
| Pause Project, Delete Project, Enable and Pay, Set Up Authenticator App | Verb + noun for destructive, paid or multi-step actions | "Pause pulls", "Delete history", "Set up authenticator app" |
| Add Domain, Add Existing, Buy, View Billing Settings, Load More, Filter by Event | Verb + noun in toolbars where no title names the object | "Add sportsbook", "Load more", "Filter events" |

Rule for Facet: a bare verb when the enclosing card or row names the object (this satisfies "Say it once"). Verb + noun when the action is destructive, costs money, or sits in a toolbar. Always sentence case. This replaces `fieldset.md`'s "Verb + Noun (`Save Changes`)".

### Helper text and status words
- Helper text runs one or two short lines and gives format plus examples, never a restatement of the label.
- Status words are past participles or adjectives: "Enabled", "Disabled", "Active", "Revoked", "Expired", "Valid Configuration", "Current". Facet should keep the list short and fixed per object (Connected, Failed, Paused, Expired).
- Empty values: "None" in secondary, inside key/value rows. In lists: "No domains configured." plus an add button. The empty state copy "No recently deleted deployments were found." repeats the heading. The Facet pattern (content.md) says what fills it instead: "Deleted bets appear here for 30 days."
- Count grammar: "1 passkeys registered" is a bug. Facet should require `Intl.PluralRules` or explicit singular and plural strings in every count label.

## Contradictions with current Facet rules

| # | Vercel dashboard does | Facet rule it meets | Recommendation |
|---|---|---|---|
| 1 | Title Case for card titles, nav items, buttons, badges ("Project Name", "Delete Project", "Built-In") | content.md: sentence case for headings, labels and buttons | Keep sentence case. Also fix Facet's own docs that copied Title Case: `fieldset.md` ("Save Changes"), `toggle.md` (labelCasing `title`, "Password Protection"), `modal.md` and `button.md` examples ("Delete Saved Filter"), `note.md` (NoteLabel "1 to 2 word Title Case") |
| 2 | UPPERCASE form labels on tokens | Type uses `.text-*` roles; sentence case | Reject. Use `.fc-label` |
| 3 | Success is blue (domain "Valid Configuration" check, help "All systems normal" pill) | DESIGN.md deviation: success is green | Keep green. Connection valid = green dot + word |
| 4 | Amber radial glow behind the 2FA card | Reject on sight: decorative gradients, glows | Reject. Status lives in the badge and note |
| 5 | Icon in a bordered tile above the empty-state line (recently deleted) | Reject on sight: icon tiles | Use `.fc-empty` text only, or a bare 16px icon |
| 6 | Cards inside cards (cron step cards inside the get-started card, key/value boxes inside the sheet, sign-in list inside the auth card) | Rule 8: no cards inside cards | Allow exactly one inset `.fc-list` or key/value box inside a fieldset or sheet, documented as a list container, not a card. Reject nested step cards; use divided rows |
| 7 | Purple and pink syntax highlighting in code blocks | Hue allocation: purple is for gems only; pink is chart-only | Facet code blocks are monochrome (weight and gray-900 vs gray-1000), or add a reviewed `facet-allow-color` exception scoped to `.fc-code`. Prefer monochrome |
| 8 | Relative times and dates in sans; mono reserved for IDs, paths and hosts | DESIGN.md type row: "Mono only for code, IDs, timestamps" | Split the rule: mono for machine timestamps (ISO, unix) and IDs; tabular sans for human times ("2m ago", "Oct 27") |
| 9 | Toggles inside cards are saved with the footer Save | toggle.md: "Persist on change... Only add a Save footer if the setting really needs an explicit save" | One save model per card: inside a fieldset with a footer action, toggles are staged; standalone toggles persist with a toast. Never mix within one card |
| 10 | Toggle label shows state ("Enabled"/"Disabled") because the title names the setting | toggle.md: label is a noun phrase describing ON | Add a fieldset exception: the title names it, the label carries state, and `aria-labelledby` points at the title |
| 11 | Settings toggles are large (40 x 24) | toggle.md default size is small (28 x 14) | Settings cards use `data-size="large"`; toolbars keep small |
| 12 | "Learn more about {card title}" on most footers | content.md "Say it once" | Link text names the question the doc answers, or the slot is left empty |
| 13 | Raw unix epochs (`1793590627`) in the OIDC claims table | Rule 9: honest precision and readable units | Show a human date with the raw value on hover or in the audit path |
| 14 | Fieldset gap 32 in the dashboard | `fieldset.md` notes a 24px demo gap | Use 32 between setting cards (rank 1 wins over the docs demo) |
| 15 | Alert severity bars are red for both High and Critical | Hue allocation: red = errors and stop; amber = caution | Bars + word, with amber for high and red for critical |
| 16 | "Be careful!", "Easily...", "1 passkeys registered" | content.md: no hedges, earn every line | Rewrite (see copy patterns) |

## Proposed Facet additions

| Name | Type | What it does | Source screen | Priority |
|---|---|---|---|---|
| `patterns/settings.md` | Pattern doc | One route per section, fixed nav, centered 912px column, page H1 only on list pages, save model, footer kinds, button verb rule | general, tokens, activity | P0 |
| `.fc-settings`, `.fc-settings-nav`, `.fc-nav-item` | Component (CSS) | 256px fixed nav + centered main; 36px items, filled active state, `aria-current` | general, tokens | P0 |
| `--fc-measure-settings` (912px) | Token | Max width of settings content | general | P0 |
| `.fc-fieldset[data-type="danger"]` | Change to `.fc-fieldset` | Red ring, tinted footer, red action, entity preview slot; keeps `error` for validation failure | general (delete project) | P0 |
| Fieldset dirty-state rule | Change to `fieldset.md` | Footer action disabled until dirty; Cancel appears only when dirty | general, advanced, security, domains | P0 |
| Fieldset footer status kinds | Change to `fieldset.md` | Defines docs link, scope of impact, inheritance, cost or quota; nothing else | general, advanced | P0 |
| `.fc-fieldset-header` | Change to `.fc-fieldset` | Title block left, badge or control right | general (avatar), auth (2FA "Active") | P1 |
| `.fc-fieldset-section` | Change to `.fc-fieldset` | Full-width rule + 20px padded sub-section with its own label and helper | advanced (skew protection) | P1 |
| `.fc-fieldset-consequence` | Change to `.fc-fieldset` | Primary-color sentence stating what changes when the control flips | cron | P1 |
| `.fc-input-group`, `.fc-input-affix` | Component | Joined prefix or suffix segment (`$`, `min`, URL path) | general (project name, suffix) | P0 |
| Select leading icon | Change to `.fc-select` | 16px icon slot before the value | advanced (max age), activity (date) | P1 |
| `.fc-snippet` | Component | Mono value + inline copy button, copied state with `aria-live` | general (project ID), alerts (`ar_default`), cron | P0 |
| `.fc-secret` | Component | Masked key showing last 4, reveal only at creation, copy, never re-shown | tokens (values never listed); Facet decision for reveal | P0 |
| `.fc-list`, `.fc-list-row` | Component | Bordered divided list with lead, main (title + meta), aside, actions slots; 64px two-line, 48px one-line | domains, tokens, auth, alerts | P0 |
| `.fc-meta` | Component | Middle-dot-joined secondary metadata with a non-spoken separator | tokens, auth, alerts | P0 |
| Connection row | Pattern (in settings.md) | State-driven action: Connect, Manage, or last used + menu; failed state with error note | auth | P0 |
| Schedule row and editor | Pattern `[F]` | Status dot + word, human schedule, mono cron secondary, next and last run, Run now, live "next 3 runs" preview | cron (kill switch only); Facet decision | P0 |
| Global pause fieldset | Pattern | Kill switch with consequence copy and scope footer | cron | P0 |
| `.fc-stepper` | Component | `- n +` number control with a derived total line beside it | advanced (bulk redirects) | P1 |
| `.fc-choicebox` CSS | Component (spec exists) | Tile radio with title, mono or detail line, badge; blue selected ring | security (issuer mode) | P1 |
| `.fc-description[data-layout="rows"]` + `.fc-value-empty` | Change to `.fc-description` | Bordered key/value rows; unset values read "None" in secondary | alerts (sheet) | P1 |
| `.fc-sheet` with header ID, badges, tabs | Component (spec exists) | Right-hand detail panel for a rule or item | alerts | P1 |
| `.fc-feed`, `.fc-feed-row`, `.fc-feed-group` | Component | Sentence rows (strong entities, plain verbs), lead icon, right time, group headings, nested thread rule | activity | P1 |
| Time display rule | Change to DESIGN.md / typography | Relative under 7 days, absolute after, exact on hover; sans tabular for human time, mono for machine time | activity, tokens | P0 |
| Severity indicator | Component | Bar icon (1 to 4) + word; gray, amber, red by level | alerts | P1 |
| Usage fieldset | Pattern | Included, used, projected with formula line and progress bar; projected labeled | advanced (bulk redirects), billing | P1 |
| Feed health pill | Component | Status dot + short sentence summarizing data freshness, links to activity | help ("All systems normal") | P2 |
| Numbered setup steps | Pattern | Disc + heading rows for first-run setup, no nested cards | cron (get started) | P2 |
| Monochrome `.fc-code` | Component | Code block with file header and copy, grayscale highlighting | cron | P2 |
| Content fixes in existing docs | Doc change | Sentence-case every example in fieldset, toggle, modal, button and note docs; plural rule for counts | (Facet docs) | P0 |
