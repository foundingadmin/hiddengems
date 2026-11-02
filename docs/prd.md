# Hidden Gems · Product Requirements Document (PRD)

Version 1.1 · updated Mon Nov 2 2026, 4 AM MT, with Josh's answers and comments · owner Josh Titus · grading model Hidden Gems v3.0 plus implied team points
Rating lab, five rating formulas on the Week 9 board: https://claude.ai/artifact/1BocBGt7apEYLd9NscUpit
Companion lookbook with competitor research, wireframes and the color wheel: https://claude.ai/artifact/AkiGCJdL8UFkCEo55nrJKo
Feature wireframes, 10 phone screens: https://claude.ai/artifact/98F927ZbiXyWJsb978uKva

---

# 1. Decisions

## Still open, needs Josh

Nothing open. Next review: the rating formula after Week 9 grades on Tue Nov 10 2026.

## Settled Mon Nov 2 2026

1. **Hosting.** claude.ai artifact this season, launched from a home screen and dock icon so it opens like its own app (section 12).
2. **Scope by Sat Nov 7 2026.** Phases 0 and 1 as written. Week 9, Sun Nov 8, is the first measured Sunday.
3. **Palette.** Violet brand, pushed forward and tweaked as we go. Gold is removed everywhere. The repo session's color system is integrated as the source of truth.
4. **Notes name.** The Jeweler's notes, for now.
5. **Price snapshots.** Done. Two scheduled tasks added, Saturday 7:47 PM and Sunday 8:43 AM, plus a snapshot command in the pipeline that logs each price point without touching the frozen read or the opening price.
6. **DraftKings link.** Decoded from the link Josh sent (section 9, F3.6).
7. **Backtest gates.** Implied team points passed and is live in the pipeline. Market consensus waits for multi book history to accumulate (F2.6).
8. **Odds feed route.** This app has no cloud network setting, so the free odds feed runs through the built in browser on Josh's computer, same as the Outlier captures. Tested live Nov 2 2026: 1 credit per game, 497 of 500 left this month. Added to the Saturday and Sunday snapshot tasks as a shadow feed. The key is never committed to the repo, which is public.
9. **Rating formula (approved Nov 2 2026, revisit after Week 9 grades Tue Nov 10).** A gem must beat the posted price. Its number is edge × clarity, so a big edge with a murky read can't score high. The board sorts gems by hit chance × clarity. When nothing at your usual odds has an edge, the board says so and lists the real long shot gems below. Section 8.
10. **One rating system.** The repo's Facet design system drops its four gem tiers (rough, cut, polished, flawless) for the single 0 to 100 rating, with purple intensity rising with the number. Docs updated in [pull request 4](https://github.com/foundingadmin/hiddengems/pull/4).

---

# 2. Summary

Hidden Gems is a personal NFL player prop research tool. It grades every prop as a gem with one 0 to 100 rating, built from free nflverse stats and prices from Outlier, a paid subscription (Premium lists at $19.99 a month) that Hidden Gems should outgrow, and adds the qualitative read competitors don't have: the Jeweler. Its first job is trust: when it calls something a gem, the gem is real. It finds a few diverse bets with the lowest chance of losing the whole stake, explains them simply enough to trust in seconds, hands the slip to the sportsbook without AI ever handling money, and measures itself honestly after every Sunday.

**Long term goal: self sufficient.** Hidden Gems should run on free and public data without depending on any paid tool subscription. Today Outlier is the one paid dependency (section 10 has the path off it).

One user: Josh. Window: the rest of the 2026 regular season, 10 Sundays from Nov 8 2026 to Jan 10 2027, assuming Week 8 was Sun Nov 1 2026.

# 3. User and problem

**Who.** Josh, fourth season betting NFL on DraftKings. Decimal odds, usually 2.5 or more. $10 to $20 singles and $5 to $15 parlays of up to 3 legs. Opts into DraftKings boosts every Sunday. Bets the morning games first. If the morning goes well, some profit goes to the afternoon. If it goes badly, he stops and just watches.

**What he values.**
- Current season hit rates over last 10 games, since last 10 bridges roster and coaching changes.
- Conditional splits where player, QB and staff stay the same. Head to head (H2H) only when nothing changed and it's from last year. These are starting examples. The full split library is in section 17 and keeps growing.
- Avoids top red zone reads (double team risk) and 2+ TD props.
- A few diverse options with the lowest chance of losing everything. No long shot parlay strategies.
- Outlier is the source of truth for prices. The open web is for qualitative context.

**Pain today.**
- Outlier and every competitor are quantitative. The same prop looks the same to everyone.
- Conditional splits are hard to consolidate by hand.
- The first scorecard was dense and data first, and hard to read.
- No honest feedback loop. Win and loss records take a season to mean anything.
- No way to track history against strategy. Nothing records which insight led to a bet, so there's no way to learn which insights actually work.
- The whole category is noisy. Dense tables, hundreds of badges calling everything great or ultimate, neon colors everywhere. Nothing consolidates the data into one experience you can trust.

