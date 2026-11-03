# Roadmap

From today to the end of the 2026 regular season, measured against `docs/prd.md` (v1.1) and `docs/build-brief.md`.
Assessed Tue Nov 3 2026 on `staging`. Finished work moves to "Shipped" with its PR.

## Waiting for the principal

Calls the assessment surfaced, each with a recommendation. Parked comments follow: what was asked, why it waits, the
thread.

1. **When results land.** nflverse publishes stats the next day, so "a box within an hour of final" (F1.2) and
   "morning results before afternoon kickoffs" (Sunday flow, step 11) are out of reach. Recommend: accept next morning
   grading for Week 9, then decide on a free live box score source for the Sunday flow (a new provider).
2. **What Outlier still does.** Prices and DraftKings slip links now come from The Odds API, so the Outlier cart
   handoff (F3.4), the Mined by column and mined count logging have no source in the app. Recommend: drop F3.4 and
   ship the direct link (F3.6) in Phase 3, and decide whether mined counts alone justify the subscription. Mined by is
   on the roadmap (M4) until a source exists.
3. **The shadow run.** F2.8 compares an in-app Outlier feed that does not exist. Recommend: compare The Odds API with
   Outlier by hand on Weeks 9 and 10, then cancel Outlier on Tue Nov 17.
4. **Last 10 on the row.** The PRD puts the diamond row on every board row (F0.1); the approved wireframes keep it in
   the gem sheet. Recommend the wireframes, and amend F0.1.
5. **Anthropic API key and monthly cap.** Not set as of Nov 3. The Jeweler (F3.3) is built and shows a not set up
   state until both exist; news notes (F2.3) wait too. To turn it on: add `ANTHROPIC_API_KEY` in Vercel, set the
   monthly cap with the SQL in `docs/architecture.md`, and confirm the Sonnet 5.5 prices in `JEWELER.price`
   (`packages/ingest/src/jeweler.ts`), which the cap counts against.
6. **Usual stake range.** F3.1 reminds you when a stake is outside your usual range, but no range is set, so that
   reminder is off. Recommend: give a low and high stake (for example $5 to $25) and it turns on. The other two
   reminders are live: legs under 2.50 odds, and lines that need two or more touchdowns (read as the 2+ TD rule).
7. **A won slip that lost to the close.** The graded slip follows the brief: a win reads Earned, with the note that
   a win at a worse price is luck. That note contradicts the label. Recommend: a slip that won but lost to the close
   reads Lucky, matching the gem boxes (F1.2).
8. **Dates inside a sentence.** Facet sets every `<time>` in mono (decision Nov 2), so a date inside copy, such as on
   the graded slip, reads in mono too. Recommend: keep mono for dates in tables and metadata, sans inside sentences.
9. **Restore the stricter database rules.** Rapid build mode (Nov 3) lets migrations apply themselves and agents
   run SQL on both databases. Recommend: at the beta, sign the Supabase connector out of the production project, and
   apply production migrations by hand from the release PR again.
10. **Notes that cost clarity (F2.3).** Each costly note lowers clarity a notch, which moves ratings. Recommend:
    build the notes first as context only, then decide on the clarity effect after the Dec 1 formula lock.
11. **Backtest baseline.** The weekly backtest scores 0.1313 on full Weeks 4 to 8 data; the 0.1360 baseline was set
    before most Week 8 snap counts landed, so a regression under 0.0047 would not warn. Recommend: move the
    baseline to 0.1313 and record it in the PRD (section 4, goal 2).
12. **Clear slip.** The micro moments package animates erasing a whole slip with a 5 second Undo, but neither the app
    nor the wireframes have a Clear slip control. Recommend: no Clear slip for now, since a slip holds a few legs and
    Remove with Undo covers it. The Erase moment waits until you want one (sprint 2026-11-03-3, e4).
13. **PRD v1.2.** Once 1 to 12 are settled, update the PRD so it matches the app: every gem graded (decided Nov 3),
    Outlier as price source, F2.8, F3.4, the old pipeline's freeze and close commands.

## Where it stands

