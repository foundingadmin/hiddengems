# Collapse
> Source: https://vercel.com/geist/collapse (captured 2026-11-02)

## Purpose
An accordion of stacked headings that each open a related section.

## Anatomy
- `CollapseGroup` (`multiple`) > `Collapse` (`title`, `defaultExpanded`, `size`) > content.

## Variants & sizes
- `size="small"`. Default size otherwise. Pixel values **not specified by the reference**.
- `defaultExpanded`. `CollapseGroup multiple` allows several panels open at once (default is one at a time, inferred).

## States
Collapsed, expanded, animated transition.

## Tokens
Not specified. Demo content is `text-copy-16`.

## Rules
- Use for optional, advanced or repetitive content most users skip (FAQ, advanced settings, payload preview). Never collapse primary content.
- A single Collapse for one block. A group for related items. Use Tabs for sibling views.
- Closed by default unless first-time visitors must read it.
- One open at a time for mutually exclusive items. Allow multiple for independent ones.
- Animate the open and close. No nesting deeper than one level.
- Heading is a sentence case topic (`Advanced settings`, not `Show …`). No destructive actions inside a closed panel.
- Trigger is a `<button>` with `aria-expanded` and `aria-controls`. Enter/Space toggles. Keep content in the DOM when closed.

## Hidden Gems usage
- **Methodology** in the Sheet: `How this score is calculated`, `Raw model inputs` (with JsonView inside).
- **Advanced filter settings** on a settings page (`Model weights`).
- Use `size="small"` in dense side panels.


Chevron: trailing, down when collapsed, rotating 180° to up when expanded (see the chevron table in `link-action.md`).

## Facet implementation `[F]`
CSS in `css/components.css` (`.fc-collapse`). Specimen: `preview/index.html#batch2-forms`. Replaces the Logs rail's `.fc-facet-group` wherever a group holds content rather than filter checkboxes (the facet group stays for the filter rail).

### Purpose
One optional group of controls or detail that most readers skip, with its current result on the closed row, so a closed group still answers its question ("Clarity, 71 of 100").

### Anatomy
```html
<details class="fc-collapse" data-size="small">
  <summary>
    <span class="fc-collapse-title">Clarity</span>
    <span class="fc-collapse-value">71 of 100</span>
    <svg class="fc-collapse-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
  </summary>
  <div class="fc-collapse-body">…</div>
</details>
```
- Summary row: title (16/24 500, small 14/20 500), optional trailing value (secondary, tabular, 14 or 13), chevron 16px secondary. Row height 48, small 40. The whole row is the hit target and fills on hover.
- Body: a column with 20px between children, 12px under the summary.
- `.fc-collapse-group` stacks several with one hairline between items and at the group's edges. A lone collapse draws no rules, so it sits inside a fieldset section without doubling its divider.

### States
Closed, open (chevron up), hover (row fill), keyboard focus (focus ring on the summary, INT-02). Open and close animate the height where the browser can size to auto (`interpolate-size`), and snap elsewhere; reduced motion snaps everywhere (ANI-01).

### Rules
- Never collapse primary content: the answer, a verdict, or anything the page exists to show. Collapse only optional, advanced or repetitive parts.
- Native `<details>` and `<summary>`: Enter and Space toggle, the content stays in the DOM, no ARIA needed (CON-20, INT-01).
- The value is a result, not a teaser: the same number the open group adds up to, in the same format. Leave it out when there is none.
- The title is a noun in sentence case ("Clarity"), never "Show clarity".
- No destructive actions inside a closed group.

### Hidden Gems usage
Rating lab, Try a prop: the Clarity group (four sliders) closed by default with the clarity total on its row, `data-size="small"`.