# 4. Goals and success metrics

**North star: when Hidden Gems calls something a gem, it's real.** Every other goal serves this one.

1. **Gems prove real.** High rated gems beat the closing price on average and hit at or above their appraised chance. Measured: average closing line value (CLV) above zero across at least 30 graded gems by Sun Dec 6 2026, and top rated gems hitting at or above their appraisal.
2. **Stay calibrated.** Walk forward backtest score (Brier score, lower is better) at or under the current baseline on every refresh. Baseline on Nov 2 2026: 0.1371 over Weeks 4 to 8 before implied points, 0.1360 with them.
3. **Learn which insights work.** Every gem records what surfaced it (Provenance, F1.3), so by mid December we can say which notes and splits earn their place.
4. **Readable at a glance.** Any collapsed gem row is understood in 5 seconds. This is the main design problem in the category (section 5b).
5. **Decide fast.** A confident slip in 15 minutes or less on a Sunday morning.
6. **Near zero manual input.** Results and CLV log themselves. The only tap Josh owes is confirming a slip was placed.

# 5. Non-goals

- Never arbitrage or middles, in any form, ever.
- No live alerts yet. One optional Saturday night push for now.
- AI never handles money. No sportsbook login, no placing, no account access.
- DraftKings is the purchase point today. That can change, so the build is book agnostic from day one: prices, links and the slip handoff all go through a per book adapter, and adding a book means adding an adapter, not rewriting the app. Other books inform the market appraisal.
- No mined trend systems. No exposed model sliders yet; the Jeweler's bench explainer is built so it can become live controls later.
- No 2+ TD ladders.
- Not a product for other users this season.

# 5b. Design thesis

Competitors underinvest in design, so friction is everywhere: dense data sets, a badge on everything, every bet labeled great or ultimate, neon and noise. Hidden Gems wins by restraint.

- **One number.** Each gem has one rating. Everything else lives behind a tap.
- **Labels must be earned.** No superlatives. A label appears only when it changes the decision: Fool's Gold, New, Clears the cut. If every gem has a badge, no gem does.
- **Plain sentences beat columns.** The Jeweler's notes say what the numbers mean in one line each.
- **Color carries meaning, never decoration.** Violet is the brand and the gem. Green is a hit, red is a miss, gray is context. Nothing else.
- **Empty is honest.** A week with no gems at your odds says so plainly instead of filling the board with weak picks.
- **Bottom line first, detail on tap.** The test for every screen: understood in 5 seconds, trusted in 15.

# 6. The Sunday flow

1. **Saturday 7:47 PM.** Prices snapshot and the board regrades. Optional push: new gems are waiting.
2. **Sunday morning.** Open Gems. The new finds sit at the top.
3. **The board.** Every gem as a collapsed row: rating, diamond row, price, kickoff time, mined count.
4. **Expand a gem.** Rating up top, posted vs fair price, appraisal over time, then the Jeweler's notes, then the core sample and environmental factors.
5. **Add to slip.** The slip shows stake, payout and the chance of losing it all.
6. **Ask the Jeweler.** Keep, swap or cut per leg, plus one line on the whole slip.
7. **Send to the sportsbook.** DraftKings today. Phase 1 goes through the Outlier cart. Phase 2 opens the DraftKings slip directly. Josh taps Place Bet himself.
8. **Confirm placed.** One tap in Hidden Gems.
9. **Kickoff.** Each gem's appraisal freezes and CLV is recorded.
10. **Final.** The closed appraisal result lands: Earned, Unlucky, Lucky or Wrong read.
11. **Afternoon.** Morning results show before afternoon kickoffs, matching the stop or continue routine.

# 7. Vocabulary

