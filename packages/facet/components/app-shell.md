# App shell
> Source: rank 1 dashboard captures, 2026-11-01 (`reference/inbox-review-2026-11-02/01-dashboard-monitoring.md`, section 1). Facet build `[F]`, CSS in `css/shell.css`.

## Purpose
The frame every Hidden Gems screen sits in: a left rail for navigation, a thin top bar for scope and global actions, and a main column for the page. The top bar never changes shape, so the reader always finds the week and the page in the same place.

## Anatomy
```html
<div class="fc-shell">
  <aside class="fc-sidenav" id="nav" aria-label="Main navigation">
    <div class="fc-sidenav-head">…app mark + name…</div>
    <nav class="fc-sidenav-level" id="nav-top" aria-label="Main">
      <ul class="fc-sidenav-list" role="list">
        <li><a class="fc-sidenav-item" href="/slate" aria-current="page"><svg …/><span>Slate</span></a></li>
        <li><button class="fc-sidenav-item" type="button" data-drill="nav-data"><svg …/><span>Data</span><svg class="fc-sidenav-item-end" …/></button></li>
      </ul>
      <hr class="fc-sidenav-rule">
      …
    </nav>
    <nav class="fc-sidenav-level" id="nav-data" aria-labelledby="nav-data-t" hidden>
      <div class="fc-sidenav-back"><button class="fc-button" data-variant="tertiary" data-size="small" data-shape="square" aria-label="Back to main navigation">…</button><span id="nav-data-t">Data</span></div>
      <p class="fc-sidenav-label">Ingestion</p>
      <ul class="fc-sidenav-list" role="list">…</ul>
    </nav>
    <div class="fc-sidenav-foot">…freshness status…</div>
  </aside>
  <div class="fc-shell-main">
    <header class="fc-topbar">
      <div class="fc-topbar-start">
        <button class="fc-button fc-shell-toggle" data-variant="tertiary" data-size="small" data-shape="square"
                aria-expanded="false" aria-controls="nav" aria-label="Navigation">…menu / x icons…</button>
        <div class="fc-scope">…scope switcher…</div>
      </div>
      <nav class="fc-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/data">Data</a></li><li><span aria-current="page">Odds pulls</span></li></ol></nav>
      <div class="fc-topbar-actions">…one or two tertiary buttons…</div>
    </header>
    <main class="fc-shell-content">…page header, then content…</main>
  </div>
</div>
```

| Part | Measure | Notes |
|---|---|---|
| `.fc-sidenav` | 232 wide (`--fc-shell-sidenav-width`, proposed), full height, sticky | Right hairline `--fc-border-default` |
| `.fc-sidenav-item` | 32 tall (`--fc-control-small`), 8px inline padding, radius 6, 16px icon | Rest `--fc-text-primary`; hover `--fc-surface-fill`; current `--fc-surface-fill-hover`. Never a colored rail |
| `.fc-sidenav-rule` | 1px, full bleed | Separates groups at the top level, where groups have no names |
| `.fc-sidenav-label` | 12/16 medium, secondary, 20px above, sentence case | Names groups inside a drilled-in section. Smaller, grayer and unhoverable, so it never reads as a link (owner feedback). Never uppercase |
| `.fc-sidenav-back` | 32px back button, centered section title | Replaces the rail's top level |
| `.fc-topbar` | 48 tall (`--fc-shell-topbar-height`, proposed), bottom hairline, sticky | Three slots: start (scope), center (breadcrumb), end (actions) |
| `.fc-scope` | 32 tall trigger, 500 14/20 name + up/down chevrons | Opens a `.fc-dropdown` |
| `.fc-breadcrumbs` | 14/20, parents secondary, current primary, `/` separators | Separators are generated with empty alt text, so screen readers skip them |
| `.fc-dropdown` | `material-menu` surface, 6px inset, 36px rows, min 220 wide | Shared by the scope switcher and the page header overflow button |

