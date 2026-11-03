# Amendments

How a directive (an agent file in `.claude/agents/`) changes.

1. **Proposed.** A lesson (`corpus/lessons.md`), a verifier finding that keeps recurring, or the principal's own
   request leads `corpus-steward` to draft a change to one or more directives.
2. **Judged.** If the change touches a key or critical judgement (`corpus/principal.md`), the principal decides
   before it lands. Other changes, such as clearer steps, a missed check or a better command, `corpus-steward` may
   adopt and report.
3. **Applied.** On an `agents/` branch: edit the directive, bump its version in its file, `MANIFEST.json` and the
   README table (minor for added or clarified steps, major for a changed rule or scope), set `updated`, mark the lesson
   `adopted`, drop it from the manifest's `lessons` map, and add a line to the log below.
4. **Merged.** Through `content-verifier`, then `staging-keeper` (`corpus/brief.md`, gates by tier); a rule or scope
   change also needs the principal.

## Log
| Date | Directive | Version | Change | Source |
|---|---|---|---|---|
| 2026-11-03 | all | 1.0 | Corpus created: manifest, README, principal, decisions, lessons, amendments; `repo-hygiene` added. | Principal request |
| 2026-11-03 | vice-principal | 1.0 | Added: owns `staging` and its preview, presents releases; only the principal merges to `main`. | Principal request |
| 2026-11-03 | vice-principal | 1.1 | Dispatches every step to its owning agent instead of doing operations itself; added `staging-keeper`, `release-manager`, `corpus-steward`. | Principal request |
| 2026-11-03 | facet-curator | 1.0 | Added: after each ratified release, Facet's demo pages, changelog and version catch up. | Principal request |
| 2026-11-03 | pr-verifier | 1.1 | Does not block on PR body footers rewritten by the connector. | L1 |
| 2026-11-03 | design-verifier | 1.1 | Screenshots a middle width (about 1100) as well as 1440 and 390. | L3 |
| 2026-11-03 | all | corpus 1.1 | Token-efficiency overhaul: `corpus/brief.md` replaces reading the README and `principal.md`; each directive names only its lane's docs; `model:` set in every directive; escalation and lesson boilerplate moved to the brief; `lessons` map in `MANIFEST.json`; `For:` line on every lesson. | Principal decision 2026-11-03 |
| 2026-11-03 | vice-principal | 2.0 | Gates by tier; never merges itself; subscribes only to the release PR; fresh session per release; resumes agents for fix rounds; holds reports to the brief's format. | Principal decision; L7, L16 |
| 2026-11-03 | staging-keeper | 2.0 | Runs the PR checklist itself (merge state, CI, house-rule grep, verdicts, owner steps); CI and deployment tools added; stable staging alias. | Principal decision; L6, L7, L9, L10, L11, L17 |
| 2026-11-03 | pr-verifier | 2.0 | Narrowed to heavy-tier and escalated PRs; reads CI on the head and runs `pnpm check` only when it failed or did not run; delta re-checks; backup safety before a migration runs. | Principal decision; L15 |
| 2026-11-03 | content-verifier | 2.0 | Delta re-checks; `content.md` read only for UI copy and Facet docs; a PR body may restate the title for its one change. | Principal decision; L8 |
| 2026-11-03 | design-verifier | 2.0 | Delta re-checks; chart encoding reviewed next to its table, legend keys match their marks. | Principal decision; L14 |
| 2026-11-03 | data-safety-verifier | 2.0 | Delta re-checks; the nightly backup survives an unmigrated table; nothing enables RLS. | Principal decision; L15, L18 |
| 2026-11-03 | model-verifier | 2.0 | Delta re-checks; reads the PRD and `hgs.py` only when the code does not settle a question. | Principal decision |
| 2026-11-03 | screen-builder | 1.1 | Self-check before hand-off (adds the 1100 width, problem states, PR body against `staging`). | Principal decision; L2, L3, L13 |
| 2026-11-03 | data-builder | 1.1 | Self-check before hand-off (backup survives an unmigrated table, "Run without RLS" in owner steps, PR body against `staging`). | Principal decision; L2, L13, L15, L18 |
| 2026-11-03 | facet-builder | 1.1 | Self-check before hand-off (preview link check, chart legends, 1100 width, PR body against `staging`). | Principal decision; L3, L12, L13, L14 |
| 2026-11-03 | release-manager | 1.1 | Model `sonnet`; CI and deployment tools added; stable staging alias; production confirmed by `target=production` and SHA; "Run without RLS" in owner steps. | Principal decision; L10, L11, L17, L18 |
| 2026-11-03 | facet-curator | 1.1 | Model `sonnet`; preview link check in drift; standard-tier gate. | Principal decision; L12 |
| 2026-11-03 | preview-triager | 1.1 | Model `sonnet`; each task carries its tier. | Principal decision |
| 2026-11-03 | repo-hygiene | 1.1 | Model `sonnet`; corpus drift covers the `lessons` map and old wording; tier gate. | Principal decision; L5 |
| 2026-11-03 | corpus-steward | 1.1 | Maintains `For:` lines and the `lessons` map; keeps directives short; tier gate. | Principal decision; L5 |
