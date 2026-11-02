# Failures

> Facet pattern `[F]`, owner decisions 2026-11-02. CSS in `css/charts.css` (`.fc-chart[data-ghost]`, `.fc-chart-empty[data-kind]`); demo in `preview/index.html#charts` ("When data fails").

Every failed or broken state answers two questions: whose problem is it, and what happens next.

## Two kinds

| | Yours to fix | Out of your hands |
|---|---|---|
| When | Your key, setting, connection or input caused it | A provider, book or Hidden Gems itself is down |
| Status | Red dot + "Failed" | Amber dot + "Provider down" (or "Delayed") |
| Headline | "Couldn't" + what failed: "Couldn't pull FanDuel odds" | Who owns it: "SportsDataIO is down" |
| Detail | The cause, in one sentence | "Nothing to fix on your side", what Hidden Gems is doing (retrying, on what schedule) and how old the data on screen is |
| Action | Required: the button that starts the fix ("Rotate key", "Reconnect", "Edit schedule"), primary style | Optional: a tertiary link to follow it ("Provider status", "Notify me"). Never a fix button |

If a failure has no action the user can take and no owner to name, it is not ready to ship: find one or the other.

## Ghost

An empty or failed chart draws a blurred, gray sample of its shape under the message (`data-ghost` on `.fc-chart`), so the reader sees what the chart shows when it works while the message keeps focus. The sample is blurred past reading, never colored and never labelled. Reduced transparency drops the blur for a faint flat sample.

## Copy

- "Couldn't" for your state, "Failed to" for system faults in logs (`foundations/content.md`).
- Times in the message are mono (`<time>`).
- One headline, one sentence of detail, one action. The status word never repeats the headline.