## Variants and states
- **Top level and drill-in.** One `.fc-sidenav-level` is visible at a time. An item with a trailing chevron drills in; the back button returns. Move focus to the back button on drill-in and back to the drilling item on return (INT-03).
- **Narrow (shell under 768px).** The rail leaves the grid. `.fc-shell-toggle` appears and opens the rail as a top sheet under the top bar (`data-nav="open"` on `.fc-shell`, `aria-expanded` on the toggle). Escape and choosing an item close it. Items grow to 40px for touch (INT-04). `.fc-topbar-label` text becomes visually hidden, so labelled actions turn into square icon buttons that keep their names.
- **Very narrow (under 480px).** The breadcrumb keeps only the current page.
- **Embedded (`data-embedded`).** For docs and previews: framed with `--ds-shadow-border` and radius 12, nothing sticky. The narrow layout is a container query on the shell, so an embedded shell collapses by its own width.

## Scope switcher
The scope is the thing every page on the screen is filtered by. In Hidden Gems it is the week.
```html
<div class="fc-scope">
  <button class="fc-scope-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="week-menu"><span>Week 8</span><svg …chevrons-up-down/></button>
  <div class="fc-dropdown" role="menu" id="week-menu" aria-label="Week" hidden>
    <button class="fc-dropdown-item" role="menuitemradio" aria-checked="false" tabindex="-1"><span>Week 9</span><span class="fc-dropdown-item-detail">Opens Tue</span></button>
    <button class="fc-dropdown-item" role="menuitemradio" aria-checked="true" tabindex="-1"><span>Week 8</span></button>
    <hr class="fc-dropdown-rule">
    <div class="fc-dropdown-label" role="presentation">Settled</div>
    …
  </div>
</div>
```
- Keyboard: Enter, Space or Down opens on the checked item; Up opens on the last. Up/Down move, Home/End jump, typing a letter jumps by first letter, Enter selects, Escape closes and returns focus to the trigger, Tab closes (INT-01, INT-03).
- The checked option shows a check (drawn by CSS from `aria-checked="true"`).
- A value every option shares goes in a `.fc-dropdown-label` group heading ("Settled"), not on every row.
- The week lives in the URL (`?week=8`), never only in client state (INT-11, DESIGN.md rule 10).

## Rules
- The top bar holds scope, page identity and at most two global actions. Search lives there as an icon button or in the rail; page actions belong in the page header.
- The rail holds 5 to 12 items per level. Past that, drill in.
- Top bar and rail stay gray. Color in the shell appears only in status dots (the rail's freshness line) and links.
- Pages under a monitoring-style top bar drop their H1; the breadcrumb names the page. Pages that teach keep the title form of the page header.
- Every flex and grid child in the shell sets `min-width: 0`; long names truncate with an ellipsis.

## Hidden Gems usage
- Rail top level: Slate, Watchlist, History | Alerts, Data | Settings. Data drills in to Ingestion (Odds pulls, Injury reports, Sources) and Health (Schedules, Activity).
- Rail foot: freshness, "Odds pulled 2m ago" (status dot + relative time, exact timestamp in `title`).
- Scope switcher: the week, with Week 9 ("Opens Tue"), the current week, then a Settled group.
- Breadcrumb: "Slate", or "Data / Odds pulls", or "Slate / Mike Gesicki receiving yards" on a pick.
- Global actions: "Track bet" and Search.

## Edge glint
Nothing flies to the Slips tab (`patterns/moments.md`, rule 6); the tab answers an add with a glint. Hooks, CSS only:
- `.fc-tabbar` sets `--fc-glint-edge: top`; `.fc-sidenav-item` sets `bottom`. `js/dots.mjs` ripples dots along that
  edge from the answering item.
- While it plays, the item carries `data-glint`: a tab bar link lifts to primary, a rail item takes the hover fill.

## Accessibility
Landmarks: `aside` labelled "Main navigation", one `nav` per level, `nav` "Breadcrumb", `header`, `main`. Current page uses `aria-current="page"` in both the rail and the breadcrumb. Focus rings come from `--ds-focus-ring` (INT-02). Open and close motion is opacity plus transform only and stops under reduced motion (ANI-01).
