# Status Dot
> Source: https://vercel.com/geist/status-dot (captured 2026-11-02)

## Purpose
A small colored dot showing where a deployment is in its lifecycle, with an optional text label.

## Anatomy
- Wrapper `inline-flex` with `aria-label` (state name) and `title` (a sentence built from `titlePrefix` + state).
- Dot: 10px circle (`size-2.5`, measured).
- Optional label: `text-label-14`, 8px left margin (measured).

## Variants & sizes
- `state`: `QUEUED` | `BUILDING` | `READY` | `ERROR` | `CANCELED` | `DELETED`. `DELETED` is accepted but not demoed.
- `label` (boolean): shows the sentence-cased state name (`Building`, `Ready`).
- `titlePrefix` (string, default `"This deployment"`): the noun phrase used in the title / accessible label.
- No size prop. The dot is fixed at 10px.
- Dot colors (measured; these are *legacy* reference variables, not `--ds-*`): QUEUED and CANCELED → `--accents-2` (light gray), BUILDING → `--geist-warning` (#f5a623 amber), ERROR → `--geist-error` (#e00 red), READY → `--geist-cyan` (#50e3c2).

## States
- Animated while `BUILDING` or `QUEUED`. Static in terminal states (`READY`, `ERROR`, `CANCELED`, `DELETED`).

## Tokens
Legacy `--accents-2`, `--geist-warning`, `--geist-error`, `--geist-cyan` (measured). Facet equivalents (inferred): gray-500/600, amber-700, red-700, teal-600/700. `text-label-14` for the label.

## Rules
- The reference reserves this for deployment lifecycle only. For other statuses it says to use a `Badge` with the canonical vocabulary. Use `Gauge` for a numeric health value and `Progress` for in-flight work with a known total.
- Do not add a spinner next to an animating dot.
- On polling, only re-render when the state actually changes. Do not flash through intermediate colors.
- Pair with `RelativeTimeCard` when timing matters (`Building · 12s ago`). The dot does not show duration.
- `titlePrefix` is a noun phrase with no verb and no trailing punctuation. In lists, pass the entity name.
- Use `label` only when the dot stands alone. Do not wrap it as `Status: Ready`.
- The component builds its own `aria-label`. Do not override it with a generic one. If adjacent text already names the state, mark the dot `aria-hidden`.

## Hidden Gems usage
- The reference would say odds freshness and line movement are not deployment states, so the strictly correct component is a subtle `Badge`. If Facet still wants a dot for compactness in table cells, define a **Facet extension** (`<StatusDot kind="feed" state="LIVE|DELAYED|STALE|SUSPENDED">`) that keeps the reference's mechanics: 10px dot, built-in title and aria-label, animation only for non-terminal states. Document it as a deviation.
- Suggested feed mapping (Facet extension): LIVE → teal/green, static. UPDATING → amber, animated (like BUILDING). STALE → gray (like CANCELED). SUSPENDED / market pulled → red (like ERROR).
- Always pair with `RelativeTimeCard` (`Updated · 2m ago`), because the dot does not show age.
- **Ingestion pipeline jobs** (scrapers, model runs) behave like deployments (queued → building → ready / error), so the native StatusDot vocabulary fits them directly on an admin/status page.