- **Gem.** One player prop.
- **Gem rating.** One 0 to 100 score that sums every calculation. All gems are violet. The gem glows brighter as the rating climbs. No species or types.
- **Rarity.** The odds, the payout multiplier. Shown, never mistaken for quality.
- **Carat.** The gap between Hidden Gems' hit chance and the market's fair chance, in points.
- **Clarity.** Confidence in the read, 0 to 100.
- **Clears the cut.** The gap to the posted price is above zero, so the bet beats the book's built in cut.
- **Appraisal.** A hit chance. Yours is the model's. The market's is the fair price.
- **Appraisal over time.** The market's appraisal from open to kickoff, frozen at kickoff, with CLV after.
- **Closed appraisal result.** The final card after the whistle.
- **The Jeweler.** The in-app Claude persona.
- **The Jeweler's notes.** The qualitative layer: trend lines, conditional splits, notes that add to or cost the appraisal.
- **The loupe.** The drill-in view where split conditions toggle on and off.
- **Environmental factors.** Game conditions around a gem: implied team points, matchup, weather.
- **The core sample.** The player's share of the opportunity that drives the market.
- **Mined count.** How many Outlier users found and added a gem.
- **Gems.** The main page: every gem found this week. Called the board before Nov 2 2026. New finds carry a NEW tag here too.
- **New gems.** The newest top rated finds, shown at the top of Gems, not on a page of their own. The Gems nav item shows the count. Each leaves at its kickoff.
- **Slips.** Your space: the slip you're building, sending it to the sportsbook, and the history of every slip you placed.
- **The slip.** The slip you're building, styled like an appraisal certificate. On desktop it lives in the sidebar.
- **Fool's Gold.** A warning on a gem that looks good but doesn't clear the cut.
- **Provenance.** The record of what surfaced a gem: which notes, splits and factors. Graded over time to learn which insights work.

# 8. Gem rating (approved for now Nov 2 2026)

The rating lab compares five formulas on the same 126 Week 9 props: https://claude.ai/artifact/1BocBGt7apEYLd9NscUpit

What the Week 9 opening lines show (one book posted, numbers will move by Sunday):
- **Today's scorecard (edge × odds × clarity):** top 10 has middle odds of 11.25 and an average hit chance of 10%. It ranks payout, not trust. Drop.
- **The v1.0 proposal (60% edge plus 40% clarity, added):** only 4 of its top 10 clear the posted price. Adding clarity lets props with no edge float up. Drop. This was my proposal and the data says it's wrong.
- **Edge × clarity (multiplied):** every top 10 pick clears the price. A gem needs both. Keep, as the number on the gem.
- **Expected return:** long run math that favors long shots. Drop, since you treat each Sunday on its own.
- **Gate, then safest:** only props that clear the price qualify, ranked by hit chance × clarity. Keep, as the board's sort order.

**Approved Nov 2 2026, revisit after Week 9 grades**

Week 8 pilot check, 8 real bets: clear reads hit 4 of 5, hazy or cloudy reads 1 of 3. Directional only, but it supports multiplying clarity instead of adding it.

```
if gap_to_posted <= 0:  no gem (Fool's Gold if it looks tempting)
rating      = round(100 * clamp(carat_pp / 10, 0, 1) * clarity / 100)
board_order = hit_chance * clarity / 100          # likeliest real gem first
if no_2026_stats:       rating = None             # market stands
```

Empty state: when nothing clears at your usual odds, the board says so.

Display: one violet gem with brightness keyed to the rating, the number beside it, the breakdown inside the expanded card.

Next: grade each formula's top 10 after Weeks 9 to 12, about 500 props, then lock it.

# 9. Features and build plan

Three estimates per feature:
- **Human build** is the original estimate of your hours if you built it with Claude helping.
- **Claude Code** is agent working time. It runs while you're elsewhere.
- **Your review** is the time you actually spend when Claude Code builds it: briefing, checking and merging.

Realistic timeline math uses Claude Code plus your review.

## Phase 0 · Foundation · target Sat Nov 7 2026

**F0.1 Board and gem row**
- What: the list of every graded gem, one collapsed row each.
- Shows: violet gem with rating, player and market, kickoff time, DraftKings price, last 10 diamond row, mined count, new tag.
- Acceptance: the Week 9 board renders from the pipeline, sorted by rating, and every row shows its kickoff.
- Estimates: human build 3 · Claude Code 2 · your review 1

**F0.2 Gem rating**
- What: the single 0 to 100 score from section 8.
- Acceptance: every gem with 2026 stats has a rating. Fool's Gold caps apply. No rating without stats.
- Estimates: human build 2 · Claude Code 1 · your review 0.5

**F0.3 Last 10 diamond row**
- What: ten diamonds, filled violet for a hit and hollow for a miss. Season rate printed beside it, since it outranks last 10.
- Data: nflverse weekly stats.
- Acceptance: correct for anytime TD and yardage props.
- Estimates: human build 2 · Claude Code 0.5 · your review 0.5

**F0.4 Posted vs fair helper**
- What: the posted DraftKings price and the fair price side by side in the expanded card, with a Why two prices helper and both gaps, gap to fair and gap to posted.
- Acceptance: the helper explains it in one line using that gem's own numbers. Clears the cut shows only when the gap to posted is above zero.
- Estimates: human build 1 · Claude Code 0.5 · your review 0.5

## Phase 1 · Measure · target Sat Nov 7 2026

