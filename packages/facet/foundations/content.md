# Content

Lessons for every heading, label and sentence in a Facet product. The living version is the Content guide, `preview/content.html`.

## Say it once

A tab, heading, label, column header, icon or control has already told the reader something. Everything after it builds on that instead of saying it again.

**One question before every line:** what does the reader already know from what sits above and around this? If the new text only restates it, cut it, or rewrite it until it adds something. This applies to headings, labels, notes, captions, tooltips, placeholders and empty states.

### Where repeats hide

| Pattern | Don't | Do |
|---|---|---|
| A tab, then a heading that says the tab again | Tab "Signals", then a panel heading "Signals" | Tab "Signals", then the panel starts with its content |
| A note label the sentence repeats | "Charts. A chart that plots verdicts uses the signal colors." | "A chart that plots verdicts uses the signal colors." |
| A placeholder that echoes its label | Label "Stake", placeholder "Stake" | Label "Stake", value or example "$7.00", helper "From $1 to $50" |
| A value every row repeats | A Market column reading "Anytime TD" on every row | One group row "Anytime TD" above the picks |
| An empty state that says nothing twice | "No picks yet" / "There are no picks to show yet." | "No picks yet" / "Odds open Tuesday. The slate fills in as lines post." |
| A tooltip that reads the button back | "Refresh odds" with tooltip "Refresh odds" | "Refresh odds" with tooltip "Last pulled 2m ago", or no tooltip |
| A badge next to text that says the same | Job "Gems, and only gems" beside a "Gems only" badge | Keep one |
| A caption that repeats its heading | Heading "Semantic tokens", caption "All semantic color tokens" | Visually hidden caption for screen readers only |

### When repeating is right

- **Confirmations.** The button repeats the dialog's verb, so the action is unmistakable ("Remove this pick?" then "Remove pick").
- **Screen readers.** An accessible name may restate what sighted readers get from layout (a signal strip reads "5 go, 1 wait").
- **The record.** An audit table may hold values shown earlier, at lower prominence, for exact lookup.

## Earn every line

If a line disappeared, would the reader understand less? If not, cut it. "Say it once" stops repeats; this stops filler. Each example below was cut from the specimen itself.

| Pattern | Don't | Do |
|---|---|---|
| A lede that describes the layout below it | "Each band is a hue's whole contract: its job, its scale and its tokens." | Cut; keep only the rule the layout can't show |
| A reason nobody asked for | "...borrows the signal colors, since that is their job." | "...borrows the signal colors." |
| A line that sells instead of informs | "Each one removes a review step, because the page gets it right the first time." | Cut |
| A second sentence that restates the first | "Burke's setup is unchecked. Snap share and role are unknown." | "Burke's snap share and role are unchecked." |
| A caption that narrates an example | A Do example captioned "Purple marks a gem and its tier." | The example alone |
| A number already printed beside it | "Controls come in three heights, 32, 36 and 40." above buttons labelled 32 and 36 | The labelled buttons alone |

### What always stays

- **Disclosures**, such as "Sample data from the Week 8 prototype".
- **Caveats that change a reading**, such as "Samples are 3 to 7 games, so gaps are directional".
- **Definitions shown nowhere else**, such as what "gap" means the first time it appears.
- **The why on a Don't.** A Do speaks for itself; a Don't needs its reason.

## Headlines that last

Name the purpose in simple, objective words, and let the content carry the specifics.

- A headline built from today's data goes stale the moment the data changes. Don't: "Gesicki carries the widest gap on a seven pick, $50 slate". Do: "Picks, ranked and explained".
- A headline that lists what is inside needs rewriting every time the section grows. Don't: "Gray by default, and every hue has one job". Do: "Every hue earns its place".
- A colon splits one idea into two weaker ones. Don't: "Color: ten step scales, verbatim". Do: "Ten steps for every hue".

Data-driven statements ("Gesicki carries the widest gap") belong in the content itself, generated from the data, where they update with it.

## One word family

Labels that sit together and describe the same thing share one root word, so the reader links them without thinking. Dense screens are read in glances; every new word is a small question ("is a wager a bet?"), and one root per idea answers it before it is asked.

**Ask before every label:** does a word nearby already name this idea?

| Pattern | Don't | Do |
|---|---|---|
| A run, its column and its result | Run now, Last run, "Took 4.1s" | Run now, Last run, "Ran 4.1s" |
| A connection and its states | Connect, Linked, Unlink | Connect, Connected, Disconnect |
| A data action and its record | Refresh odds, last fetched 2m ago, sync failed | Pull odds, last pulled 2m ago, pull failed |
| A bet from button to toast | Track bet, "Wager saved" in Logged picks | Track bet, "Bet tracked" in Tracked bets |

