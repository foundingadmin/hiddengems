// Facet field: the animated hero background for marketing surfaces inside a product.
// A low-poly lattice cut like a gemstone. A slow beam of light
// sweeps across it; a few hidden facets flash in the brand accent (--fc-brand-solid; purple in
// Hidden Gems, where it means a gem) as the light finds them. Everything else changes lightness only.
//
//   import { mountField } from '@foundingcreative/facet/js/field.mjs';
//   mountField(document.querySelector('.fc-hero-field'));      // or add data-fc-field and call autoMount()
//
// Options: { seed, density (cell px, default 56), gems (share of facets, default 0.024),
//            cycle (ms per sweep, default 9000) }
// Respects prefers-reduced-motion (draws one still frame), pauses off screen and in hidden tabs,
// and re-reads colors when the theme changes. Returns { destroy() }.

const cssVar = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Resolve any CSS color (hex, rgb, oklch, display-p3) to sRGB bytes by painting one pixel. Parsing the computed
// string breaks on wide-gamut displays, where tokens resolve to oklch() and the numbers mean something else.
const px = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c.getContext('2d', { willReadFrequently: true }); })();
function parseColor(str, probe) {
  probe.style.color = str;
  const resolved = getComputedStyle(probe).color;
  px.clearRect(0, 0, 1, 1);
  px.fillStyle = '#000';
  px.fillStyle = resolved;
  px.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = px.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: 1 });
const rgba = (c, a = 1) => `rgba(${c.r | 0}, ${c.g | 0}, ${c.b | 0}, ${a})`;

export function mountField(canvas, opts = {}) {
  const o = { seed: 7, density: 56, gems: 0.024, cycle: 9000, ...opts };
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const probe = document.createElement('span');
  probe.style.display = 'none';
  canvas.parentElement.appendChild(probe);

  let W = 0, H = 0, dpr = 1, tris = [], colors = null, raf = 0, visible = true, t0 = performance.now();

  function readColors() {
    const host = canvas.parentElement;
    const base = parseColor(cssVar(host, '--fc-surface-canvas') || 'white', probe);
    const light = (0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b) / 255 > 0.5;
    // Light theme: a pale gray field that the beam whitens. Dark theme: a dark field the beam lifts.
    colors = {
      base,
      low: parseColor(cssVar(host, light ? '--ds-gray-100' : '--ds-gray-100'), probe),
      high: parseColor(cssVar(host, light ? '--ds-gray-300' : '--ds-gray-300'), probe),
      lit: parseColor(cssVar(host, light ? '--ds-background-100' : '--ds-gray-600'), probe),
      tint: parseColor(cssVar(host, '--fc-brand-bg') || cssVar(host, '--fc-gem-bg'), probe),
      edge: parseColor(cssVar(host, '--ds-gray-alpha-200'), probe),
      gem: parseColor(cssVar(host, '--fc-brand-solid') || cssVar(host, '--fc-gem-solid'), probe),
    };
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rng(o.seed), cell = o.density;
    const cols = Math.ceil(W / cell) + 2, rows = Math.ceil(H / cell) + 2, pts = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const edgeX = i === 0 || i === cols - 1, edgeY = j === 0 || j === rows - 1;
      pts.push([(i - 0.5) * cell + (edgeX ? 0 : (r() - 0.5) * cell * 0.7), (j - 0.5) * cell + (edgeY ? 0 : (r() - 0.5) * cell * 0.7)]);
    }
    tris = [];
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = pts[j * cols + i], b = pts[j * cols + i + 1], c = pts[(j + 1) * cols + i], d = pts[(j + 1) * cols + i + 1];
      const flip = (i + j) % 2 === 0;
      for (const tri of flip ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]]) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        tris.push({ p: tri, cx, cy, shade: r(), gem: r() < o.gems });
      }
    }
  }

  function frame(now) {
    if (!colors) readColors();
    const C = colors;
    ctx.clearRect(0, 0, W, H);
    // Beam: a diagonal band travelling left to right across the field, then a rest.
    const phase = reduce.matches ? 0.45 : ((now - t0) % o.cycle) / o.cycle;
    const span = W + H, beamX = -H * 0.6 + phase * (span * 1.35), beamW = Math.max(160, W * 0.18);
    for (const t of tris) {
      const d = (t.cx + t.cy * 0.55) - beamX;               // distance from the beam's center line
      const lit = Math.max(0, 1 - Math.abs(d) / beamW);       // 0..1 inside the beam
      let fill = mix(C.low, C.high, t.shade * 0.55);
      fill = mix(fill, C.lit, lit * lit * 0.8);
      ctx.beginPath();
      ctx.moveTo(t.p[0][0], t.p[0][1]); ctx.lineTo(t.p[1][0], t.p[1][1]); ctx.lineTo(t.p[2][0], t.p[2][1]); ctx.closePath();
      ctx.fillStyle = rgba(fill);
      ctx.fill();
      ctx.strokeStyle = rgba(C.edge, C.edge.a);
      ctx.lineWidth = 1;
      ctx.stroke();
      if (t.gem) {
        // A hidden gem: it flashes purple as the light passes, then fades back into the field.
        const g = Math.max(0, 1 - Math.abs(d + beamW * 0.15) / (beamW * 0.55)); // the still frame shows only the gems in the beam
        if (g > 0.01) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, g * 1.1);
          ctx.shadowColor = rgba(C.gem, 0.9);
          ctx.shadowBlur = 18 * g;
          ctx.fillStyle = rgba(C.gem);
          ctx.fill();
          // Inner facet: a smaller, lighter cut toward the centroid, so it reads as a stone catching light.
          ctx.shadowBlur = 0;
          ctx.globalAlpha = Math.min(1, g * 0.9);
          ctx.beginPath();
          t.p.forEach(([x, y], i) => { const ix = t.cx + (x - t.cx) * 0.45, iy = t.cy + (y - t.cy) * 0.45; i ? ctx.lineTo(ix, iy) : ctx.moveTo(ix, iy); });
          ctx.closePath();
          ctx.fillStyle = rgba(C.tint);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    if (!reduce.matches && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
  const ro = new ResizeObserver(() => { build(); start(); });
  ro.observe(canvas);
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) start(); });
  io.observe(canvas);
  const onVis = () => { if (!document.hidden) start(); };
  document.addEventListener('visibilitychange', onVis);
  const onTheme = () => { colors = null; start(); };
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onTheme);
  reduce.addEventListener('change', start);
  const mo = new MutationObserver(onTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  build(); start();
  return {
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mq.removeEventListener('change', onTheme); reduce.removeEventListener('change', start);
      probe.remove();
    },
  };
}

export function autoMount(root = document) {
  return [...root.querySelectorAll('[data-fc-field]')].map((c) => mountField(c, { ...c.dataset }));
}