**F1.1 Appraisal over time, CLV half**
- What: record the price taken and the fair closing price, then compute CLV at kickoff.
- Calc: `clv = taken_decimal / close_fair_decimal - 1`
- Data: freeze and close commands, which exist today.
- Acceptance: every sent gem has a CLV after kickoff. Running average CLV shows on a summary line.
- Estimates: human build 3 · Claude Code 1.5 · your review 0.5

**F1.2 Closed appraisal result**
- What: the final card. Your appraisal against the market's last, the result and profit, and one of four boxes.
- Boxes: Earned (beat the close, hit), Unlucky (beat the close, missed), Lucky (lost to the close, hit), Wrong read (lost to the close, missed).
- Data: autograde and the close command.
- Acceptance: every graded gem lands in exactly one box within an hour of final.
- Estimates: human build 3 · Claude Code 1.5 · your review 0.5

**F1.3 Provenance logging**
- What: every gem stores what surfaced it: the model parts, each note and split cited, environmental factors, and whether it was flagged new.
- Acceptance: every graded gem has a provenance record. Nothing is shown yet; data starts accumulating Week 9.
- Estimates: human build 2 · Claude Code 1 · your review 0.5

## Phase 2 · Read · target Sat Nov 21 2026

**F2.1 Jeweler's notes: trend lines**
- What: three plain lines with percents, ranked by strength times sample.
- Calc: `score = abs(rate - 0.5) * sqrt(n_games)`
- Acceptance: never cites a split under 3 games. Season rate preferred over last 10.
- Estimates: human build 3 · Claude Code 1 · your review 0.5

**F2.2 Conditional splits and the loupe**
- What: the notes cite the splits that count. Tapping a note opens the loupe, where conditions toggle and Clarity and the diamond row redraw.
- Conditions: the full split library in section 17. Start with the free nflverse ones, then add the rest as data allows.
- Calc: `rate_split = (hits_split + 4 * season_rate) / (n_split + 4)`
- Data: nflverse play by play and snaps (have). Coaching changes, a short hand-kept list (partial).
- Acceptance: thin samples render cloudy. Toggling recomputes in under a second.
- Estimates: human build 10 · Claude Code 4 · your review 2

**F2.3 Notes that add to or cost the appraisal**
- What: the bull and bear case as two kinds of note. Each costly note is an inclusion that lowers Clarity a notch.
- Data: model components, injury report, spread for blowout risk, Claude web research for news. Later: the off-field social scan.
- Acceptance: each note has a source. Clarity changes match the notes.
- Estimates: human build 4 · Claude Code 1.5 · your review 1

**F2.4 The core sample**
- What: the player's share of the opportunity that drives the market. Red zone chances for TD props. Target, carry or snap share for yardage and reception props.
- Acceptance: the right opportunity type per market, plus a season and last 3 weeks view.
- Estimates: human build 3 · Claude Code 1 · your review 0.5

**F2.5 Environmental factors**
- What: one panel for game conditions.
- Implied team points: `team_pts = total / 2 ± spread / 2`, scaling expected touchdowns. **Passed the gate Nov 2 2026**: Weeks 4 to 8 Brier 0.1360 vs 0.1371 on 1,583 player games, bootstrap interval excludes zero, better in 4 of 5 weeks. Small gain, real. Live in the pipeline from the Thursday Nov 5 freeze.
- Matchup context: one line, a 1 to 32 track and a four week strip, gray with a context only tag. Never moves the rating, which matches the v3.0 test.
- Weather: context line when relevant.
- Acceptance: gated factors are visibly marked context until they pass.
- Estimates: human build 7 · Claude Code 3 · your review 1.5

**F2.6 Market consensus appraisal**
- What: the market appraisal becomes the average fair price across 3 or more books. DraftKings shows an above or below market tag.
- Calc: `p_market = mean(devig(price) for 3+ books)`, `dk_extra = dk_decimal * p_market - 1`
- Data: other books through Outlier (partial). Opening lines often show one book, so this needs a few Sundays of multi book history before it can be tested.
- Acceptance: switches Carat's baseline only after the backtest gate.
- Estimates: human build 3 · Claude Code 1.5 · your review 1

**F2.7 Appraisal over time, live line**
- What: the price snapshots draw the market line before the kickoff marker. Data now flows from Saturday 7:47 PM and Sunday 8:43 AM snapshots plus freeze and close.
- Estimates: human build 4 · Claude Code 1.5 · your review 0.5

**F2.8 Free price feed, shadow run**
- What: pull anytime TD prices from a free odds API alongside Outlier for two Sundays and compare (section 10).
- Acceptance: a side by side report of price match and link coverage. Decision to cancel Outlier rests on it.
- Estimates: human build 3 · Claude Code 1 · your review 0.5

## Phase 3 · Act · target Sat Nov 28 2026

