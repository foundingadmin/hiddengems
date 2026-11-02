# Calendar
> Source: https://vercel.com/geist/calendar (captured 2026-11-02)

## Purpose
A popover date / date-range picker with presets, min/max bounds and timezone handling.

## Anatomy
- Trigger showing the chosen range. Popover with month grid(s), optional preset list, optional time input, timezone select (or pinned read-only timezone), clear control.

## Variants & sizes
- `size`: `medium` (default) | `small`.
- Layout: default, `compact`, `stacked`, `horizontalLayout`.
- `presets: { key: { text, start, end } }`, `presetIndex` (default preset).
- `minValue`, `maxValue`, `allowClear`, `showTimeInput`, `popoverAlignment` (e.g. `center`), `pinnedTimezone` (e.g. `America/Los_Angeles`).
- `value` / `onChange` take a `RangeValue<DateValue>`.

## States
Empty, range selected, preset active, out-of-bounds days disabled, popover open or closed.

## Tokens
Not specified by Geist. `text-label-12` is noted for "capitals in Calendars" (typography page).

## Rules
- Use for analytics ranges where weekday and month context matter. Use a free-form Input for pasted ISO dates or `7d` shorthand.
- Provide presets for common ranges (`Last 7 Days`, `Month to Date`).
- Use horizontal layout next to live results. Use stacked in narrow sidebars.
- Bound `min` / `max` to the data retention window.
- Default to the user's locale and timezone. Never silently render UTC.
- The trigger shows the committed range (`Apr 1 – Apr 28, 2026`). Keep the range when reopening.
- Trap focus. Arrows move by day, Shift+arrow by week, PageUp/PageDown by month. Announce range changes politely. Presets are real buttons with Title Case labels.

## Hidden Gems usage
- **Historical results / backtest range** with presets `This Week`, `Last 4 Weeks`, `Season to Date`, bounded to seasons in the database.
- Kickoff windows in the live slate are better as FilterParams `date-range` presets.
- Pin timezone only if the product standardizes on ET for NFL kickoffs. Otherwise follow the user's timezone (Geist default).
