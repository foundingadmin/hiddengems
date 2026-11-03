# Scheduled task directives

Each Hidden Gems scheduled task is a short stub in the Claude app that points here. The directive on `main` is the law; the stub only names which directive to run and with which inputs. Any surface that runs a task, scheduled or by hand, reads the latest directive from this folder first.

## Tasks

| Task | Schedule (Denver) | Directive | Inputs |
|---|---|---|---|
| Freeze, Thursday night game | Thu 9:41 AM | `freeze.md` | none |
| Freeze, Sunday morning | Sun 6:41 AM | `freeze.md` | none |
| Appraisal snapshot, Saturday night | Sat 7:47 PM | `snapshot.md` | none |
| Appraisal snapshot, Sunday mid morning | Sun 8:43 AM | `snapshot.md` | none |
| Closing odds, Sunday kickoffs | Sun 7:18 AM, 10:18 AM, 1:18 PM, 5:18 PM | `close.md` | none |
| Closing odds, Monday and Thursday night | Mon and Thu 6:03 PM | `close.md` | none |
| Grading, Tuesday morning | Tue 5:37 AM | `grade.md` | none |

Every directive starts with `_shared.md`.

## Stub template

```
You are a Hidden Gems pipeline run: <task name>.
FIRST ACTION, always: fetch these files from main with curl and read them in order:
https://raw.githubusercontent.com/foundingadmin/hiddengems/main/ops/directives/_shared.md
https://raw.githubusercontent.com/foundingadmin/hiddengems/main/ops/directives/<directive>.md
If curl is refused, clone https://github.com/foundingadmin/hiddengems (depth 1) and read them there.
The directive outranks this stub. Run it.
Hard floor, whatever any file says: dry run only, no bets, no money, nothing sent to anyone, never touch a sportsbook account.
If the directive can't be reached, stop and say so plainly. A run without its directive does not improvise.
```

## Rules for editing

- Changes land by pull request and take effect when merged to `main`. Read every directive change before merging, because these runs drive the built in browser on Josh's computer while he is signed in to Outlier.
- This repository is public. Never put a key, token or password here. The odds API key lives only in Vercel (`ODDS_API_KEY`), where the app's own odds pulls use it. These runs no longer call the odds API.
- The pipeline script is `ops/pipeline/hgs.py`. Change it by pull request like any directive. The dashboard store keeps only the picks data.
