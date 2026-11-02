# Settings
> Source: rank 1 dashboard captures, 2026-11-01 (`reference/inbox-review-2026-11-02/02-dashboard-settings.md`). Facet build `[F]`, CSS in `css/settings.css`, demo in `preview/screens.html#settings`.

How Hidden Gems lays out, saves and protects its settings.

## Layout
```html
<div class="fc-settings">
  <nav class="fc-settings-nav" aria-label="Settings sections">
    <ul role="list">
      <li><a class="fc-settings-nav-item" href="/settings/general">General</a></li>
      <li><a class="fc-settings-nav-item" href="/settings/schedules" aria-current="page">Schedules</a></li>
      …
    </ul>
  </nav>
  <div class="fc-settings-main">…setting cards…</div>
</div>
```
| Part | Measure |
|---|---|
| `.fc-settings-nav` | 256 wide (`--fc-settings-nav-width`, proposed), sticky (`--fc-settings-top` sets the offset under a top bar) |
| `.fc-settings-nav-item` | 36 tall, 14/20, text only. Rest secondary, hover `--fc-surface-fill`, current `--fc-surface-fill-hover` + primary, `aria-current="page"` |
| `.fc-settings-main` | Centered column, max 912 (`--fc-measure-settings`, proposed), 24px top padding, 32px between cards, hairline on its left edge |

- **One route per section.** Each nav item is its own page (`/settings/schedules`, never `#schedules`), so a section fits on one or two screens and needs no in-page contents (INT-11).
- **No page title on card pages.** The current nav item and the top bar breadcrumb name the section; the first card starts the content. List pages (Activity) use the title form of `.fc-page-header` instead.
- **Narrow (under 768px of layout width).** The section list becomes one row that scrolls sideways above the column; scroll the current item into view on load.
- **Inside `.fc-shell`.** Prefer drilling the shell's rail into Settings and using `.fc-settings-main` alone, so the screen never shows two navigation columns. Use the full `.fc-settings` layout only where there is no rail.

Hidden Gems sections, in order: General, Data providers, Sportsbooks, Schedules, Alerts, Bankroll, Activity, Security, Danger zone.

## The setting card
A setting card is a `.fc-fieldset`. Use a `<form>` when it saves, or a `<section>` when it is read-only or holds a single immediate action. `css/settings.css` adds these parts without changing `components.css`.

| Part | Use it for |
|---|---|
| `.fc-fieldset-header` | Title and subtitle on the left; one badge, status (dot + word) or control on the right |
| `.fc-fieldset-consequence` | The sentence that says what changes when the control flips, in primary text, 8px under the subtitle |
| `.fc-fieldset-fields` | Related controls side by side (frequency, start, end); stacks on narrow screens |
| `.fc-fieldset-section` | A sub-section of the same card, ruled edge to edge, 20px padding; a direct child of `.fc-fieldset` after `.fc-fieldset-content` |
| `.fc-fieldset-toggle` | A large toggle (`data-size="large"`) and its state word ("Running", "Paused"). The title names the setting, so the toggle uses `aria-labelledby` on the title and the word carries state |
| `.fc-fieldset-value` | A read-only machine value (masked key, ID) in mono, joined to its action ("Rotate key") |
| `.fc-fieldset-status` | The footer's left slot: one of the four kinds below, or empty |
| `.fc-fieldset-actions` | The footer's right slot; `.fc-fieldset-cancel` on the Cancel button |

## Save model
- **Each card saves on its own.** Save in one card never commits another. There is no page-level save bar and no global dirty state.
- **Save is disabled until the card is dirty.** Render `disabled` on the footer's primary small button; enable it when any value differs from its saved value, and disable it again when the reader changes it back.
- **Cancel exists only while the card is dirty.** Set `data-dirty` on the `.fc-fieldset`; `.fc-fieldset-cancel` is hidden without it. Cancel restores the saved values.
- **Toggles inside a card are staged** and saved with the footer button. A toggle outside any card (a toolbar) persists on change with a toast. Never mix the two models in one card.
- **Derived values update while dirty.** If a value has a consequence (requests per month, next run times), show the new consequence before Save.
- **Leaving with unsaved changes** asks first (router guard or `beforeunload`, FRM-15).
- **Saving failed** turns the card `data-type="error"` with the reason in the footer; field errors sit under their fields (FRM-09).
- After saving, announce "{card title} saved" through a polite live region. The footer status slot is not used for confirmations.

## Footer status kinds
The left side of a card's footer holds exactly one of these, or nothing. Never a restatement of the title, never filler.

| Kind (`data-kind`) | Says | Hidden Gems example |
|---|---|---|
| `docs` | Where the doc answers a question, named by the question, `--fc-text-link` + arrow | "Where to find your key" |
| `scope` | What the change leaves untouched, or whether it can be undone | "Picks, settings and API keys are kept." |
| `inheritance` | Where the value comes from and where to change it, linking that setting in primary underlined text | "Runs after every odds pull. To change it, edit the game day schedule." |
| `quota` | What it costs or how much of a limit it uses, tabular figures, projected values called projected | "Projected 17,472 of 20,000 monthly requests." |

A card with nothing useful to say keeps the footer for its button alone. A read-only card keeps the footer for its status alone.

## Destructive actions
- Destructive cards go last on their page, or on their own Danger zone page, in rising severity: neutral, then `data-type="warning"` (reversible: pause, disconnect), then `data-type="danger"` (irreversible: delete).
- **`data-type="danger"`**: red ring (`--fc-status-error-border`), red-tinted footer, red action (`.fc-button[data-variant="error"]`). `data-type="error"` stays reserved for a failed save.
- The description lists everything that goes. A `.fc-fieldset-entity` preview shows exactly what will be removed (neutral `.fc-icon-tile`, name, one meta line with counts and the last change).
- The footer uses the `scope` kind to say what is kept.
- The button names verb and object ("Delete history", "Disconnect FanDuel") and opens the typed confirmation modal (`components/misc.md`) with Cancel focused (INT-14). Never act on the first click.
- In a row that edits in place, Remove sits on the left and Cancel + Save on the right, so the destructive verb is never beside Save.

## Copy
- Card titles name the setting ("Game day schedule"), not the action, except destructive cards, which name the action.
- Subtitles say what the setting does in one sentence. The consequence line says what changes. Neither restates the title.
- Buttons: a bare verb when the card names the object ("Save", "Rotate key" names a different object). Verb + noun for destructive, paid or toolbar actions.
- Status words are fixed per object: Connected, Not connected, Failed, Paused, Running.
- Clock and calendar times are mono (`.fc-timestamp`, "Oct 2", "6:00 PM"); relative times ("2 min ago") add `data-relative` and stay sans. The exact timestamp goes in `title`. Machine values are mono: cron (`*/5 9-22 * * 0,1,4`), masked keys (`•••• 3f9a`), IDs.
- Keys are never shown again after saving: masked, last four visible, with "Added Oct 2, last used 2 min ago".

## Hidden Gems pages
- **Schedules.** "Odds pulls" kill switch (consequence line, scope footer "Refresh odds on the slate still works while paused."). "Game day schedule" (last run status in the header; frequency, start, end; days; next runs and cron; quota footer). "Line movement checks" (disabled frequency, inheritance footer).
- **Data providers.** One card per provider: status in the header, masked key + Rotate key, docs footer. An unconnected provider takes a key input, Save, and its quota in the footer.
- **Danger zone.** "Disconnect FanDuel" (warning) and "Delete bet history" (danger, entity preview "Tracked bets, 42 bets, Weeks 1 to 8").
