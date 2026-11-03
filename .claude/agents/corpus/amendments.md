# Amendments

How a directive (an agent file in `.claude/agents/`) changes.

1. **Proposed.** A lesson (`corpus/lessons.md`), a verifier finding that keeps recurring, or the principal's own
   request leads the vice principal to draft a change to one or more directives.
2. **Judged.** If the change touches a key or critical judgement (`corpus/principal.md`), the principal decides
   before it lands. Other changes, such as clearer steps, a missed check or a better command, the vice principal may
   adopt and report.
3. **Applied.** On an `agents/` branch: edit the directive, bump its version in its file, `MANIFEST.json` and the README table
   (minor for added or clarified steps, major for a changed rule or scope), set `updated`, mark the lesson
   `adopted`, and add a line to the log below.
4. **Merged.** Through the normal PR flow with `content-verifier` and `pr-verifier`.

## Log
| Date | Directive | Version | Change | Source |
|---|---|---|---|---|
| 2026-11-03 | all | 1.0 | Corpus created: manifest, README, principal, decisions, lessons, amendments; `repo-hygiene` added. | Principal request |
| 2026-11-03 | vice-principal | 1.0 | Added: owns `staging` and its preview, presents releases; only the principal merges to `main`. | Principal request |
| 2026-11-03 | pr-verifier | 1.1 | Does not block on PR body footers rewritten by the connector. | L1 |
| 2026-11-03 | design-verifier | 1.1 | Screenshots a middle width (about 1100) as well as 1440 and 390. | L3 |