**F3.1 Slip and final appraisal**
- What: the practice slip styled as an appraisal certificate. Each leg is a violet gem with its rating. Stake, payout and lose it all sit at the bottom. Ask the Jeweler returns keep, swap or cut per leg plus one summary line.
- Guardrails: flags legs under 2.5 odds, 2+ TD props and stakes outside his usual ranges, as reminders only.
- Acceptance: slip states are draft, assessed, sent and placed. The slip survives reloads.
- Estimates: human build 6 · Claude Code 2.5 · your review 1.5

**F3.2 Parlay lose it all meter**
- What: each leg's hit chance, the chance all hit, and the chance of losing the whole stake in big type beside the payout.
- Calc: `lose_all = 1 - p1 * p2 * p3` for legs from different games only. Same game legs show a correlated flag instead.
- Acceptance: never shows a number for correlated legs.
- Estimates: human build 5 · Claude Code 1.5 · your review 0.5

**F3.3 The Jeweler chat**
- What: a drawer on every screen and an Ask the Jeweler button on each gem. Answers come in the brand voice, grounded in the card.
- How: on claude.ai, the artifact's ask Claude capability on Josh's account. Each ask carries the card's data, since there's no memory between asks.
- Acceptance: the answer cites the card's numbers. No placing or betting actions exist in the chat.
- Estimates: human build 5 · Claude Code 2 · your review 1

**F3.4 Slip handoff, phase 1**
- What: submit the slip, Claude adds those picks to the Outlier cart through the browser, and Josh taps one button in Outlier to send it to DraftKings.
- Acceptance: the Outlier cart matches the slip exactly. Nothing touches DraftKings.
- Estimates: human build 2 · Claude Code 1 · your review 0.5

**F3.6 Slip handoff, phase 2 (direct link)**
- Format, decoded from Josh's link Nov 2 2026: `https://sportsbook.draftkings.com/event/{event_id}?outcomes={outcome_id}`. Example: event 34118031, outcome `0QA382703107#2336266924_13L88808Q1-1377166492Q20` (the # is written %23). 88808 is DraftKings' NFL league number.
- Source: Outlier's props page already carries each book's link on its price button. The snapshot scraper reads those links today to tell books apart, so storing the DraftKings link per prop is a one line change.
- Multi leg, confirmed from Josh's two game link Nov 2 2026: outcome IDs joined with `+`, for example `?outcomes={outcome_a}+{outcome_b}`. The event in the path is the first leg's and doesn't limit the other legs. The odds feed's own links use `https://sportsbook.draftkings.com/?outcomes=...` with no event, which should also work.
- Book agnostic: built as the DraftKings adapter behind one `build_slip_link(book, legs)` interface.
- Acceptance: one tap opens the sportsbook slip with every leg. Josh taps Place Bet.
- Estimates: human build 4 · Claude Code 1.5 · your review 1

**F3.7 Provenance report**
- What: hit rate and average CLV by insight, so you see which notes, splits and factors actually find real gems.
- Acceptance: any insight with 15 or more graded gems shows its record. Thinner samples show as cloudy.
- Estimates: human build 4 · Claude Code 1.5 · your review 0.5

**F3.5 New gems**
- What: a row at the top of Gems for gems that crossed rating 90 or jumped 15+ since the last look, newest first. The same gems carry a New tag in the full list, and the Gems nav item shows the count. Selecting one opens its drawer. Finds expire at kickoff.
- Acceptance: never shows an expired gem. No separate Tray page. The optional Saturday push opens Gems.
- Estimates: human build 4 · Claude Code 1.5 · your review 0.5

## Phase 4 · Later · through Jan 10 2027

- **Live alerts.** Not yet. Revisit after the season.
- **Same game correlation model.** Correlation from nflverse history so same game parlays get a real number. Human build 6 · Claude Code 3 · your review 1.5
- **Jeweler's bench, live.** Unlock the locked model controls in the lookbook explainer. Human build 4 · Claude Code 2 · your review 1
- **Mined count logging.** Log Outlier research and add counts to test whether low traffic gems carry more edge. Human build 2 · Claude Code 1 · your review 0.5

## Totals and timeline

- **Phases 0 to 3:** human build 83 · Claude Code 34 · your review 17
- **Phase 4:** human build 12 · Claude Code 6 · your review 3

Claude Code runs while you're elsewhere, so your review hours set the pace. Phases 0 and 1 need about 4 review hours, Phase 2 about 7.5, Phase 3 about 5.5. At about 5 review hours a week:
- Phases 0 and 1 land by **Sat Nov 7 2026**, so **Week 9, Sun Nov 8**, is the first measured Sunday.
- Phase 2 lands by **Sat Nov 21 2026**.
- Phase 3 lands by **Sat Nov 28 2026**, leaving 6 Sundays, Nov 29 2026 to Jan 10 2027, on the full system.
- Phase 4 fills in opportunistically.

# 10. Data and pipeline