| Area | PRD | State | Missing |
|---|---|---|---|
| Data pipeline | sections 10, 12 | Built: six jobs on Vercel Cron, snapshot schedule, credit guard, run log, Data health | First live week in production |
| Database safety | | Built: app login, append-only history, `db:guard`, nightly backups, staging database | |
| Model v3.0 with implied points | section 11 | Built and matched to `hgs.py` on Week 8; weekly walk-forward backtest (0.1313 on Weeks 4 to 8) | Baseline call 11 |
| Gem rating, Fool's Gold, Recommended | F0.2, section 8 | Built in `packages/core` with tests | |
| Gems board | F0.1 | Built: table, phone list, filters, sort, Add or On slip, rows open the gem sheet (sprint 2026-11-03) | Mined by (call 2) |
| New gems | F3.5 | Built early: row, Mark read, nav count | The optional Saturday push |
| Rating lab | section 8 | Built in Settings on Week 9 opening props | Graded weeks |
| Last 10 diamond row | F0.3 | Built: Facet game log in the gem sheet, season rate beside it | On the row, if call 4 says so |
| Posted vs fair helper | F0.4 | Built: gem sheet Overview, Why two prices, Clears the cut | Price chart since found (F2.7) |
| CLV | F1.1 | Built: CLV for every gem and placed bet, results line on History | Owner SQL before Thu Nov 5 |
| Closed appraisal result | F1.2 | Built: the four boxes for every gem, graded slip | Within an hour of final (call 1) |
| Provenance | F1.3 | Built: a frozen record per gem at kickoff with its new flag and estimate | Notes and splits, once they exist |
| Phase 2, the read | F2.1 to F2.8 | Built: live price line, core sample, trend lines, implied points, matchup and weather in the gem sheet; weekly backtest on Data health (sprint 2026-11-03-2) | Splits and the loupe (F2.2), notes (F2.3, call 10), consensus (F2.6) |
| Phase 3, the slip | F3.1 to F3.7 | Built: slips and states, lose it all, DraftKings slip link, handoff, change dialog, history, graded slip, the Jeweler | The Jeweler's key (call 5), provenance report data (F3.7), stake range (call 6) |
| Facet parts from the brief | build brief | Promoted: every part the brief lists | |
| Micro moments | `docs/animation/micro-moments` | Built in sprint 2026-11-03-3: 9 of 11 moments on Facet's dots engine | Erase (call 12), New connection (no screen) |

## Season calendar

| Week | Sunday | Ships before it | Checkpoint |
|---|---|---|---|
| 9 | Nov 8 | M0, M1 | First measured Sunday; first week on the app alone |
| 10 | Nov 15 | M2 begins | Rating review Tue Nov 10 on Week 9 grades |
| 11 | Nov 22 | M2 | Outlier decision Tue Nov 17 |
| 12 | Nov 29 | M3 | Thanksgiving slate Thu Nov 26; consensus gate on three Sundays of multi book prices |
| 13 | Dec 6 | | Rating formula locked Tue Dec 1 on Weeks 9 to 12 (about 500 props); north star test: average CLV above zero over 30 or more graded gems |
| 14 | Dec 13 | | First provenance read |
| 15 to 17 | Dec 20 to Jan 3 | M4 | Saturday and holiday slates |
| 18 | Jan 10 | | Last Sunday; season review |

## Production ready for Week 9 (M0)

Ship by Thu Nov 5, before the first Week 9 kickoff. The old pipeline retired Nov 3, so the app is the only thing
freezing prices this week.

- [ ] Principal: run `pnpm db:supabase-sql --app-password <password>` output in the production Supabase project, then
      set `DATABASE_URL` (Production) to the `hiddengems_app` login (`docs/architecture.md`, Database).
- [x] Migrations 0005 to 0007 applied to production on Nov 3 through the Supabase connector (rapid build mode).
- [x] Previews read production through the read-only `hiddengems_preview` login, or a sample fixture without it.
- [ ] Principal: set the `hiddengems_preview` password and put it in Vercel's Preview `DATABASE_URL`
      (`docs/architecture.md`, "Previews").
