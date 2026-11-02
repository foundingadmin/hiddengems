# Sheet
> Source: https://vercel.com/geist/sheet (captured 2026-11-02)

## Purpose
A side panel that slides in from a screen edge to show detail while the underlying page stays usable.

## Anatomy
- `Sheet` (`modal`) > `SheetTrigger asChild` + `SheetContent` (`side`, `noOverlay`) > `SheetHeader` (`SheetTitle`, optional subtitle) + `SheetDescription` + `SheetFooter` (`SheetClose asChild`, actions).

## Variants & sizes
- `side`: `top` | `right` | `bottom` | `left`.
- `modal` (default `false` per best practices), `noOverlay`.
- Width is not a prop. The "front apps" demo styles it as an inset floating panel: 12px margin, 16px radius, `lg:w-[512px]`, background `--ds-background-100`, 24px header and footer padding.

## States
Closed, open, dismissed (explicit close or Escape; outside click does **not** close).

## Tokens
`--ds-background-100`, `text-copy-14`, `--ds-gray-900` (subtitle). Inferred: `material-fullscreen` (16px radius) or `material-modal`, matching the demo's 16px corners.

## Rules
- Use for persistent related context (log row inspection, details) where the page stays useful. Use Modal for blocking decisions and Drawer for mobile bottom sheets.
- Never for destructive confirmation.
- Keep `modal=false` so toasts and high-z elements stay reachable, unless the sheet takes over the screen.
- Pick `side` from the trigger location (row inspector = right, global filter = left). Do not change sides mid-session.
- Always render a visible close button (`Close` or icon with `aria-label="Close"`) and support Escape.
- Title is a Title Case entity name. Body is mostly read-only. Do not repeat the page header.
- Trap focus, return it to the trigger row on close, and set `aria-labelledby` to the title.

## Hidden Gems usage
- **Bet detail inspector (P0)**: `side="right"`, ~512px. Title = market (`Travis Kelce Over 64.5 Receiving Yards`). Contents: Gauge score, Tabs (Overview / Signals / Line History / News), Description list (Book, Line, Odds, Edge, Updated), and footer `Track Bet` + `Open in Sportsbook`.
- Keep the slate interactive behind it (non-modal) so Up/Down row navigation can update the open sheet.
