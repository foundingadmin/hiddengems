# Sprint 2026-11-03 punchlist
1. Suggested slip: `addLeg`/`removeLeg` return `{ ok: false, confirm: 'change' }`; `AddToSlip` opens the shared `components/change-slip-dialog.tsx` (also used by Change this slip) and runs again after Change slip. Test in `packages/db/test/slips.test.ts`.
2. On slip button: visually hidden ". Remove {name} from slip" after the visible label.
3. Phone filter bar: Facet `.fc-filter-bar[data-phone="scroll"]` with `.fc-filter-scroll` (sort first, one sideways row, Add filter as its icon) in `css/data.css`, `filter-params.md`, preview; search opens from the top bar's search button (`SEARCH_EVENT` in `shell.tsx`).
4. Jeweler prompt says the sheet shows Gap to fair; `describeGem` carries carat ("gap to fair +13 pts", one decimal like the sheet); `BoardRow.carat` added.
5. `postJson` never retries (network error or 5xx); test in `adapters.test.ts`.
6. Jeweler sheet `data-phone="full"`.
7. Provider caps comments now say migration 0006 (`ingest/src/jeweler.ts`, `safety.test.ts`); the 0005 mention in `docs/architecture.md` is right (gem_records append-only).
8. `markPlaced` claims the slip (`state <> 'placed'`) as the first statement of its transaction; a double submit writes one set of bets. Test in `slips.test.ts`.
9. Why two prices says only the fair price and chance, from the gem's numbers.
10. `.fc-time` dropped from the graded date. Still mono: Facet sets every `<time>` mono (owner decision 2026-11-02); a sans date inside a sentence is the principal's call.
11. Facet `.fc-list[data-aside="beside"]` (`css/lists.css`, `list.md`, preview) keeps the result and money beside the title under 520px; used by History's past slips and the graded slip's legs.