**Sources**
- nflverse: play by play, weekly stats, snap counts (a few days behind), injury reports, players table, schedules with spread and total lines.
- Outlier, paid (Premium lists at $19.99 a month, Premium+ $29.99, Pro $79.99), source of truth for prices today: DraftKings price, other books' prices, mined counts, and sportsbook slip links.
- Claude web research: news and qualitative context for the Jeweler's notes.
- The existing pipeline in the Hidden Gem Scorecard dashboard store, doc pipeline/build, with freeze, open, snap, close and autograde, run by scheduled tasks. Price capture runs in the built in browser on Josh's computer, so the computer must be awake with the Claude app open at those times.

**Added Nov 2 2026**
- Saturday 7:47 PM and Sunday 8:43 AM price snapshots, stored as a `snaps` list on each prop.
- Implied team points from nflverse schedules, scaling each player's expected touchdowns.

**Still to add**
- Slip records with state and the Jeweler's verdict.
- A placed flag per slip.

**Data model sketch**

```
Gem   { id, week, kickoff, player, team, opp, market, line,
        dk_price, fair_price, consensus_price, gap_fair, gap_posted,
        p_model, carat, clarity, rating, fools_gold,
        last10[], season_rate, notes[], splits[], core_sample,
        env { implied_pts, matchup_rank, weather },
        snapshots[], mined_count, result, clv, box,
        provenance { model_parts, notes[], splits[], factors[], flagged_new },
        links { book: url } }
Slip  { id, created, book, legs[gem_id, stake], payout, lose_all,
        jeweler_verdict, status: draft | assessed | sent | placed }
```

## Getting off paid tools

**What Hidden Gems takes from Outlier today:** sportsbook prices, the slip links and an injury flag. Later, mined counts.

**Free replacements**
- Stats, injuries, schedules, spreads and totals: nflverse, already free and already used.
- Prices: The Odds API has a free tier of 500 credits a month. Player props come through its event odds endpoint, charged per market per region. Anytime TD for about 14 games at about 6 snapshots a week is roughly 84 credits a week, around 360 a month, inside the free tier for TD props only. Yardage and reception markets would need a paid plan. Its docs describe an `includeLinks` option that returns sportsbook slip links when available.
- **Tested Nov 2 2026 with Josh's free key:** DraftKings anytime TD prices for CIN @ ATL came back with a slip link per player in exactly the format Outlier uses (for example Ja'Marr Chase 1.80, Bijan Robinson 1.56). Only 7 DraftKings players were posted that early in the week. So the free feed covers both prices and the slip handoff.
- Route: the cloud workspace can't call the feed (network allowlist, no setting in the Claude app), so it runs through the built in browser on Josh's computer. Shadow feed live in the Saturday 7:47 PM and Sunday 8:43 AM snapshots from Sat Nov 7 2026, about 30 credits a week. The pipeline's `feed` command stores each book's price and the DraftKings slip link per prop without touching Outlier's numbers.

**What you'd lose:** mined counts (Outlier only) and Outlier's own screens, which Hidden Gems replaces.

**Plan:** shadow run from Week 10 (F2.8). If prices match and links work for two Sundays, cancel Outlier. The key is stored only in the scheduled tasks that use it, never in memory or the app.

# 11. Model spec · Hidden Gems v3.0

Source: project doc claude/grading-v3-nflverse.md.

1. **Red zone read.** Inside 10 carries × league TD rate per carry, plus inside 10 targets × league TD rate per target, plus long touchdowns scaled to snap share.
2. **Blend and recalibrate.** 80% red zone read and 20% shrunk TD hit rate, then logistic recalibration with a = −0.213 and b = 0.755.
3. **Backtest.** Walk forward over Weeks 4 to 8 of 2026, 1,367 player games. Score 0.131 vs 0.137 for plain hit rate vs 0.147 for knowing nothing. Calibrated across snap shares.
4. **Market blend.** House cut assumed at 5% plus 1% per point of decimal odds, max 35%. Stats weight 0.5, or 0.3 under 4 games, multiplied by min(1, 8 / (odds + 4)) for long shots.
5. **Defense factor.** Tested, didn't help. Context only.
6. **Fallback.** No 2026 stats match means no read, and the market stands.
7. **Clarity, 100 points.** Sample 40, consistency 30, books agree 15, setup 15. Setup includes the injury report and loses 5 for a falling snap share.

8. **Implied team points (added Nov 2 2026).** Each player's expected touchdowns scale by his team's implied points divided by the league average so far (exponent 1.0). Weeks 4 to 8: 0.1360 vs 0.1371. Fitted exponents keep landing near 2, so a stronger version may be justified after more weeks.

