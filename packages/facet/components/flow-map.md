# Flow map

> Facet component `[F]`. Built for the agent workflow replay (Settings, Agent workflow). CSS in `css/charts.css`.

## Purpose
Shows who hands what to whom: node cards joined by labelled edges, on a stage the reader can pan and zoom. Paired with a step list, it replays a run one handoff at a time.

## Anatomy
```html
<div class="fc-flow-map">
  <div class="fc-flow-map-toolbar">
    <ul class="fc-legend" role="list">…</ul>
    <div class="fc-flow-map-zoom" role="group" aria-label="Zoom">
      <button class="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button" aria-label="Zoom out">−</button>
      <output aria-live="polite">80%</output>
      <button class="fc-button" data-variant="tertiary" data-size="small" data-shape="square" type="button" aria-label="Zoom in">+</button>
      <button class="fc-button" data-variant="tertiary" data-size="small" type="button">Fit</button>
    </div>
  </div>
  <div class="fc-flow-map-viewport" tabindex="0" role="group" aria-label="Workflow map" aria-describedby="map-help">
    <div class="fc-flow-map-stage" style="width:1200px;height:640px;transform:translate(16px,16px) scale(.8)">
      <svg class="fc-flow-map-edges" aria-hidden="true">
        <defs><marker id="arrow" …><path class="fc-flow-arrow" d="M0,0 L8,4 L0,8 z"/></marker></defs>
        <path class="fc-flow-edge" data-kind="forward" data-state="active" d="M…" marker-end="url(#arrow)"/>
      </svg>
      <div class="fc-flow-node" data-active style="left:24px;top:286px;width:196px;height:132px">
        <div class="fc-flow-node-head"><span class="fc-flow-node-name">builder</span><span class="fc-badge" data-variant="blue" data-contrast="low" data-size="sm">New</span></div>
        <div class="fc-flow-node-tags"><span class="fc-badge" data-variant="inverted" data-size="sm">Lead model</span></div>
        <p class="fc-flow-node-role">One per file group, in parallel.</p>
        <div class="fc-flow-node-foot"><span class="fc-flow-node-dot" data-state="active" aria-hidden="true"></span><span class="fc-flow-node-state">Built, checks green</span><span class="fc-flow-node-tokens">88k</span></div>
        <div class="fc-meter" aria-hidden="true"><div class="fc-meter-track"><span class="fc-meter-fill" style="--value:80"></span></div></div>
      </div>
      <span class="fc-flow-label" data-state="active" style="left:310px;top:338px">Spawn</span>
    </div>
  </div>
</div>
```
| Part | Class | Role |
|---|---|---|
| Toolbar | `.fc-flow-map-toolbar` | Legend on the left, zoom group on the right; wraps on narrow widths |
| Viewport | `.fc-flow-map-viewport` | Clips the stage, takes the drag and the wheel. Height comes from the layout; at least `--fc-flow-map-min-height` (320px) |
| Stage | `.fc-flow-map-stage` | The whole map at its own size; moved by one `transform` |
| Edge | `.fc-flow-edge` | One SVG path per handoff, ending in an arrow marker |
| Label | `.fc-flow-label` | The handoff's name at the point halfway along its edge |
| Node | `.fc-flow-node` | Name (mono), optional "New" badge, tags, role (two lines), status dot, state, tokens, meter |
| Zoom | `.fc-flow-map-zoom` | Minus, the scale as a percentage (`output`), plus, Fit |

## Kinds and states
- **Edges** (`data-kind`): `forward` solid gray, `return` dashed gray, `escalate` amber and dashed. The dash tells them apart, so color is never the only cue; the legend names each.
- **Edge and label states** (`data-state`): `active` the current handoff (primary, thick, flowing toward its target), `past` reached earlier, `dim` not reached yet. No state before the replay starts.
- **Nodes** (`data-kind`): default card; `person` solid contrast (where the flow starts and ends); `script` dashed on the fill (a script or a role inside another agent, never a spawn). `data-active` marks the node acting in the current step.
- **Node dot** (`data-state`): idle gray, `active` blue with a halo, `done` secondary. The state word beside it carries the meaning.

## Behavior
- Drag pans. Command or Control with the scroll wheel zooms at the cursor; a pinch zooms on touch. Shift with the wheel pans sideways.
- Keyboard on the focused viewport: `+` and `-` zoom, `0` fits, arrows pan.
- Zoom runs from 20% to 300%. Fit centers the whole stage, never above 120%, and refits on resize until the reader pans or zooms.
- A drag never counts as a click on a node.
- Reduced motion stops the active edge's flow and the fades.

## Rules
- Put the map beside a step list (`components/step-list.md`) or a table with the same facts: the map is the fast path, the list and table are the record. Mark the edges SVG `aria-hidden`.
- Arrowheads use one marker per tone (`.fc-flow-arrow`, `data-tone` `active` or `escalate`); give marker ids a per-instance prefix.
- Hues: gray by default, amber only for escalation, blue only for the active dot. Model and role tags are badges (`inverted` for the lead model, gray for the rest, blue for "New").
- No grid or dot texture on the viewport; the subtle surface is enough.

## Hidden Gems usage
The agent workflow map on Settings, Agent workflow, replayed step by step.
