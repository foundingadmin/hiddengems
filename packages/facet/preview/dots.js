// GENERATED from js/dots.mjs by scripts/build.mjs. Do not edit by hand.
(function () {
// Facet dots: the engine behind moments (patterns/moments.md). Framework-free, no dependency.
//
//   import { createStage } from '@foundingcreative/facet/js/dots.mjs';
//   const stage = createStage();              // one fixed, full-viewport canvas on document.body
//   await stage.sweep(card, { from: 'left' }); // resolves when the cloud has passed
//
// A stage owns one canvas: aria-hidden, never takes pointer events, sized to the device pixel ratio and
// resized by a ResizeObserver. Pass a host to draw inside it instead (a scroller, or a modal <dialog>, which
// sits in the top layer above any page canvas). Element boxes are read in viewport coordinates when a
// primitive starts. The frame loop runs only while something plays and pauses while the tab is hidden.
//
// Every primitive returns a Promise that resolves when it ends or when its { signal } aborts. Under
// prefers-reduced-motion a primitive draws nothing and resolves at once; the caller shows the end state.
// The motion rules live here, not in callers: dots never touch on any frame (alloc), and dots that travel
// are always brand tones (--fc-illus-1 to 4).

const BRAND = [1, 2, 2, 3];
const TWO_PI = Math.PI * 2;

const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (q) => q * q * (3 - 2 * q);
const EASE = {
  io: smooth,
  out: (p) => 1 - (1 - p) ** 3,
  in: (p) => p ** 3,
};
// Quadratic curve from a to b, bowed sideways by arc px.
function curve(x0, y0, x1, y1, arc, u) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const kx = (x0 + x1) / 2 - (dy / L) * arc, ky = (y0 + y1) / 2 + (dx / L) * arc, v = 1 - u;
  return [v * v * x0 + 2 * v * u * kx + u * u * x1, v * v * y0 + 2 * v * u * ky + u * u * y1];
}

/** True while the reader asks for reduced motion. Read at play time, so a change applies to the next moment. */
function reducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Motion rule 1, dots never touch. Gives each dot its drawn radius rr: no larger than its wanted radius dr, and
 *  no more than half the gap to its nearest neighbor less the margin, so any two dots keep margin px apart. */
function alloc(dots, margin = 1) {
  let big = 0;
  for (const d of dots) if (d.dr > big) big = d.dr;
  const C = Math.max(20, 2 * big + margin + 1), grid = new Map();
  const key = (x, y) => x + ':' + y;
  for (const d of dots) {
    const k = key(Math.floor(d.x / C), Math.floor(d.y / C));
    const cell = grid.get(k);
    if (cell) cell.push(d); else grid.set(k, [d]);
  }
  for (const d of dots) {
    let nb = Infinity;
    const cx = Math.floor(d.x / C), cy = Math.floor(d.y / C);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const cell = grid.get(key(cx + i, cy + j));
      if (cell) for (const o of cell) if (o !== d) nb = Math.min(nb, Math.hypot(o.x - d.x, o.y - d.y));
    }
    d.rr = Math.max(0, Math.min(d.dr, (nb - margin) / 2));
  }
  return dots;
}

// The box of everything that clips el: the intersection of its scrolling or clipping ancestors, in viewport
// coordinates. null when nothing clips it.
function clipOf(el) {
  let box = null;
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const r = p.getBoundingClientRect();
      box = box
        ? { l: Math.max(box.l, r.left), t: Math.max(box.t, r.top), r: Math.min(box.r, r.right), b: Math.min(box.b, r.bottom) }
        : { l: r.left, t: r.top, r: r.right, b: r.bottom };
    }
    if (cs.position === 'fixed') break;
  }
  return box;
}