**Backtest note.** The documented 0.131 covered Weeks 4 to 7 (reproduced at 0.1314). With Week 8 in, the baseline is 0.1371. Week 8 is incomplete (Monday night unplayed, snap counts mostly pending), so its score will improve once the data lands. The recalibration constants were fit on the same backtest, so the baseline is slightly flattered.

**Still gated:** the market consensus baseline (F2.6) and the rating formula (section 8).

# 12. Architecture and hosting

**Chosen: Option A this season.**

**Launching it like its own app**
- iPhone: open the app's link in Safari, tap Share, then Add to Home Screen. Name it Hidden Gems and keep Open as Web App on, so it opens full screen without Safari's bars. The home screen icon may show Claude's logo. For the violet gem icon, make a one step Shortcut (Open URLs with the app's link), add it to the home screen and pick the gem image as its icon. That route may open in Safari or the Claude app instead, so try both and keep the one that feels right.
- Desktop (Comet): open the app's link, then menu, Save and share, Install page as app (or Create shortcut with Open as window). It gets its own window and dock icon.
- Limitation: the page lives on claude.ai, so some Claude framing may still show. The only fully Claude free shell is Option B, which needs an Anthropic API key for the Jeweler.

**Option A · claude.ai artifact**
- The Jeweler runs through the artifact's ask Claude capability on Josh's account.
- Slips, logs and snapshots live in the artifact's database.
- The pipeline already runs from an artifact store.
- Works on desktop and in the Claude app.
- The design system tokens from the repo apply as CSS.

**Option B · Vercel app from the hiddengems repo**
- Full control, a custom domain, and the Geist based design system natively.
- Needs an Anthropic API key, billed separately, for the Jeweler, plus more ops.
- The right move if Hidden Gems goes public.

Recommendation: A now. The repo stays the source of truth for the design system and the PRD, and the build ships as an artifact.

# 13. Control and safety rules

- AI never handles money. The sportsbook (DraftKings today) stays under Josh's absolute control. Hidden Gems may only open a slip link. Josh taps Place Bet.
- Claude may add picks to Josh's Outlier cart only when he submits a slip in Hidden Gems.
- No credentials are stored anywhere in Hidden Gems.
- The lose it all chance is always visible on the slip.
- Nothing rewards betting volume. The app rewards finding and judging gems, including passing on Fool's Gold.

# 14. Open questions (not tonight)

- Does Rarity stay purely the odds, or does a low mined count deepen it?
- Playoff support after Jan 10 2027.
- Feeding the off-field social scan idea into the Jeweler's notes.
- A protectable app name. "Hidden gem" is descriptive and hard to trademark.

---

# 15. Brand overview

Handoff for the branding session. Everything here was settled or proposed between Nov 1 and Nov 2 2026.

## Positioning

**Every app reads the same paper. Hidden Gems reads what the paper can't show.**

Competitors are quantitative screens that show everyone the same numbers. Hidden Gems is the jeweler who knows what else to look for, then says it plainly enough to trust in seconds. The data is the confidence weight. The interpretation is the access.

## Personality

- A trusted jeweler, not a casino. Calm, exacting, plain spoken, quietly confident.
- Honest about risk. Lose it all is always shown, and passing on Fool's Gold counts as a win.
- Never hype, never gamify volume, never long shot theater.

## The world

- Prospecting is finding: the board, new gems, mined count.
- Jewelry is judging: the Jeweler, the Jeweler's notes, the loupe, the appraisal, the slip as a certificate.
- Vocabulary is in section 7 and stays consistent across every surface.

**Retired, don't use:** gem species or tiers (Quartz through Diamond, Ruby, Emerald, Sapphire), Assay Log, Alexandrite, strike bell, fire, ring or setting metaphors for parlays, footprints or untouched ground. Fool's Gold survives only as a warning label.

## Visual system

- **One gem.** Every gem is the same Facet purple. The rating number plus brightness is the only variable.
- **The diamond row.** Ten small diamonds for recent games, filled violet for a hit and hollow for a miss. The same diamond motif is the scale everywhere.
- **Semantic color is sacred.** Green means hit and red means miss, nothing else. Competitors blur this by using their brand green for wins.
- **No gold.** Removed Nov 2 2026. Highlights like New use violet. Fool's Gold is a dashed gray warning, not a gold one.
- **Context is gray.** Factors that don't move the rating, like the matchup, are drawn in gray with a context only tag.

## Color strategy

Sampled from competitor sites on Nov 2 2026:
- **Crowded money green:** Outlier, Props.Cash, Action Network, Rithmm, Unabated.
- **Crowded trust blue:** OddsJam, Action Network, Pikkit, RotoWire.
- **Shared alert orange:** Rithmm, Linemate, Outlier.
- **Grounds:** seven of nine sit on near black or navy. Action Network and RotoWire are the light exceptions.

