# Principal decisions

Answers to escalations, newest first. Each binds every agent until the principal changes it. The vice principal adds
an entry the moment the principal decides.

| Date | Decision | Context |
|---|---|---|
| 2026-11-03 | One run builds one release: the principal reviews the single staging preview and comments there; agents build on task branches; verified PRs merge into `staging`; the principal merges the release to `main`, which ratifies the run and starts the retrospective that enriches directives, lessons and decisions. | Principal's description of the workflow. |
| 2026-11-03 | A perpetual `staging` branch, owned by the vice principal, receives every task PR; only the principal merges `staging` into `main` after reviewing the staging preview. | Replaces the lead session's delegation to merge into `main`. |
| 2026-11-03 | The principal is Titus, the owner; key and critical judgements are listed in `corpus/principal.md`. | Corpus created. |
| 2026-11-03 | Agents work on per-task branches named by lane (`ds/`, `screens/`, `data/`, `copy/`, `fix/`, `agents/`), each with its own PR gated by `pr-verifier`. | Multi-lane work; chosen over one shared branch and long-lived category branches. |
| 2026-11-03 | The app's sign-in gate is off until the principal turns it back on (`APP_LOCK=on`). | The browser prompt got in the way during reviews. |
| 2026-11-03 | Preview comments are tracked as tasks and resolved silently; replies only when a fix is blocked. | Fast preview reviews. |
| 2026-11-03 | Facet gaps become DS requests built in `packages/facet`, never hand-rolled in app CSS. | The design system is the source of every UI decision. |
| 2026-11-03 | Every change with words or UI passes the content and design verifiers before merge. | Stay on brand at speed. |
| 2026-11-02 | The lead session may merge PRs into `main` as it sees fit to keep CI moving. Superseded 2026-11-03 by the staging decision. | Backlog of open PRs. |
| 2026-11-02 | Fool's Gold beats the fair price but not the posted price; the rating uses carat; the opening odds snapshot is Tue 10:07 AM Denver. | Model port. |