// Painting one pixel resolves any CSS color (hex, oklch, display-p3, color-mix) to sRGB that a canvas accepts.
let px = null;
function toRGB(css) {
  px ||= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  px.clearRect(0, 0, 1, 1);
  px.fillStyle = '#000';
  px.fillStyle = css;
  px.fillRect(0, 0, 1, 1);
  const [r, g, b] = px.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Creates a stage. Without a host it is a fixed layer over the whole viewport on document.body. With a host,
 * the canvas covers the host (cover: 'host', the host becomes its containing block) or the viewport from
 * inside it (cover: 'viewport', for a modal dialog). outset grows a host canvas past the host's edges, as a CSS
 * length, so dots on a child's border are not cut.
 */
function createStage(host, opts = {}) {
  const target = host || document.body;
  const cover = host ? opts.cover || 'host' : 'viewport';
  const canvas = document.createElement('canvas');
  canvas.className = 'fc-stage';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.pointerEvents = 'none';
  canvas.dataset.cover = cover;
  if (opts.outset) canvas.style.setProperty('--fc-stage-outset', opts.outset);
  let hostPosition = null;
  if (cover === 'host' && getComputedStyle(target).position === 'static') {
    hostPosition = target.style.position;
    target.style.position = 'relative';
  }
  const probe = document.createElement('span');
  probe.hidden = true;
  target.append(canvas, probe);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1, raf = 0, hiddenAt = document.hidden ? performance.now() : 0, dead = false;
  let items = [];
  const colors = new Map();

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = r.width; H = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    if (items.length) kick();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Theme changes re-read the tones on the next frame.
  const forget = () => colors.clear();
  const scheme = matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', forget);
  const mo = new MutationObserver(forget);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
  // Reduced motion switched on mid-moment ends everything at once.
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = () => { if (motion.matches) stopAll(); };
  motion.addEventListener('change', onMotion);
  // A hidden tab pauses the clock; moments resume where they were.
  const onVisibility = () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      cancelAnimationFrame(raf); raf = 0;
    } else {
      const gap = hiddenAt ? performance.now() - hiddenAt : 0;
      hiddenAt = 0;
      for (const it of items) it.t0 += gap;
      kick();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  /** Resolves a tone to a canvas color: 1 to 4 (--fc-illus-n) or 'context-1' to 'context-4'. */
  function tone(n) {
    const name = `--fc-illus-${n}`;
    let c = colors.get(name);
    if (!c) {
      probe.style.color = `var(${name})`;
      c = toRGB(getComputedStyle(probe).color);
      colors.set(name, c);
    }
    return c;
  }

  // Viewport point (or an element's center) to canvas coordinates.
  const origin = () => { const r = canvas.getBoundingClientRect(); return { x: r.left, y: r.top }; };
  const point = (t, o) => {
    if (t && typeof t.getBoundingClientRect === 'function') {
      const r = t.getBoundingClientRect();
      return { x: r.left + r.width / 2 - o.x, y: r.top + r.height / 2 - o.y };
    }
    return { x: t.x - o.x, y: t.y - o.y };
  };
  const localBox = (el, o) => { const r = el.getBoundingClientRect(); return { x: r.left - o.x, y: r.top - o.y, w: r.width, h: r.height }; };
  const localClip = (c, o) => (c ? { x: c.l - o.x, y: c.t - o.y, w: Math.max(0, c.r - c.l), h: Math.max(0, c.b - c.t) } : null);
  // clip: an element whose scrolling ancestors bound the dots, so a cloud over a card in a scroller stays in it.
  const clipFor = (el, o) => (el ? localClip(clipOf(el), o) : null);
  const brand = (tones) => {
    const ok = (tones || BRAND).filter((t) => t === 1 || t === 2 || t === 3 || t === 4);
    return ok.length ? ok : BRAND;
  };

  function play(item, signal) {
    if (dead || reducedMotion() || signal?.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      item.resolve = resolve;
      item.t0 ??= performance.now();
      items.push(item);
      item.start?.();
      signal?.addEventListener('abort', () => end(item), { once: true });
      kick();
    });
  }
  function end(item) {
    if (item.ended) return;
    item.ended = true;
    items = items.filter((i) => i !== item);
    item.stop?.();
    item.resolve();
    kick(); // one more frame clears what it drew
  }
  function stopAll() { for (const it of [...items]) end(it); }
  function kick() { if (!raf && !dead && !document.hidden) raf = requestAnimationFrame(frame); }

  function paint(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const live = [], o = origin();
    for (const it of [...items]) if (!it.idle && it.step(now, live, o) === false) end(it);
    if (!live.length) return;
    alloc(live);
    for (const d of live) {
      if (d.rr <= 0.02 || d.op <= 0) continue;
      if (d.clip) { ctx.save(); ctx.beginPath(); ctx.rect(d.clip.x, d.clip.y, d.clip.w, d.clip.h); ctx.clip(); }
      ctx.globalAlpha = Math.min(1, d.op);
      ctx.fillStyle = tone(d.tone);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.rr, 0, TWO_PI);
      ctx.fill();
      if (d.clip) ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    raf = 0;
    paint(now);
    if (items.some((i) => !i.idle)) kick();
  }

  /**
   * One cloud: count dots travelling together from one point to another, moving chaotically inside the group.
   * size [r0, r1], spread [[rx0, ry0], [rx1, ry1]] and opacity [o0, o1] change over the trip. absorb pulls the
   * cloud in over its last sixth, as if taken in by the target.
   */
  function cloud(o) {
    const g = origin();
    const a = point(o.from, g), b = point(o.to, g);
    const T = o.duration ?? 520, [r0, r1] = o.size ?? [2.6, 0.3];
    const [[rx0, ry0], [rx1, ry1]] = o.spread ?? [[16, 13], [30, 20]];
    const [o0, o1] = o.opacity ?? [1, 1], arc = o.arc ?? 0, tones = brand(o.tones);
    const clip = clipFor(o.clip, g);
    const D = Array.from({ length: o.count ?? 16 }, (_, i) => ({
      a: rnd(0, TWO_PI), q: Math.sqrt(Math.random()), s: rnd(0.65, 1.15), w: rnd(-5, 5),
      f: rnd(11, 24), g: rnd(11, 24), p: rnd(0, TWO_PI), h: rnd(0, TWO_PI), tone: tones[i % tones.length],
    }));
    const delay = o.delay ?? 0;
    return play({
      step(now, live) {
        const q = (now - this.t0 - delay) / T;
        if (q < 0) return true;
        if (q >= 1) return false;
        const u = smooth(q), [X, Y] = curve(a.x, a.y, b.x, b.y, arc, u), t = (now - this.t0) / 1000;
        const sq = o.absorb && q > 0.84 ? 1 - (q - 0.84) / 0.16 : 1;
        const rx = (rx0 + (rx1 - rx0) * q) * sq, ry = (ry0 + (ry1 - ry0) * q) * sq, rr = r0 + (r1 - r0) * q, op = o0 + (o1 - o0) * q;
        for (const d of D) {
          const A = d.a + d.w * t;
          live.push({
            x: X + rx * (d.q * Math.cos(A) + 0.32 * Math.sin(t * d.f + d.p)),
            y: Y + ry * (d.q * Math.sin(A) + 0.32 * Math.cos(t * d.g + d.h)),
            dr: rr * d.s, tone: d.tone, op, clip,
          });
        }
        return true;
      },
    }, o.signal);
  }

  /** One dot from where it is to o.to. size [r0, mid, r1] and opacity [o0, o1] change on the way; it shows at its
   *  start during the delay. */
  function fly(dot, o) {
    const g = origin(), a = point(dot, g), b = o.to ? point(o.to, g) : a;
    const T = o.duration ?? 500, delay = o.delay ?? 0, ease = EASE[o.ease] || EASE.io, arc = o.arc ?? 0;
    const [r0, rm, r1] = o.size ?? [dot.r, dot.r, dot.r], [o0, o1] = o.opacity ?? [1, 1];
    const tn = brand(dot.tone ? [dot.tone] : [2])[0];
    const clip = clipFor(o.clip, g);
    return play({
      step(now, live) {
        const q = (now - this.t0 - delay) / T, t = Math.max(0, Math.min(1, q)), u = ease(t), [x, y] = curve(a.x, a.y, b.x, b.y, arc, u);
        live.push({ x, y, dr: t < 0.5 ? r0 + (rm - r0) * t * 2 : rm + (r1 - rm) * (t * 2 - 1), tone: tn, op: o0 + (o1 - o0) * t, clip });
        return q < 1;
      },
    }, o.signal);
  }

  /** Dots drift a little, shrink and fade to nothing: what is left after a cloud passes. */
  function dust(dots, o = {}) {
    return Promise.all(dots.map((d) => fly(d, {
      to: { x: d.x + rnd(-22, 22), y: d.y + rnd(-26, 6) }, size: [d.r, d.r * 0.75, 0], opacity: [1, 0],
      duration: rnd(190, 340), delay: rnd(0, 50), ease: 'out', arc: rnd(-6, 6), signal: o.signal, clip: o.clip,
    }))).then(() => {});
  }

  // The two ends of a sweep across el, at its vertical middle, inset from its edges.
  function ends(el, from, inset) {
    const r = el.getBoundingClientRect(), y = r.top + r.height / 2;
    const left = { x: r.left + inset, y }, right = { x: r.right - inset, y };
    if (from === 'left' || from == null) return [left, right, 'left'];
    if (from === 'right') return [right, left, 'right'];
    const p = typeof from.getBoundingClientRect === 'function' ? (() => { const b = from.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })() : from;
    return p.x - r.left > r.right - p.x ? [p, left, 'right'] : [p, right, 'left'];
  }
  const wipes = new WeakMap();
  const WIPE = { left: 'inset(0 0 0 100%)', right: 'inset(0 100% 0 0)' };

  /**
   * A cloud sweeps across el from one end to the other: from 'left', 'right', or a control (Element or point),
   * heading for el's far end. Defaults are the remove sweep (docs/animation/micro-moments, Remove a leg); pass
   * count, size, spread, opacity and duration for a lighter one. wipe also clips el away behind the cloud, and
   * leaves it clipped until unsweep.
   */
  function sweep(el, o = {}) {
    const [a, b, side] = ends(el, o.from, o.inset ?? 6);
    const T = o.duration ?? 660;
    if (o.wipe) {
      wipes.get(el)?.cancel();
      const reduce = reducedMotion();
      const anim = el.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: WIPE[side] }], {
        duration: reduce ? 0 : T * 0.82, delay: reduce ? 0 : o.delay ?? 0, easing: 'ease-in-out', fill: 'forwards',
      });
      wipes.set(el, anim);
      o.signal?.addEventListener('abort', () => anim.finish(), { once: true });
    }
    return cloud({
      from: a, to: { x: b.x, y: b.y - (o.lift ?? 8) }, duration: T, count: o.count ?? 36, size: o.size ?? [4.6, 0.2],
      spread: o.spread ?? [[30, 19], [62, 40]], opacity: o.opacity ?? [1, 0.35], arc: o.arc ?? 6, tones: o.tones,
      clip: o.clip === null ? undefined : o.clip ?? el, signal: o.signal, delay: o.delay,
    });
  }

  /** The sweep played backward: dust gathers at the far end, grows and returns to o.to (a control, 'left' or
   *  'right'). Restores a wiped el. reveal does the same for an el that was rendered again after its sweep (a
   *  restored row): it starts wiped, through any delay, and shows behind the cloud. */
  function unsweep(el, o = {}) {
    const [a, b, side] = ends(el, o.to, o.inset ?? 6);
    const T = o.duration ?? 660, old = wipes.get(el);
    if (old || o.reveal) {
      wipes.delete(el);
      old?.cancel();
      if (!reducedMotion()) {
        el.animate([{ clipPath: WIPE[side] }, { clipPath: 'inset(0 0 0 0)' }], {
          duration: T * 0.82, delay: o.delay ?? 0, easing: 'ease-in-out', fill: 'backwards',
        });
      }
    }
    return cloud({
      from: { x: b.x, y: b.y - (o.lift ?? 8) }, to: a, duration: T, count: o.count ?? 36, size: o.size ?? [0.2, 4.6],
      spread: o.spread ?? [[62, 40], [30, 19]], opacity: o.opacity ?? [0.35, 1], arc: -(o.arc ?? 6), absorb: true,
      tones: o.tones, clip: o.clip === null ? undefined : o.clip ?? el, signal: o.signal, delay: o.delay,
    });
  }

  /**
   * Dots along one edge of el ripple outward from a point: the glint that answers an add on the Slips tab, and
   * the shimmer on a sheet's leading edge. The edge comes from o.edge, else el's --fc-glint-edge, else top.
   * While it plays, the from element (or el) carries data-glint for CSS to answer.
   */
  function ripple(el, o = {}) {
    const edge = o.edge || getComputedStyle(el).getPropertyValue('--fc-glint-edge').trim() || 'top';
    const T = o.duration ?? 820, S = o.spacing ?? 11, from = o.from ?? el;
    const lit = typeof from.getBoundingClientRect === 'function' ? from : el;
    const fp = (() => { const g = origin(); return point(from, g); })();
    const horiz = edge === 'top' || edge === 'bottom', tones = [1, 2, 3, 4];
    return play({
      start() { lit.setAttribute('data-glint', ''); },
      stop() { lit.removeAttribute('data-glint'); },
      step(now, live, g) {
        const p = (now - this.t0) / T;
        if (p >= 1) return false;
        const b = localBox(el, g), L = horiz ? b.w : b.h, n = Math.floor(L / S), A = Math.sin(Math.PI * Math.min(1, p * 1.05));
        const at = horiz ? fp.x - b.x : fp.y - b.y, front = p * L * 1.25;
        for (let i = 0; i <= n; i++) {
          const c = i * S, w = Math.exp(-(((Math.abs(c - at) - front) / 62) ** 2)) * A + 0.12 * A;
          live.push({
            x: horiz ? b.x + c : edge === 'left' ? b.x : b.x + b.w,
            y: horiz ? (edge === 'top' ? b.y : b.y + b.h) : b.y + c,
            dr: Math.min(S / 2 - 0.8, 0.7 + 4.2 * w), tone: tones[i % 4], op: Math.min(1, w * 1.5),
          });
        }
        return true;
      },
    }, o.signal);
  }

  /**
   * count dots circle el's border, following its rounded corners, one lap per period ms, until o.signal aborts.
   * Drawing stops while el is off screen.
   */
  function orbit(el, o = {}) {
    const n = o.count ?? 6, period = o.period ?? 5200, size = o.size ?? 2.1;
    let io = null, radius = 0;
    const item = {
      start() {
        radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
        io = new IntersectionObserver(([e]) => { item.idle = !e.isIntersecting; kick(); });
        io.observe(el);
      },
      stop() { io?.disconnect(); },
      step(now, live, g) {
        if (!el.isConnected) return false;
        const b = localBox(el, g), R = Math.min(radius, b.w / 2, b.h / 2);
        const sw = b.w - 2 * R, sh = b.h - 2 * R, bend = (Math.PI * R) / 2, per = 2 * sw + 2 * sh + 4 * bend;
        const clip = clipFor(el, g), t = (now - this.t0) / period;
        const corner = (cx, cy, ang) => (R ? [cx + R * Math.cos(ang), cy + R * Math.sin(ang)] : [cx, cy]);
        // The outline clockwise from the end of the top-left corner: edge, corner, edge, corner...
        const segs = [
          [sw, (d) => [b.x + R + d, b.y]],
          [bend, (d) => corner(b.x + b.w - R, b.y + R, -Math.PI / 2 + d / R)],
          [sh, (d) => [b.x + b.w, b.y + R + d]],
          [bend, (d) => corner(b.x + b.w - R, b.y + b.h - R, d / R)],
          [sw, (d) => [b.x + b.w - R - d, b.y + b.h]],
          [bend, (d) => corner(b.x + R, b.y + b.h - R, Math.PI / 2 + d / R)],
          [sh, (d) => [b.x, b.y + b.h - R - d]],
          [bend, (d) => corner(b.x + R, b.y + R, Math.PI + d / R)],
        ];
        const at = (s) => {
          for (const [len, f] of segs) { if (s <= len) return f(s); s -= len; }
          return [b.x + R, b.y];
        };
        for (let i = 0; i < n; i++) {
          const [x, y] = at(((((t - i * 0.017) % 1) + 1) % 1) * per);
          live.push({ x, y, dr: size * (1 - i * 0.13), tone: i === 0 ? 1 : 2, op: 1 - i * 0.14, clip });
        }
        return true;
      },
    };
    return play(item, o.signal);
  }

  return {
    canvas,
    tone,
    cloud,
    fly,
    dust,
    sweep,
    unsweep,
    ripple,
    orbit,
    /** Ends every moment on this stage now. */
    stop: stopAll,
    destroy() {
      if (dead) return;
      stopAll();
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      scheme.removeEventListener('change', forget);
      motion.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.remove();
      probe.remove();
      if (hostPosition !== null) target.style.position = hostPosition;
    },
  };
}

window.FacetDots = { createStage, reducedMotion, alloc };
})();