- [x] 13 sample players a preview had written into production deleted on Nov 3, with their sample links.
- [x] A scheduled Claude task checks each odds snapshot about 25 to 50 minutes after it (Sun 9:32, Tue 10:32, Sat
      20:32 Denver) and runs a missed one from production Data health. Adding the Supabase connector to it in
      claude.ai turns on its freeze gap check.
- [ ] Principal: `ODDS_API_KEY`, `CRON_SECRET`, `BACKUP_GITHUB_TOKEN` and `BACKUP_GITHUB_REPO` set for Production only.
- [ ] Data health shows today's Tue 10:07 AM opening snapshot. If it was missed, the next slot is Sat 7:47 PM; an off
      schedule pull spends credits and is the principal's call.
- [ ] `pull-results` and `pull-usage` have backfilled the season, and the Week 9 board shows ratings, not only
      unrated rows.
- [ ] The first nightly backup landed in the private repository.

## The measured Sunday (M1)

Phases 0 and 1. Ship by Sat Nov 7 before the 7:47 PM snapshot. About 4 review hours.

| Item | Lane, size | Done when | Needs |
|---|---|---|---|
| Gem record at kickoff (F1.1, F1.3) | data, L | Each game's freeze writes one append-only row per gem: kind, rating, hit chance, clarity, priced and fair at the decision price and at freeze, the new flag, the estimate it came from | |
| Grade and box (F1.1, F1.2) | data, M | `packages/core` computes CLV (`taken / close_fair - 1`) and the box (Earned, Unlucky, Lucky, Wrong read) with tests; `pull-results` fills them for every gem and placed bet | Gem record |
| Gem sheet, Overview (F0.4) | screens, M | A board row opens the Facet sheet: priced vs our estimate vs edge, how the rating is built, Why two prices in one line with that gem's numbers, Clears the cut only above zero | |
| Last 10 diamond row (F0.3) | facet then screens, M | Facet game log promoted from `.hg-log`; the sheet shows ten games filled or hollow, bye dashed, season rate beside it | Call 4 |
| Mark placed | screens, S | The sheet footer records a bet at a price and stake into `bets`; nothing links to the sportsbook | |
| Results line | screens, S | Slips, History shows gems graded, average CLV and the four box counts | Grade and box |

## The read (M2)

Phase 2. Ship by Sat Nov 21. About 7.5 review hours. Start with what the data already holds.

| Item | Lane, size | Done when | Needs |
|---|---|---|---|
| Appraisal over time, live line (F2.7) | screens, S | The sheet charts the market's price from open to the kickoff marker, fair line and freshness line, CLV after | M1 gem record |
| Core sample (F2.4) | data and screens, M | Red zone carries and targets, snap share, season and last 3 weeks, from `player_usage` | |
| Environmental factors (F2.5) | data and screens, M | Implied team points marked as moving the rating; matchup as a gray context line with a 1 to 32 track; weather when relevant | A forecast source for weather (free, no key) |
| Trend lines (F2.1) | data and screens, M | Three plain lines ranked by `abs(rate - 0.5) * sqrt(n)`; never under 3 games; season rate before last 10 | |
| Splits, first set (F2.2) | data, L | Shrunk split rates from nflverse: starting QB, teammate out, home or away, rest, implied points, favored or underdog | New nflverse pulls: depth charts, play by play by QB |
| The loupe (F2.2) | facet and screens, L | Conditions toggle, clarity and the diamond row redraw in under a second; thin samples render cloudy | Splits |
| Notes that add or cost (F2.3) | data and screens, M | Injury, blowout risk from the spread and model parts as sourced notes; each costly note lowers clarity a notch | |
| News notes (F2.3) | data, M | A job asks the Anthropic API for each gem's news, with sources, on the snapshot schedule | Call 5 |
| Backtest on refresh (goal 2) | data, M | A weekly job scores the Brier walk forward and shows it on Data health against 0.1360 | |

The consensus appraisal (F2.6) needs three Sundays of multi book history. Run its backtest gate Tue Nov 24; switching
the baseline is the principal's call.

