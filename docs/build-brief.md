# Build brief · Hidden Gems screens v1

Approved wireframes, Mon Nov 2 2026. Build these screens in the Vercel app (`apps/web`). This brief says what to build and where the wireframes and the PRD overrule the Phase 2 scaffold (PR #3).

**Sources, in order**
1. `docs/prd.md`, the product spec. It wins on product decisions: what a gem is, the rating, data sources, safety rules.
2. `docs/wireframes/`, 16 boards (8 desktop, 8 phone): the source markup, plus a PNG of each in `docs/wireframes/png/`.
3. Facet (`packages/facet`) wins on how things look, per `AGENTS.md`.

The boards are wireframes built from real Facet classes, so the markup can be lifted almost directly. Every number in them is example data.

## Read first · where the PRD overrules PR #3

1. **One gem rating, no tiers and no verdict words on gems.** A prop is a gem only if it beats the posted price. Otherwise it is Fool's Gold: a hollow gem with a dashed label, never purple.
   - `rating = round(100 * clamp(edge_pts / 10, 0, 1) * clarity / 100)`
   - Default sort, called "Recommended": `hit_chance * clarity`, highest first, with Fool's Gold last.
   - A prop with no 2026 stats gets no rating.
   - PR #4 already updates the docs. `packages/core` (tiers, verdicts) and `.fc-gem` in `components.css` still need the code change.
2. **Free data only, anytime TD only, this season.**
   - Stats come from nflverse (PRD section 10), not SportsDataIO.
   - Prices come from The Odds API free plan: 500 credits a month, about 1 credit per game per event odds call.
   - A pull every 5 minutes would burn the month in hours. Use the snapshot cadence in the PRD instead: open, Sat 7:47 PM, Sun 8:43 AM, then freeze at kickoff. That's about 30 credits a week.
   - Vercel Cron runs those pulls. The code may run often and let each job decide, as long as no Odds API call happens outside those times.
3. **Hosting is Vercel (decided Nov 2 2026, PRD section 12, Option B).**
   - The app is `apps/web` on Vercel, with the PR #3 stack: Postgres, the ingest jobs and Vercel Cron.
   - Vercel: the Founding Creative Projects team (Pro) hosts it as R&D. Keep its usage tiny so it never eats into the agency's shared monthly credit: no paid add-ons (the app's own `APP_PASSWORD` gate, not Vercel Password Protection), and odds pulls only on the snapshot schedule.
   - Database: Josh's personal free Supabase project (us-east-1), never the agency's Supabase org, reached through the transaction pooler on port 6543, so the Drizzle client sets `prepare: false`.
   - Drop `apps/artifact`.
   - Keys are Vercel env Secrets, never in the repo: `ODDS_API_KEY`, `ANTHROPIC_API_KEY` for the Jeweler, `CRON_SECRET`, `APP_PASSWORD`.
   - The old pipeline (the Hidden Gem Scorecard dashboard store and its scheduled tasks) retired Nov 3 2026; see `docs/archive/pipeline/`.
   - Its script is `ops/pipeline/hgs.py`, the source of the v3.0 model in `packages/core`.
4. **Navigation.**
   - The rail is Gems, Slips, then "Ask the Jeweler" pinned at the bottom.
   - There is no Tray, Watchlist or Alerts in the primary nav. The scaffold's data health pages can stay as a quiet drill-in.
   - The week lives only in the top bar's week switcher.
5. **Safety (PRD section 13).**
   - AI never handles money. The DraftKings link only adds picks.
   - The lose it all chance is always on the slip.
   - Nothing rewards betting volume.

## Screens

Each screen has a desktop board and a phone board.

