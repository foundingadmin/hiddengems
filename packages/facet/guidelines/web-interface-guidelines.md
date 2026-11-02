# Vercel Web Interface Guidelines: Facet digest

A faithful, tightened paraphrase of Vercel's Web Interface Guidelines, kept rule for rule and grouped by the source's own sections. Rule IDs (for example `INT-11`) are Facet additions so components, reviews and lint findings can cite a rule precisely. They are not part of the source.

## Source and capture

| Item | Value |
| --- | --- |
| Canonical repo | https://github.com/vercel-labs/web-interface-guidelines (MIT, "Copyright (c) 2025 Vercel Labs") |
| Files read | `README.md` (human list), `AGENTS.md` (MUST/SHOULD/NEVER list for agents), `command.md` (review checklist used by the `web-design-guidelines` agent skill) |
| Commit captured | `434b7f91364665f2f733b310ec54809bf8f37937`, 2026-10-05 13:49 PDT (merge of PR #29, "desktop overscroll guideline") |
| Last content change | `4ecfb9f`, 2026-10-05, "Add desktop overscroll guideline". Earlier: `51af38a` 2026-08-17 (accessibility and media rules), `d0a657b` 2026-04-06 (`translate="no"` rule) |
| Web mirror | https://vercel.com/design/guidelines (HTML, title "Web Interface Guidelines"). Checked 2026-11-02: contains the newest rules (desktop rubber-banding, verbatim translation shielding), so it tracks the repo. `https://vercel.com/design/guidelines.md` returns 404. |
| Raw text for agents | https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/AGENTS.md and `/command.md` |
| Retrieved | 2026-11-02 |

Notation: **[A]** marks a rule or detail that appears only in `AGENTS.md` or `command.md`, not in the README. Where the files disagree, the conflict is called out.

---

## 1. Interactions

- **INT-01 Keyboard works everywhere.** Every flow is keyboard operable and follows the WAI-ARIA Authoring Practices patterns (https://www.w3.org/WAI/ARIA/apg/patterns/). [A] Interactive elements need key handlers; `<div>`/`<span>` with click handlers should be `<button>`.
- **INT-02 Clear focus.** Every focusable element shows a visible, unobscured focus ring. Prefer `:focus-visible` over `:focus` so pointer users are not distracted; use `:focus-within` for grouped controls. Sticky headers, footers, banners and overlays never cover the focused element. [A] NEVER `outline: none` / `outline-none` without a visible replacement.
- **INT-03 Manage focus.** Trap, move and return focus as the APG patterns prescribe.
- **INT-04 Match visual and hit targets.** If the visual target is under 24px, expand the hit target to at least 24px. On mobile the minimum is 44px.
- **INT-05 Mobile input size.** `<input>` font size is at least 16px on mobile so iOS Safari does not auto-zoom on focus. Conflict: the README also offers `maximum-scale=1` in the viewport meta as an alternative, while `AGENTS.md` and `command.md` list `maximum-scale=1` and `user-scalable=no` as NEVER / anti-patterns. Facet follows the stricter rule: use 16px inputs, never cap zoom.
- **INT-06 Respect zoom.** Never disable browser zoom.
- **INT-07 Hydration-safe inputs.** Inputs must not lose focus or value after hydration.
- **INT-08 Don't block paste.** Never disable paste in `<input>` or `<textarea>` (no `onPaste` + `preventDefault`).
- **INT-09 Loading buttons.** Show a loading indicator and keep the original label.
- **INT-10 Minimum loading-state duration.** For spinners and skeletons, add a short show delay (about 150 to 300 ms) and a minimum visible time (about 300 to 500 ms) so fast responses do not flicker. React `<Suspense>` does this automatically.
- **INT-11 URL as state.** Persist state in the URL so share, refresh and Back/Forward work (for example with nuqs, https://nuqs.dev).
- **INT-12 Optimistic updates.** When success is likely, update the UI immediately and reconcile on the server response. On failure, show an error and roll back or offer Undo.
- **INT-13 Ellipsis for further input and loading states.** Menu items that open a follow-up ("Rename…") and in-progress states ("Loading…", "Saving…", "Generating…") end with an ellipsis.
- **INT-14 Confirm destructive actions.** Require confirmation, or provide Undo with a safe window. Never act immediately.
- **INT-15 Prevent double-tap zoom on controls.** Set `touch-action: manipulation`.
- **INT-16 Tap highlight follows design.** Set `-webkit-tap-highlight-color` intentionally.
- **INT-17 Design forgiving interactions.** Generous hit targets, clear affordances, predictable behavior; reduce finickiness (for example prediction cones on nested menus).
- **INT-18 Tooltip timing.** Delay the first tooltip in a group; subsequent peer tooltips open with no delay.
- **INT-19 Overscroll behavior.** Set `overscroll-behavior: contain` deliberately, for example in modals, drawers and sheets.
- **INT-20 Desktop rubber-banding.** To suppress bounce, set `overscroll-behavior: none` on `<html>` inside `@media (pointer: fine)`. Keep page defaults on coarse pointers so mobile pull-to-refresh survives. `pointer` reflects only the primary input, so test hybrid touch devices separately. `none` also disables scroll chaining and native swipe navigation.
- **INT-21 Scroll positions persist.** Back/Forward restores the prior scroll position.
- **INT-22 Autofocus for speed.** On desktop screens with one primary input, autofocus it. Rarely autofocus on mobile, because the opening keyboard can shift layout. [A] `autoFocus` without clear justification is an anti-pattern.
- **INT-23 No dead zones.** If part of a control looks interactive, it is interactive.
- **INT-24 Deep-link everything.** Filters, tabs, pagination, expanded panels: anywhere `useState` holds user-visible state, consider syncing it to the URL.
- **INT-25 Clean drag interactions.** While dragging, disable text selection and apply `inert` to the dragged element so selection and hover do not fire at the same time.
- **INT-26 Gestures have alternatives.** Every drag, swipe, pinch or path-based action also works with a tap/click control and the keyboard, unless the gesture is essential (WCAG 2.2 Dragging Movements).
- **INT-27 Links are links.** Use `<a>` or `<Link>` for navigation so Cmd/Ctrl+click, middle-click and "open in new tab" work. Never substitute `<button>` or `<div onClick>` for navigation.
- **INT-28 Announce async updates.** Use polite `aria-live` regions for toasts and inline validation.
- **INT-29 Locale-aware keyboard shortcuts.** Internationalize shortcuts for non-QWERTY layouts and show platform-specific symbols.

## 2. Animations

- **ANI-01 Honor `prefers-reduced-motion`.** Provide a reduced-motion variant (or disable). [A] Muted decorative loops must stop under reduced motion.
- **ANI-02 Implementation preference.** Prefer CSS, then the Web Animations API, then JS libraries (for example motion). Avoid main-thread JS animation where possible.
- **ANI-03 Compositor-friendly.** Animate GPU-friendly `transform` and `opacity`. [A] NEVER animate layout properties (`top`, `left`, `width`, `height`).
- **ANI-04 Necessity check.** Animate only to clarify cause and effect, or for deliberate delight.
- **ANI-05 Easing fits the subject.** Choose easing by what changes (size, distance, trigger).
- **ANI-06 Interruptible.** User input can cancel any animation mid-flight.
- **ANI-07 Input-driven.** Avoid autoplay except muted, non-essential loops. Autoplaying motion longer than 5 seconds alongside other content needs pause, stop or hide controls (WCAG 2.2 Pause, Stop, Hide).
- **ANI-08 Correct transform origin.** Anchor motion where it physically starts.
- **ANI-09 Never `transition: all`.** List only the intended properties (usually `opacity`, `transform`).
- **ANI-10 Cross-browser SVG transforms.** Apply CSS transforms to a `<g>` wrapper with `transform-box: fill-box; transform-origin: center;` (works around historical Safari origin bugs).

## 3. Layout

- **LAY-01 Optical alignment.** Nudge by ±1px when perception beats geometry.
- **LAY-02 Deliberate alignment.** Everything aligns to a grid, baseline, edge or optical center. No accidental positioning.
- **LAY-03 Balance contrast in lockups.** When icons and text sit together, adjust weight, size, spacing or color so they do not clash (a thin icon may need a heavier stroke beside medium text).
- **LAY-04 Responsive coverage.** Verify on mobile, laptop and ultra-wide; simulate ultra-wide by zooming out to 50%.
- **LAY-05 Respect safe areas.** Use `env(safe-area-inset-*)` for notches and insets, especially in full-bleed layouts.
- **LAY-06 No excessive scrollbars.** Render only useful scrollbars and fix overflow. Test with macOS "Show scroll bars: Always" to see what Windows users see.
- **LAY-07 Let the browser size things.** Prefer flex, grid and intrinsic sizing over JS measurement, to avoid layout thrash.

## 4. Content (includes accessibility)

- **CON-01 Inline help first.** Prefer inline explanation; tooltips are a last resort.
- **CON-02 Stable skeletons.** Skeletons mirror final content exactly, so nothing shifts.
- **CON-03 Accurate page titles.** `<title>` reflects the current context.
- **CON-04 No dead ends.** Every screen offers a next step or recovery path.
- **CON-05 All states designed.** Empty, sparse, dense and error states. [A] Never render broken UI for empty strings or arrays.
- **CON-06 Typographic quotes.** Prefer curly quotes (“ ”) over straight quotes.
- **CON-07 Avoid widows and orphans.** Tidy rag and line breaks. [A] Use `text-wrap: balance` or `text-pretty` on headings.
- **CON-08 Tabular numbers for comparisons.** Use `font-variant-numeric: tabular-nums` or a monospace such as Geist Mono. [A] AGENTS.md makes this a MUST for number columns and comparisons.
- **CON-09 Redundant status cues.** Never rely on color alone; add text labels.
- **CON-10 Icons have labels.** Convey the same meaning in text for non-sighted users.
- **CON-11 Don't ship the schema.** Layouts may omit visible labels, but accessible names still exist.
- **CON-12 Use the ellipsis character.** `…`, not `...`.
- **CON-13 Anchored headings.** Set `scroll-margin-top` on headings targeted by links.
- **CON-14 Resilient to user-generated content.** Layouts handle short, average and very long content. [A] Text containers use `truncate`, `line-clamp-*` or `break-words`; flex children need `min-w-0` so truncation works.
- **CON-15 Locale-aware formats.** Format dates, times, numbers, delimiters and currency for the user's locale. [A] Use `Intl.DateTimeFormat` and `Intl.NumberFormat`, never hardcoded formats.
- **CON-16 Prefer language settings over location.** Detect language from `Accept-Language` and `navigator.languages`; never from IP or GPS.
- **CON-17 Shield verbatim content from translation.** Wrap brand names, product names, code tokens and identifiers in `translate="no"`.
- **CON-18 Accessible content.** Accurate names (`aria-label`), decoration hidden (`aria-hidden`), verified in the browser accessibility tree.
- **CON-19 Icon-only buttons are named.** Give them a descriptive `aria-label`.
- **CON-20 Semantics before ARIA.** Prefer native `button`, `a`, `label`, `table` before `aria-*`.
- **CON-21 Headings and skip link.** Hierarchical `<h1>` to `<h6>` and a "Skip to content" link.
- **CON-22 Accessible media.** Caption speech and meaningful sounds, provide transcripts for audio-only content, describe essential visuals. Decorative media is hidden from assistive tech; media controls are keyboard operable.
- **CON-23 Brand resources from the logo.** Right-clicking the nav logo can surface brand assets.
- **CON-24 Non-breaking spaces for glued terms.** `10&nbsp;MB`, `⌘&nbsp;+&nbsp;K`, `Vercel&nbsp;SDK`. Use `&#x2060;` (word joiner) when no space is wanted.

## 5. Forms

- **FRM-01 Enter submits.** With a text input focused, Enter submits when it is the only control; with many controls, apply it to the last one.
- **FRM-02 Textarea behavior.** In `<textarea>`, ⌘/Ctrl+Enter submits and Enter inserts a newline.
- **FRM-03 Labels everywhere.** Every control has a `<label>` or an associated accessible label.
- **FRM-04 Label activation.** Clicking a `<label>` focuses its control (`htmlFor` or wrapping).
- **FRM-05 Submission rule.** Keep submit enabled until submission starts; then disable it during the request, show a spinner, and send an idempotency key.
- **FRM-06 Don't block typing.** Even numeric-only fields accept any keystroke and then show validation; silently blocked keys confuse people.
- **FRM-07 Don't pre-disable submit.** Allow submitting incomplete forms so validation feedback appears.
- **FRM-08 No dead zones on controls.** Checkbox/radio and its label share one generous hit target.
- **FRM-09 Error placement.** Errors sit next to their fields; on submit, focus the first error.
- **FRM-10 Autocomplete and names.** Set `autocomplete` and meaningful `name` values for autofill.
- **FRM-11 Spellcheck selectively.** Disable it for emails, codes, usernames and similar (`spellCheck={false}`).
- **FRM-12 Correct types and input modes.** Use the right `type` and `inputmode` for keyboards and validation.
- **FRM-13 Placeholders signal emptiness.** End placeholders with `…`.
- **FRM-14 Placeholder value.** Show an example value or pattern, for example `+1 (123) 456-7890`, `sk-012345679…`.
- **FRM-15 Unsaved changes.** Warn before navigation would lose data (`beforeunload` or a router guard).
- **FRM-16 Password managers and 2FA.** Stay compatible, and allow pasting one-time codes.
- **FRM-17 Don't trigger password managers on non-auth fields.** For inputs like Search, avoid reserved names such as `password`; use `autocomplete="off"`, or a specific token like `autocomplete="one-time-code"` for OTP.
- **FRM-18 Text replacements and expansions.** Trim values, because some input methods append trailing whitespace that would otherwise cause confusing errors.
- **FRM-19 Windows `<select>` background.** Set explicit `background-color` and `color` on native `<select>` to avoid Windows dark-mode contrast bugs.

## 6. Performance

- **PRF-01 Device/browser matrix.** Test iOS Low Power Mode and macOS Safari.
- **PRF-02 Measure reliably.** Disable extensions that add overhead or alter runtime behavior.
- **PRF-03 Track re-renders.** Minimize them and keep them fast (React DevTools, React Scan).
- **PRF-04 Throttle when profiling.** Profile with CPU and network throttling.
- **PRF-05 Minimize layout work.** Batch DOM reads and writes; avoid needless reflow and repaint. [A] No layout reads during render (`getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop`).
- **PRF-06 Network latency budgets.** `POST`/`PATCH`/`DELETE` complete in under 500 ms.
- **PRF-07 Keystroke cost.** Prefer uncontrolled inputs; keep controlled-input loops cheap per keystroke.
- **PRF-08 Large lists.** Virtualize (virtua, https://github.com/inokawa/virtua, or `content-visibility: auto`). [A] Threshold: more than 50 items; a large `.map()` without virtualization is an anti-pattern.
- **PRF-09 Preload wisely.** Preload only above-the-fold images and lazy-load the rest. [A] Below-fold `loading="lazy"`; critical images `priority` or `fetchpriority="high"`.
- **PRF-10 No image-caused CLS.** Set explicit image dimensions and reserve space.
- **PRF-11 Preconnect to origins.** `<link rel="preconnect">` for asset/CDN domains (with `crossorigin` when needed).
- **PRF-12 Preload fonts.** Preload critical fonts to avoid flashes and shift. [A] `<link rel="preload" as="font">` with `font-display: swap`.
- **PRF-13 Subset fonts.** Ship only needed code points/scripts via `unicode-range`, and limit variable axes to what you use.
- **PRF-14 Keep expensive work off the main thread.** Move long tasks to Web Workers.
- **PRF-15 Video over animated GIF.** Use `<video autoplay muted loop playsinline>` for loops, provide a still alternative, honor reduced motion.
- **PRF-16 Safari video-as-image.** For short non-essential loops, add an H.264 MP4 source inside `<picture>` (Safari renders it through the image pipeline; others use the still). Gate the MP4 source with `prefers-reduced-motion`. Use `<video>` when people need controls or the motion is essential.

## 7. Design

- **DES-01 Layered shadows.** Mimic ambient plus direct light with at least two layers.
- **DES-02 Crisp borders.** Combine borders and shadows; semi-transparent borders sharpen edges.
- **DES-03 Nested radii.** Child radius is at most the parent radius, and concentric.
- **DES-04 Hue consistency.** On non-neutral backgrounds, tint borders, shadows and text toward that hue.
- **DES-05 Accessible charts.** Use color-blind-friendly palettes.
- **DES-06 Minimum contrast.** Prefer APCA (https://apcacontrast.com/) over WCAG 2 contrast for perceptual accuracy.
- **DES-07 Interactions increase contrast.** `:hover`, `:active` and `:focus` have more contrast than rest. [A] Buttons and links need a hover state.
- **DES-08 Browser UI matches your background.** Set `<meta name="theme-color">` to the page background.
- **DES-09 Appropriate color-scheme.** Set `color-scheme: dark` on `<html>` in dark themes so scrollbars and native controls contrast correctly.
- **DES-10 Text anti-aliasing and transforms.** Scaling text changes smoothing; animate a wrapper rather than the text node. If artifacts persist, promote the layer with `translateZ(0)` or `will-change: transform`.
- **DES-11 Avoid gradient banding.** CSS masks fading to dark colors can band; use background images instead.

## 8. Rules that exist only in AGENTS.md / command.md

These are additions or sharper restatements; Facet treats them as part of the guidelines.

- **AGT-01 Hydration: controlled inputs.** Inputs with `value` need `onChange`, or use `defaultValue`.
- **AGT-02 Hydration: dates.** Guard date/time rendering against server/client mismatch; use `suppressHydrationWarning` only where truly needed.
- **AGT-03 Content handling.** Long text truncates or wraps; flex children get `min-w-0`; empty strings and arrays never break layout (see CON-05, CON-14).
- **AGT-04 Overflow.** Avoid unwanted scrollbars with `overflow-x-hidden` on containers, but fix the underlying overflow.
- **AGT-05 Images.** `<img>` always has `width` and `height`.
- **AGT-06 Review output format.** Findings grouped by file, `file:line - issue`, terse, no preamble (this is the format the `web-design-guidelines` skill emits).

## 9. Vercel-specific copywriting

The source labels these as Vercel brand and product preferences, not universal rules. Facet adopts most of them; exceptions are noted.

- **CPY-01 Active voice.** "Install the CLI", not "The CLI will be installed".
- **CPY-02 Title Case for headings and buttons** (Chicago style); sentence case on marketing pages. Note: Vercel's own `design.md` and writing guidelines prefer sentence-case headings. Facet decision pending; whichever is chosen, apply it consistently.
- **CPY-03 Clear and concise.** Fewest possible words.
- **CPY-04 Prefer `&` over "and"** (command.md: where space is constrained).
- **CPY-05 Action-oriented language.** "Install the CLI…", not "You will need the CLI…".
- **CPY-06 Keep nouns consistent.** Introduce as few unique terms as possible.
- **CPY-07 Second person.** Avoid first person.
- **CPY-08 Consistent placeholders.** Strings `YOUR_API_TOKEN_HERE`; numbers `0123456789`.
- **CPY-09 Numerals for counts.** "8 deployments", not "eight deployments".
- **CPY-10 Consistent currency formatting.** In one context, show 0 or 2 decimals, never a mix.
- **CPY-11 Space between number and unit.** `10 MB`, ideally `10&nbsp;MB`.
- **CPY-12 Default to positive language.** Frame errors as problem solving. (The source example uses an em dash; Facet copy never does.)
- **CPY-13 Error messages guide the exit.** Say how to fix it: "Your API key is incorrect or expired. Generate a new key in your account settings." Copy and buttons give a clear action.
- **CPY-14 Avoid ambiguity.** Specific labels: "Save API Key", not "Continue".

## 10. Using these with agents (from the source)

- Review skill: `npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines`. It fetches `command.md` fresh on each run and reports `file:line` findings.
- Generation: drop `AGENTS.md` into a project so agents apply the rules while writing UI.
- `command.md` anti-pattern list worth wiring into Facet lint: `user-scalable=no` / `maximum-scale=1`; `onPaste` + `preventDefault`; `transition: all`; `outline-none` without focus-visible replacement; inline `onClick` navigation; clickable `<div>`/`<span>`; images without dimensions; large `.map()` without virtualization; unlabeled inputs; icon buttons without `aria-label`; hardcoded date/number formats; unjustified `autoFocus`; animated GIFs; gesture-only actions.

---

## Hidden Gems emphasis

The 15 rules that matter most for a dense NFL betting research dashboard, with Facet-specific notes. Notes marked "Facet" are our interpretation, not Vercel text.

1. **CON-08 Tabular numbers.** Every odds, line, spread, total, ROI, hit-rate and count column uses `tabular-nums`. Facet: Geist Sans `tnum` only equalizes digits (600 units each); `+` (558), hyphen (419), U+2212 minus (520) and `.`/`,` (201) stay proportional, so right-align numeric columns and reserve a fixed sign slot (or set American odds in Geist Mono) so `+150` and `-110` align. Verified by inspecting the font files; see `reference/vercel-ecosystem.md`.
2. **INT-11 / INT-24 URL as state, deep-link everything.** Week, team, market, sportsbook, sort, column set, filters and the selected game live in search params (nuqs). A shared link reproduces the exact view.
3. **INT-12 Optimistic updates.** Watchlist, pins, saved filters and notes update instantly, reconcile with the server, and roll back or offer Undo on failure.
4. **INT-01 / INT-29 Keyboard everywhere.** Table navigation, filter toggles and a command palette follow APG grid/listbox/combobox patterns; shortcuts show platform symbols and survive non-QWERTY layouts.
5. **INT-02 Focus never hidden.** Sticky table headers, sticky first columns and toolbars must not cover the focused cell. Facet: pair with `scroll-padding-top`/`scroll-margin` equal to the sticky header height.
6. **ANI-01 / ANI-03 / ANI-09 Reduced, compositor-only motion.** Line-movement flashes and row reorders animate only `opacity`/`transform`, list properties explicitly, and degrade to an instant change under reduced motion.
7. **CON-09 + DES-05 Redundant status cues, accessible charts.** Line moves, value edges and win/loss never rely on green/red alone: add arrows, signs or text, and use color-blind-safe chart palettes.
8. **PRF-08 Virtualize large lists.** Any table that can exceed 50 rows (props, historical lines, player logs) is virtualized or uses `content-visibility: auto`.
9. **CON-02 + INT-10 Stable skeletons with minimum duration.** Skeletons match final row height and column widths; background refetches do not flash a spinner (show delay plus minimum visible time).
10. **INT-28 Announce async updates politely.** Toasts and validation use polite `aria-live`. Facet: never announce every odds tick; announce only user-relevant summaries (for example "3 lines moved on your watchlist").
11. **CON-15 + AGT-02 Locale-aware, hydration-safe time.** Kickoff times, timestamps and currency use `Intl.*` in the viewer's time zone, guarded against server/client mismatch.
12. **CON-05 + CON-04 All states designed, no dead ends.** Empty (no games this week), sparse (early-week markets), dense (Sunday slate), stale-data and error states each offer a next step.
13. **CON-14 + AGT-03 Resilient content.** Long player names, team abbreviations and sportsbook names truncate cleanly (`min-w-0`, `truncate`) with the full value available on focus/hover.
14. **CON-20 Semantics before ARIA.** Data grids start from a native `<table>` with `<th scope>`; add ARIA grid roles only when interactive cell navigation needs them.
15. **INT-04 + DES-07 Targets and interaction contrast in dense rows.** Compact rows still give controls at least a 24px hit area, and hover/active/focus states raise contrast over rest so the active row is unmistakable.