**Open space**
- Violet through magenta, 249° to 353°, the widest empty arc. Only Outlier's pale lilac touches its edge.
- Amber through yellow, 22° to 90°. Unclaimed, but not used: Josh dropped gold on Nov 2 2026.

**Color system: Facet, from the hiddengems repo (merged to main Nov 2 2026)**
- The interface is gray, Geist's neutral scale. Dark ground #0a0a0a, surfaces #1a1a1a and #1f1f1f, borders #2e2e2e, text #ededed and #a1a1a1.
- Purple has one job: gems and the brand slot. Dark gem solid #8e4ec6, gem text #bf7af0. Never links, buttons or decoration.
- Green is go and good for the bettor, red is stop and bad, amber is wait and caution, blue is links and information.
- Product code reads Facet's semantic tokens (`--fc-gem-*`, `--fc-signal-*`, `--fc-edge-*`), never raw values.
- The wireframes were reskinned onto these values Nov 2 2026. Amethyst Night and the other palette proposals are retired.

## Typography

Geist and Geist Mono, following the Vercel Geist research in the hiddengems repo design system. Mono for odds, ratings and data. Sans for everything else.

## Name and domains

- Working name: **Hidden Gems**.
- On Nov 1 2026, hiddengem.bet and hiddengems.bet were unregistered, along with .com fallbacks like hiddengembets.com. Pricing was not checked, so recheck both.
- Because "hidden gem" is descriptive and hard to trademark, consider keeping it as the feature language with a protectable product name above it. Candidates explored Nov 1 2026: Assay, Sluice, Loupe, Facet. assay.bet, sluice.bet, loupe.bet and facet.bet were open that night.

## Don'ts

- No casino cues: chips, slot imagery, confetti on wins.
- No species ladders or extra gem names to memorize.
- No green or red outside hit and miss.
- No gold.
- No superlative labels: great, ultimate, lock, best bet.
- No dense data first screens. Bottom line first, detail on tap.
- No decorative emoji.

---

# 16. References

- Lookbook with competitor research, feature cards, color wheel, palettes and the Jeweler's bench: https://claude.ai/artifact/AkiGCJdL8UFkCEo55nrJKo
- Feature wireframes, 10 phone screens in Amethyst Night: https://claude.ai/artifact/98F927ZbiXyWJsb978uKva
- Rating lab: https://claude.ai/artifact/1BocBGt7apEYLd9NscUpit
- Grading model doc: project doc claude/grading-v3-nflverse.md
- Competitors reviewed: Outlier, Props.Cash, OddsJam, Action Network, Linemate, Rithmm, Unabated, Pikkit, RotoWire Break the Plane, FTA Prop Edge Tool, PropSignal, OddsShopper

---

# 17. Split library

Conditional splits are the qualitative edge. Josh's examples (same QB, same staff, last year's head to head) are the start, not the list. Every split uses the same shrinkage, `rate_split = (hits_split + 4 * season_rate) / (n_split + 4)`, and anything under 3 games renders cloudy. Provenance (F1.3) grades each split over time, so the weak ones get dropped.

**Free from nflverse today**
- Who's throwing: starting QB, backup QB starts, QB returning from injury.
- Who's calling plays: offensive coordinator or play caller change midseason.
- Teammates in or out: WR1, RB1, TE1 or the other back missing. Teammate returning from injury.
- Offensive line: two or more starters out.
- Role trend: snap share, route participation, target share and red zone share, last 3 weeks vs season.
- Game script: favored vs underdog, leading vs trailing share of snaps, blowout risk from the spread.
- Implied team points and game total (live in the model).
- Home vs away, dome vs outdoor, grass vs turf.
- Rest: short week (Thursday), off a bye, Monday to Sunday turnaround.
- Travel: West Coast team at a 1 PM Eastern kickoff, long trips, time zone shifts.
- Primetime vs day games.
- Division games and the second meeting of a division pair this season.
- Opponent: touchdowns allowed to the position, red zone defense, opponent defensive injuries (a starting corner or linebacker out).
- Defensive scheme where charting data exists: man vs zone, blitz rate. Coverage data in nflverse varies by season, so check before relying on it.
- Last season head to head, only when player, QB and both staffs are unchanged.
- Weather: wind over 15 mph, heavy rain or snow, cold.
- Month of the season: December and late season usage changes.

**Needs web research (the Jeweler)**
- Coach quotes about usage or a bigger role.
- Practice reports beyond the official injury designation, like limited all week.
- Revenge games against a former team.
- Contract year or incentive games.
- Depth chart changes announced midweek.
- Off field factors from player social accounts, the scan your wife wants to build.

**Needs paid data or a later decision**
- Personnel grouping usage, like 12 personnel near the goal line.
- Real time inactives timing before kickoff.
- Market movement source: sharp money vs public money.
