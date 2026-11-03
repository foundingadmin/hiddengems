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

## Facet implementation `[F]`
Implemented in `css/data.css` as `.fc-sheet`.

```html
<dialog class="fc-sheet" aria-labelledby="sheet-title">
  <header class="fc-sheet-header">
    <div class="fc-sheet-titlebar">
      <div class="fc-sheet-titles">
        <h2 class="fc-sheet-title text-heading-20" id="sheet-title">Mike Gesicki</h2>
        <p class="fc-sheet-subtitle text-copy-14">TE · Anytime TD scorer</p>
      </div>
      <button class="fc-button fc-sheet-close" data-variant="tertiary" data-shape="square" data-size="small" aria-label="Close">…</button>
    </div>
    <div class="fc-sheet-badges">verdict pill, gem tier</div>
  </header>
  <div class="fc-tabs fc-sheet-tabs" role="tablist" aria-label="Pick detail">…</div>
  <div class="fc-sheet-body">tab panels</div>
  <footer class="fc-sheet-footer">secondary, then primary</footer>
</dialog>
```
- Geometry [G]: fixed 12px from the top, right and bottom edges, 16px radius, `min(512px, 100% - 24px)` wide, 24px padding. Surface `--fc-surface-canvas` with `--ds-shadow-modal`. `data-side="left"` mirrors it.
- Open with `showModal()`: the page behind is inert, `aria-modal` is implied, Escape closes, and focus returns to the trigger row (set it explicitly on `close`). The open row keeps `aria-selected="true"`. Facet uses the modal form for pick detail; the non-modal form fits a persistent inspector.
- Backdrop: `::backdrop` with `--ds-overlay-backdrop-color` at `--ds-overlay-backdrop-opacity`. `.fc-sheet-backdrop` covers a non-dialog build.
- The body scrolls (`overscroll-behavior: contain`); the footer stays pinned with a hairline above it. Page scroll locks while the modal is open.
- Tabs follow the APG tabs pattern: arrow keys, Home and End move selection; only the selected tab is in the tab order.
- Motion: slides in 16px over 300ms (`--fc-duration-overlay`, standard easing) with a backdrop fade; none under reduced motion.
- Edge glint hook: `--fc-glint-edge` names the edge facing the page (left; right for `data-side="left"`; top for a full-screen phone sheet). `js/dots.mjs` ripples dots along it as the sheet opens (`patterns/moments.md`), on a stage hosted in the sheet, since a modal sits above the page's stage. While the ripple plays (`data-glint`) the sheet lets its edge dots past its bounds.
- Spring motion, `data-motion="spring"` (the gem sheet): opens from off its side, or from the bottom for a full-screen phone sheet, on `--fc-ease-emphasized` over `--fc-duration-sheet` (460ms), and closes back out on `--fc-ease-exit` over `--fc-duration-overlay` (300ms), no spring. A dialog closes at once, so set `data-closing`, wait for the sheet's own `animationend`, then call `close()`; Escape does the same from the `cancel` event. Reduced motion opens and closes at once.
- Title is the pick, not a sentence. Do not repeat the close action in the footer.

### One scroll with section tabs `[F]`
A detail sheet that reads top to bottom (the Hidden Gems gem sheet) keeps one scrolling body and uses its tabs to
jump, not to swap panels.
- Tabs are links in a `<nav class="fc-tabs fc-sheet-tabs" aria-label="…">` pointing at each
  `<section class="fc-sheet-section" id="…">`. The tab for the section in view carries `aria-current="true"`.
- Sections stack with 32px between them and a hairline above each one after the first; `scroll-margin-top`
  leaves air when a tab jumps.
- Open state lives in the URL (`?gem=<id>`, not a hash), so the sheet can be linked and Back closes it.
- `data-phone="full"` takes the whole screen under 768px, with 16px side padding.
