# Rundoc: integrate micro moments

For the Claude Code session building the app. You orchestrate this and have the final say on integration: how it binds to Facet, what gets expanded or converted, and what the architecture should be. The proofs show what it should feel like, not how to build it.

**Sources, in order**
1. `docs/prd.md` and the principal's recorded decisions.
2. `packages/facet`, including its motion rules and hue allocation.
3. `docs/wireframes` and `docs/build-brief.md`.
4. This package, for motion and feel.

## Read first

Open each `preview/*.html`, then read `README.md` and `moments.md`.

Where this package differs from the sources above:

1. **Keep the New gems row.** The `mark` and `newest` proofs show one list that re-sorts newest first. Josh decided on Nov 2 2026 to keep the New gems row on top of Gems, as in the wireframes. Use only the unread and read card motion, on `.fc-gem-card` in that row.
2. **Facet allows only one looping glow.** `foundations/layout-materials-motion.md` limits looping motion to the gem and rules out decorative pulses. Josh asked for these moments directly, so record them as named exceptions in that doc. The unread sheen and circling dots are the only other loops. If one reads as noise in the app, park it for Josh rather than dropping it.
3. **The Send proof is not the current flow.** Build the Send handoff from the wireframes (`Handoff`, `DesktopHandoff`), and use this proof only for the moment itself. "Hidden Gems never places bets" stays on that screen.
4. **A suggested play still confirms.** The wireframes' dialog for changing a suggested play stands. Instant removal with Undo applies inside a slip that's already the player's own. If that's unclear once the slip is built, park it for Josh.
5. **Proof copy is a stand-in.** Use the words from the wireframes and live screens.

Anything on the principal's list (`.claude/agents/corpus/principal.md`) gets parked in `ROADMAP.md`, not guessed.

## Where each moment goes

Check this against `staging` first, since the app moves quickly.

| Moment | Surface | State on Nov 3 2026 |
|---|---|---|
| Unread gems | `NewGems` in `apps/web/components/gems-board.tsx` | **Ready now** |
| Unread to read | Mark read and Mark all read in `NewGems`, plus the count in `shell.tsx` | **Ready now.** Play before the server action removes the card. |
| Add a gem | Add control on the board, Slips in the rail and tab bar in `shell.tsx` | Waits on Add and On slip |
| Drawer | Gem sheet, on Facet's `sheet` | Waits on the gem sheet |
| Remove, Swipe, Erase | Slip | Waits on the slip. `apps/web/app/slips/page.tsx` is a stub. |
| Send | Send handoff | Waits on the slip |
| New connection | No screen yet | Waits on a connections screen |

Build the first two now so the foundation gets proven on real screens. Wire in the rest as each surface ships. If a screen is being built anyway, build its moment with it.

## Steps

1. **Design the foundation.** It needs to be one small client-only engine that any screen can call by event, with one shared canvas or one per surface, your choice. Facet's reuse rules decide where it lives. Suggested: motion primitives in `packages/facet`, the Hidden Gems scenes beside the app. No new dependency unless it clearly earns one.
2. **Add the tokens.** Add `--fc-illus-*` in `packages/facet/tokens/*.json` and run `node packages/facet/scripts/build.mjs`. Replace every raw value from the proofs. Add durations and easings to the motion tokens if the existing ones don't fit.
3. **Add Facet parts.** The unread and selected card states, the Undo toast with its dot countdown, and the edge glint on the sheet and nav. Each one gets a component doc and a preview specimen.
4. **Build the two ready moments.** Swap timers for real events. Get them reviewed on a staging preview.
5. **Write the pattern doc.** Record the rules in `README.md` in `packages/facet/patterns/`, so later packages and screens follow them.
6. **Bring in the remaining moments** as their surfaces ship.
7. **Update this package's status** in `docs/animation/README.md`. Keep the proofs as the record of the original direction.

## Build requirements

- **State first.** Data and DOM change right away, and animation follows. A failed or skipped animation never blocks the action, and a failed server action reverses the motion.
- **Reduced motion.** Under `prefers-reduced-motion`, skip the dots and show the end state. No loops.
- **Accessibility.** The canvas is `aria-hidden` and never takes pointer events. Announce changes with text, like the count and Undo. Undo is keyboard reachable and holds its time while focused. Color is never the only cue.
- **Performance.** Run the animation frame loop only while a moment plays, pause it when the tab is hidden, and clean up on unmount. Respect the device pixel ratio and resize.
- **No layout shifts.** Rows close smoothly, and the table stays stable.

## Estimates

| Work | Human hours | Claude Code | Your review |
|---|---|---|---|
| Foundation, tokens and Facet parts | 12 | 3 | 1 |
| Two ready moments | 4 | 1 | 0.5 |
| Each later moment, once its surface exists | 3 | 0.5 | 0.25 |

## Done when

- The two ready moments are live on staging with real events, and each later moment is either live or tracked in `ROADMAP.md` under its surface.
- The motion rules in `README.md` hold, with dots never touching on any frame.
- No raw hex or px in app code, and `node packages/facet/scripts/lint-color.mjs apps` passes.
- Reduced motion shows every end state with no dots.
- `pnpm check` and `node ops/sprint/lint-words.mjs origin/staging` pass.
- The UI is reviewed against `packages/facet/guidelines/web-interface-guidelines.md`, with rule IDs cited in the PR.
