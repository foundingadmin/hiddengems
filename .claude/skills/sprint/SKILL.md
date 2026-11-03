---
name: sprint
description: Runs one Hidden Gems sprint from the principal's Vercel toolbar comments on staging to a live staging deploy. Use when the principal types "go" (or "/sprint") in the open session, and for "release" to open the release PR to main.
---

# Sprint

The open session is the lead. It triages, parks, dispatches, merges and ships; it spawns only `builder`,
`verifier` and, when CI fails, `ci-fixer` (`.claude/agents/`). Nothing waits or polls: the session acts when a
spawned agent finishes and is idle in between.

Read first: `.claude/agents/corpus/principal.md` (what is the principal's call), `.claude/agents/corpus/decisions.md`
and the `lessons` of the last file in `ops/sprint/sprints/`.

## Fixed values
- Vercel team `team_Fbu8p3MDU8UTxUVh6IXItiI7`, project `prj_oFOD8W6fd9uM7PEFziLqRgJX1Gda`.
- Staging alias: https://hidden-gems-webapp-git-staging-founding-creative-projects.vercel.app
- Sprint id: `yyyy-mm-dd` (add `-2` and up for a second sprint that day). Sprint branch: `sprint/<id>`.

## 1. Triage
1. `git fetch origin staging main`. List every unresolved toolbar thread (`list_toolbar_threads`), and read each one
   with its page, selector and branch. Threads on production count the same as staging threads.
2. Copy `ops/sprint/template.json` to `ops/sprint/sprints/<id>.json` and fill one entry per thread (or per group of
   threads that touch the same part):
   - **Routed**: `lane` (screens, data, facet, copy), `fileGroup` (entries that touch the same files share one),
     `size` (S, M, L), `branch` (`<lane>/<id>-<slug>`), a one-paragraph `brief` in the principal's words with the files
     to read and what done looks like.
   - **Parked**: anything on the principal's list in `principal.md` (an encoding, a threshold, money, data that cannot
     come back, secrets, anything public). Give the `reason`. Parked entries are not built.
3. React on every thread with 👀 (`add_toolbar_reaction`) so the principal sees it was picked up.
4. More than 8 routed entries: ship the first 8 by file group and leave the rest for the next sprint.

## 2. Park (in this session, no spawn)
For each parked entry: add one line to `docs/ROADMAP.md` under "Waiting for the principal" (what, why parked, thread
link), reply on its thread in one or two sentences (what decision is needed), and set the entry `status: parked`.

## 3. Dispatch
Spawn one `builder` per file group, all in the same message, each with `isolation: "worktree"` and
`run_in_background: true`. Size S runs on `model: "sonnet"`; M and L on the default. The prompt is the entry's
`brief`, `branch`, sprint id and screenshot folder `<repo>/.sprint/shots/<entry-id>/` (absolute path). Set each
entry `status: building`. Then stop and wait for the notifications.

## 4. Merge
When every builder has reported (or failed):
1. Builder reports `Done`: set `status: ready` and record the head SHA. A failed builder: `status: dropped` with the
   reason, and reply on its thread.
2. `node ops/sprint/merge.mjs <id>` builds `sprint/<id>` from `origin/staging`, merges each ready branch in file-group
   order, and marks conflicts `dropped`. Commit the sprint file and the roadmap lines on the sprint branch.
3. `pnpm install && pnpm check`, `node ops/sprint/lint-words.mjs origin/staging`, then push `sprint/<id>`.
4. Checks fail: spawn one `ci-fixer` with the failure output, the sprint branch and the traces in
   `ops/sprint/traces/`. It fixes on the sprint branch and reports. If it cannot, drop the entry whose files fail
   (rebuild the sprint branch without it), reply on its thread, and continue.

## 5. Verify, once per sprint
Spawn one `verifier` with the sprint branch, the routed entries and the screenshot folders. It returns one punchlist
grouped by entry, or `Verdict: pass`.

## 6. Punchlist
For each entry with items, resume its builder with `SendMessage` (it keeps its context) and send only its items.
Builders push a new commit on their branch. Rebuild the sprint branch (`merge.mjs` again), rerun the checks, push.
No second verify: fixes are not re-reviewed (accepted risk; CI and the principal's staging review are the
backstop).

## 7. Ship to staging
1. Open one PR `sprint/<id>` to `staging`, titled `Sprint <id>`. The body lists each entry (thread link, what
   changed) and any owner step (a migration: `pnpm db:supabase-sql`, choosing "Run without RLS").
2. When CI is green on its head, merge it with a merge commit. If the merge is refused (branch protection), tell
   the principal and stop.
3. Confirm the staging deploy for the merge SHA (`list_deployments`). For each shipped entry, resolve its thread
   with a one-line reply saying it is live on staging. Set `status: shipped`.
4. Delete the remote builder branches that merged. Never delete `staging`, `main` or another person's branch.

## 8. Close
- Add 0 to 3 `lessons` to the sprint file (what went wrong, one line each), commit it to `staging` through the
  next sprint's PR (or a one-file `fix/` PR if none follows).
- Tell the principal in one short message: shipped entries, parked entries, dropped entries, owner steps, total
  tokens if the harness reported them. Then stop.

## Release (when the principal types "release")
Open or refresh the PR `staging` to `main` titled `Release <yyyy-mm-dd>`: the staging alias, the routes to check,
what changed (one line per sprint PR) and owner steps. Only the principal merges it.

## Rules
- Never merge into `main`, force push, rewrite history, or update or delete rows in `odds_snapshots` or `estimates`.
- One writer per file: builders write only in their worktree and their `ops/sprint/traces/<entry-id>.md`; only this
  session edits the sprint file.
- A key or critical judgement found mid-sprint becomes a parked entry, never a guess.