## The slip (M3)

Phase 3. Ship by Sat Nov 28. About 5.5 review hours.

| Item | Lane, size | Done when | Needs |
|---|---|---|---|
| Facet slip parts | facet, M | Appraisal certificate, rail slip, numbered steps, signed money and chat promoted from `hg-wire.css`, which is then deleted | |
| Slip and states (F3.1) | data and screens, L | A `slips` table; draft, assessed, sent, placed; survives reloads; reminders for legs under 2.5, 2+ TD and stakes outside the usual range | Facet slip parts |
| Lose it all (F3.2) | screens, S | Each leg's chance, all hit, lose it all in large type; same game legs show a correlated flag and no number | Slip |
| Direct DraftKings link (F3.6) | data and screens, M | `buildSlipLink(book, legs)` in `packages/core` joins outcome ids with `+`; one tap opens the sportsbook slip with every leg | Call 2 |
| Handoff and change dialog | screens, M | The three step handoff with Mark placed as suggested or as my own play; Keep suggested play is the focused default | Slip |
| The Jeweler (F3.3) | data and screens, L | Sheet on desktop, tab on phone; each ask carries the card and the slip; answers cite the app's numbers; no placing action exists | Call 5 |
| Slip history and graded slip | screens, M | Season stats, past slips, the graded slip with took, closed and beat close per leg | M1 grade and box |
| Provenance report (F3.7) | screens, M | Hit rate and average CLV by insight; under 15 graded gems shows cloudy | M2 notes and splits |

## Micro moments

The dot moments from `docs/animation/micro-moments/`, built on Facet's engine (`packages/facet/patterns/moments.md`).
Each moment ships with its surface.

| Moment | Surface | State |
|---|---|---|
| Foundation | Facet engine, tokens, card states, Undo toast, glint hooks; `apps/web/lib/moments` | Built |
| Unread gems | New gems row | Built: unread tint and sheen, six dots circle the newest |
| Unread to read | Mark read, Mark all read | Built: a cloud sweeps each card; a failure puts the shine back |
| Add a gem, drawer | Board Add, Slips in the rail and tab bar, gem sheet | Built: Slips glints and the rail count pops; the sheet springs open with an edge ripple, its row stays selected |
| Remove, swipe | The slip | Built: × or a phone swipe removes at once, the row sweeps and closes, Undo restores the leg at its added price |
| Erase | Clear slip | Waits on call 12: the slip has no Clear control |
| Send | Send handoff | Built: Open DraftKings dissolves the slip card into the gem; the handoff screen is unchanged |
| New connection | A connections screen | Waits on the screen |

## Prove it (M4)

Weeks 13 to 18. The system is complete; the work is judging it and the Phase 4 list.

- Tue Dec 1: lock the rating formula on Weeks 9 to 12.
- Sun Dec 6: the north star test. If average CLV is at or below zero, the rating formula goes back to the lab before
  anything new is built.
- Mid December: the first provenance read; drop the splits and notes that do not earn their place.
- Same game correlation model (Phase 4), so correlated legs get a real number.
- The Jeweler's bench as live controls (Phase 4).
- Mined by on the board (F0.1) and mined count logging, once a source exists (call 2).

## After the season

From Jan 11 2027: the season review against every goal, then the open questions in PRD section 14: playoffs, Rarity and mined counts,
the off field social scan, and a protectable name.

## Risks

- **Credits.** 500 a month. Late season Saturday and holiday games add freeze pulls; the guard refuses a pull it
  cannot finish, so the risk is a missed freeze, not an overspend. Watch Data health, Usage in December.
- **Thin opening lines.** Tuesday's opening snapshot posts few DraftKings players, so new gems cluster after the
  Saturday snapshot.
- **Snap counts lag.** Clarity's setup part runs on older snap shares early in the week.
- **Calibration.** The recalibration constants were fit on the same backtest, so the baseline is slightly flattered;
  M2's backtest job makes drift visible.
- **Previews use sample data.** The first live view of each screen is production. Check each release there after the
  next pull.

## Shipped

Work merged into `main` from here on, one line each with its PR.