Hidden Gems roots: **pull** (odds data in), **run** (a scheduled job), **track** (a bet you placed), **connect** (a book or provider). Reloading a view is not a pull; it is "Reload".

## Undo, Cancel and Reset

Three words that all seem to mean "go back". Each has one job.

| Word | What it does | Where it appears | Confirm? |
|---|---|---|---|
| **Undo** | Takes back your own changes: unsaved edits since the last save, or an action you just completed | A form footer while it has unsaved edits (beside Save); a toast after an action ("Pick removed. Undo") | No |
| **Cancel** | Leaves a flow without doing it. Nothing changes, and whatever opened closes | Dialogs, sheets, confirmations and multi-step flows, beside the flow's main verb | No |
| **Reset** | Returns settings to Hidden Gems defaults, discarding saved values too | A section menu or the danger zone, always as "Reset to defaults" | Yes, it is a destructive verb |

- A form that stays on screen never says Cancel: there is no flow to leave, only edits to take back.
- Undo never appears without something to undo; Reset never appears where Undo would do.

### When to ask for confirmation

Prefer undo to confirm. A confirmation interrupts every time; an undo costs nothing unless it is needed. Confirm only when an action cannot be taken back, or its effects reach beyond this screen.

| Level | When | How | Examples |
|---|---|---|---|
| **None** | The opposite action reverses it | Act at once | Toggle, filter, sort, Pause and Resume, Run now, Save (edit again to change), Track bet |
| **Undo toast** | One item removed that can be restored | Act at once, then a toast "Pick removed. Undo" that stays until the next action or 8 seconds | Remove a pick from the watchlist, dismiss an alert, untrack a bet |
| **Confirm dialog** | It cannot be undone, or it changes something outside Hidden Gems | A dialog naming the consequence; Cancel is focused, the button repeats verb and object | Disconnect FanDuel (pulls stop), Rotate key (the old key stops working), Reset to defaults |
| **Typed confirmation** | It permanently deletes data, or many items at once | The dialog asks you to type the name before the button enables | Delete bet history, Delete all tracked bets |

- The dialog says what will happen, not "Are you sure?": "FanDuel odds stop updating until you reconnect."
- The confirm button repeats the verb and object ("Disconnect FanDuel"), never "OK" or "Yes".
- Never confirm and offer undo for the same action; pick the level that fits.

## Marking right and wrong

Use the guide marker (`.fc-guide`, see `components/guide-marker.md`) for every Do and Don't. It is neutral by default: a gray check or cross plus the word. Add color (`data-critical`) only where misuse breaks the system, such as the hue allocation. If it appears everywhere, nobody sees it.

## House style

| Topic | Rule |
|---|---|
| Case | Sentence case for headings, labels and buttons. Every sentence and sentence-like fragment starts with a capital, including detail lines ("Timed out after 30s") and examples quoted in docs |
| Titles | No colons in titles, headings or nav labels |
| Dashes and semicolons | No em dashes, anywhere. No semicolons in UI copy: split the sentence or use a comma |
| Hedges | Cut "FYI", "Heads up" and "Note" |
| Notes | One sentence, active voice, naming the impact. An optional 1 to 2 word label names the topic and is never repeated by the sentence |
| Numbers | Peer values share precision. A lone value keeps its unit beside it ("+4.0 pts"). In a column of mixed metrics the word unit moves to the label ("Average gap (pts)"), symbols that are part of the number stay ($, %), and changes are percent with the exact change in a helper |
| Verbs | One root per idea everywhere: if the button says Remove, the menu item, toast and confirmation say Remove too. Neighboring labels share it (Run now, Last run, Ran 4.1s) |
| Durations | Compact units in values, no space: "4.1s", "in 5m", "3h ago", "in 1d 6h" (`js/time.mjs`). Words in sentences: "Every 5 minutes", "Timed out after 30 seconds". A bare duration gets its context word: "Ran 4.1s" |
| Separators | At most one middle dot per metadata line; use columns in tables |
| Times | Clock and calendar times in mono, relative times in sans (`data-relative`). Relative under 7 days ("2m ago"), a date after that, the exact time on hover. Clock times in a column all carry their day word ("Today 6:00 PM", "Tue 12:00 AM") |
| Errors | Say whose problem it is. Yours to fix: what failed plus the action that fixes it. Out of your hands: who owns it, what happens next and how old the data is. "Couldn't" for user state, "Failed to" for system faults (`patterns/failures.md`) |
| Helpers | A dotted underline means a helper opens on hover, focus or tap; use it instead of info icons, and never for anything else |
| Plain words | Plain words on the fast path, exact terms in the audit path; define a term at first use |