### Gems · `DesktopMain`, `Main`
- **Top bar.** Week switcher, breadcrumb, search. The rail foot shows freshness: "Odds pulled 2m ago" with a status dot and the exact time on hover.
- **New gems row.**
  - Shows gems that crossed a rating of 90, or jumped 15 or more, since the last visit.
  - Cards scroll sideways with snap, plus back and forward buttons on desktop.
  - Each card shows the rating mark, player, price, edge and "Why it's a gem" (3 reasons from the gem's notes).
  - Each card has Mark read. The row has Mark all read.
  - A card leaves the row when it's read or when its game kicks off.
  - The Gems nav item shows the unread count.
- **All gems.**
  - A filter bar on top of the table: search, Add filter, chips, and sort.
  - The table columns:
    1. Rating
    2. Pick (player tile and #number, position and matchup)
    3. Kickoff (monospace)
    4. Price
    5. Priced
    6. Our est.
    7. Edge (sign, arrow and color)
    8. Clarity
    9. Mined by
    10. Add / On slip
  - Derived column headers carry tips (dotted underline).
  - A New badge sits beside the name until the gem is read.
  - Fool's Gold rows have no add button.
  - The caption is visually hidden and states the sort.

### Gem sheet · `DesktopGem`, `Gem`
- **Desktop.** A right side Facet sheet over Gems. Phone is a full screen.
- **Pinned.** The header (player, rating, price, edge) and the tabs stay pinned. The body is one scroll, and each tab jumps to its section.
  - **Overview:** priced vs our estimate vs edge, how the rating is built, best price, mined by, and the price chart since the gem was found, with a fair price line and a freshness line.
  - **Notes:** "What the numbers miss" explainer, then notes. Each note shows its source and how much it adds to or takes off clarity.
  - **The loupe:** splits by condition, plus a game log where a filled cell means scored, a hollow cell means no TD, and the bye is dashed.
  - **Context:** core sample, environmental factors, and sources with pull times.
- **Footer.** Ask the Jeweler, Add to slip / On slip.

### The Jeweler · `DesktopJeweler`, `Jeweler`
- **Desktop.** A right sheet. On phone it's a tab.
- **Context.** Chips show what the Jeweler is looking at (a gem, the slip).
- **Suggestions and composer.** Suggested questions sit above the composer.
- **Answers.** Answers cite the app's numbers. The Jeweler explains, it never places anything.

### Slips · this week · `DesktopSlip`, `Slip`
- **Tabs.** This week, History.
- **The appraisal certificate.**
  - Labeled "Suggested play", with the legs (rating and price for each).
  - Stake, pays and all hit.
  - The lose it all chance, large.
- **Beside it.** The Jeweler's appraisal backs the suggested play, plus one primary button: Send to DraftKings.
- **"Change this slip".** A quiet text link, deliberately not a button.
- **Desktop rail.** On every other screen, the slip in progress lives in the rail above Ask the Jeweler.

### Change the suggested play · `DesktopSlipChange`, `SlipChange`
- **A confirmation dialog.** It explains what changing breaks:
  - The appraisal no longer covers the slip.
  - History tracks it as your own play.
- **Buttons.** "Keep suggested play" is primary and focused. "Change slip" is secondary.

### Send to DraftKings · `DesktopHandoff`, `Handoff`
Three steps:
1. Open DraftKings (↗, the slip link adds the picks).
2. Set the parlay and stake in DraftKings.
3. Mark it placed, as suggested or as something else. This feeds History.

The note "Hidden Gems never places bets or touches your money" stays on this screen.

### Slips · history · `DesktopSlipHistory`, `SlipHistory`
- **Season stats.** Beat the close, profit, suggested plays vs your own plays, wrong reads.
- **Past slips table.** Week, slip, play (Suggested or Your own), bet, result, beat close, profit.
- **What's working.** Legs that scored, grouped by the kind of note behind them. This is the provenance report, with a small-sample caveat.

### Graded slip · `DesktopResult`, `Result`
- **Result.** Earned / Missed, profit, beat the close, play type.
- **Legs table.** Took, closed, beat close, scored / no TD, and what the notes said.
- **The note** that a win at a worse price is luck.

## Facet gaps to promote

`docs/wireframes/hg-wire.css` holds the few things Facet lacks, built only from Facet tokens. Promote each one into `packages/facet` as a component (tokens in `tokens/*.json`, never in generated files). Then delete the wireframe layer.

1. **Gem rating mark** (`.hg-gem`). Replaces the tier facets in `.fc-gem`:
   - one gem, with the number always beside it
   - purple mixed in proportion to the rating, with glow only above 60
   - a subtle glint loop with a cascade delay, stopped under reduced motion
   - a Fool's Gold variant with a dashed hollow gem and the `.hg-fools` label
2. **New gem card and row** (`.hg-newcard`, `.hg-strip`, `.hg-why`).
3. **Slip panel in the rail** (`.hg-railslip`) and the **appraisal certificate** (`.hg-cert`, `.hg-leg`, `.hg-loseit`).
4. **Chat** (`.hg-msg`, `.hg-composer`, `.hg-suggest`).
5. **Numbered steps** (`.hg-steps`).
6. **Game log** (`.hg-log`). This is the Last 10 diamond row from PRD F0.3.
7. **Phone tab bar** (`.hg-tabbar`) and the **phone gem row** (`.hg-gemrow`).
8. **Signed money** (`.hg-money`): profit in edge green or red, always with its sign.

Drop the dark theme remap block at the top of `hg-wire.css` in the app. It exists only because canvas boards can't set `data-theme` on `<html>`. The app should set it there.

## Not in this build

- Live alerts and exposed model sliders.
- A Settings screen and the data health pages. Keep the scaffold's versions out of the primary nav.
- Markets other than anytime TD.
- Phase 2 direct DraftKings send. The wireframes show the Phase 1 handoff.

## Done when

- Every board has a working screen at desktop and phone widths that matches its PNG in structure and copy. Real data replaces the example numbers.
- `node packages/facet/scripts/lint-color.mjs apps` passes, with no raw hex or px in app code.
- Gem ratings, Fool's Gold and the Recommended sort come from the formulas above, with unit tests in `packages/core`.
- No Odds API calls happen outside the snapshot cadence.
- The UI is reviewed against `packages/facet/guidelines/web-interface-guidelines.md`, with rule IDs cited in the PR.
