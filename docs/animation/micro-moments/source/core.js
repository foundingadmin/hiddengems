class Component extends DCLogic {
  componentDidMount() { this.tries = 0; this.boot(); }
  componentWillUnmount() { this.dead = true; this.clearT(); cancelAnimationFrame(this.raf); clearTimeout(this.bt); }
  boot() {
    const r = document.querySelector('[data-fx="__ID__"]');
    if (!r || !r.querySelector('canvas')) { if (this.tries++ < 50) this.bt = setTimeout(() => this.boot(), 100); return; }
    this.root = r; this.cv = r.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.W = r.offsetWidth; this.H = r.offsetHeight; this.cv.width = this.W * 2; this.cv.height = this.H * 2;
    this.P = []; this.C = []; this.T = [];
    const m = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    this.still = !!(m && m.matches);
    this.loopFrame = (n) => { if (this.dead) return; this.frame(n); this.raf = requestAnimationFrame(this.loopFrame); };
    this.raf = requestAnimationFrame(this.loopFrame);
    this.restart();
  }
  restart() { if (!this.root) return; this.clearT(); this.P = []; this.C = []; this.tick = null; this.restoreDOM(); if (this.reset) this.reset(); if (this.still) return; this.t0 = performance.now(); this.scene(); if (this.LEN) this.at(this.LEN, () => this.restart()); }
  restoreDOM() { const R = this.root; R.classList.add('na'); this.$$('[data-k]').forEach((e) => { if (e._s == null) { e._s = e.getAttribute('style') || ''; e._t = e.children.length ? null : e.textContent; } e.setAttribute('style', e._s); if (e._t != null) e.textContent = e._t; }); void R.offsetWidth; requestAnimationFrame(() => R.classList.remove('na')); }
  clearT() { (this.T || []).forEach(clearTimeout); this.T = []; }
  at(ms, fn) { this.T.push(setTimeout(() => { if (!this.dead) fn(); }, ms)); }
  $(s) { return this.root.querySelector(s); }
  $$(s) { return Array.from(this.root.querySelectorAll(s)); }
  sc() { return this.root.getBoundingClientRect().width / this.root.offsetWidth || 1; }
  box(el) { const a = el.getBoundingClientRect(), b = this.root.getBoundingClientRect(), k = this.sc(); return { x: (a.x - b.x) / k, y: (a.y - b.y) / k, w: a.width / k, h: a.height / k }; }
  tk(n) { this._c = this._c || {}; if (!this._c[n]) { const p = document.createElement('i'); p.style.color = typeof n === 'number' ? 'var(--fc-illus-' + n + ')' : n[0] === 'c' ? 'var(--fc-illus-context-' + n[1] + ')' : 'var(--fc-signal-' + n + ')'; this.root.appendChild(p); this._c[n] = getComputedStyle(p).color; p.remove(); } return this._c[n]; }
  thin(L, n) { if (!n || n >= L.length) return L; const o = []; for (let i = 0; i < n; i++) o.push(L[Math.floor(i * L.length / n)]); return o; }
  rnd(a, b) { return a + Math.random() * (b - a); }
  gemDots(el) { const k = this.sc(), b = this.root.getBoundingClientRect(); return Array.from(el.querySelectorAll('circle')).map((c) => { const a = c.getBoundingClientRect(); return { x: (a.x + a.width / 2 - b.x) / k, y: (a.y + a.height / 2 - b.y) / k, r: a.width / 2 / k, c: getComputedStyle(c).fill }; }); }
  latt(bx, s, r, cols) { const o = []; let j = 0; for (let y = bx.y + s / 2; y < bx.y + bx.h; y += s * .866, j++) for (let x = bx.x + s / 2 + (j % 2 ? s / 2 : 0); x < bx.x + bx.w; x += s) o.push({ x, y, r: r * this.rnd(.7, 1), c: cols[Math.floor(Math.random() * cols.length)] }); return o; }
  fly(d, o) { this.P.push(Object.assign({ x0: d.x, y0: d.y, x1: d.x, y1: d.y, r0: d.r, rm: d.r, r1: d.r, c: d.c, d: 0, T: 500, o0: 1, o1: 1, arc: 0, ease: 'io', hold: true }, o, { born: performance.now() })); }
  dust(list, o) { list.forEach((d) => this.fly(d, Object.assign({ x1: d.x + this.rnd(-22, 22), y1: d.y + this.rnd(-26, 6), rm: d.r * .75, r1: 0, o1: 0, T: this.rnd(190, 340), d: this.rnd(0, 50), ease: 'out', arc: this.rnd(-6, 6) }, o || {}))); }
  // One cloud travels as one swift element, with chaotic motion among the dots inside it.
  cloud(o) {
    const D = []; for (let i = 0; i < o.n; i++) { const a = this.rnd(0, 6.283), q = Math.sqrt(Math.random()); D.push({ a, q, s: this.rnd(.65, 1.15), w: this.rnd(-5, 5), f: this.rnd(11, 24), g: this.rnd(11, 24), p: this.rnd(0, 6.283), h: this.rnd(0, 6.283), c: o.cols[i % o.cols.length] }); }
    this.C.push(Object.assign({ T: 520, d: 0, arc: 0, o0: 1, o1: 1, absorb: false }, o, { D, born: performance.now() }));
    return (o.d || 0) + (o.T || 520);
  }
  cloudDots(now, live) {
    this.C = this.C.filter((c) => {
      const q = (now - c.born - c.d) / c.T; if (q < 0) return true; if (q >= 1) return false;
      const u = q * q * (3 - 2 * q), v = 1 - u, mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2, dx = c.x1 - c.x0, dy = c.y1 - c.y0, L = Math.hypot(dx, dy) || 1, kx = mx - dy / L * c.arc, ky = my + dx / L * c.arc;
      const X = v * v * c.x0 + 2 * v * u * kx + u * u * c.x1, Y = v * v * c.y0 + 2 * v * u * ky + u * u * c.y1, t = (now - c.born) / 1000, sq = c.absorb && q > .84 ? 1 - (q - .84) / .16 : 1;
      const rx = (c.rx0 + (c.rx1 - c.rx0) * q) * sq, ry = (c.ry0 + (c.ry1 - c.ry0) * q) * sq, rr = c.r0 + (c.r1 - c.r0) * q, op = c.o0 + (c.o1 - c.o0) * q;
      c.D.forEach((d) => { const A = d.a + d.w * t; live.push({ x: X + rx * (d.q * Math.cos(A) + .32 * Math.sin(t * d.f + d.p)), y: Y + ry * (d.q * Math.sin(A) + .32 * Math.cos(t * d.g + d.h)), dr: rr * d.s, c: d.c, op }); });
      return true;
    });
  }
  // Add actions: the cloud leaves the clicked control tight with small dots and arrives wide with large ones.
  trail(from, to, Z, o) {
    const a = this.box(from), b = this.box(to), R = Math.sqrt(Z.n) * Z.re * 1.45;
    return this.cloud({ x0: a.x + a.w / 2, y0: a.y + a.h / 2, x1: o && o.tx != null ? o.tx : b.x + b.w / 2, y1: o && o.ty != null ? o.ty : b.y + b.h / 2, arc: (o && o.arc) || -46, d: (o && o.d) || 0, T: 540, n: Z.n, r0: .8, r1: Z.re, rx0: 7, ry0: 7, rx1: R, ry1: R, absorb: true, cols: [this.tk(1), this.tk(2), this.tk(2), this.tk(3)] });
  }
  // Remove actions: the cloud leaves the clicked control with large dots, sweeps the row away and shrinks to dust.
  cascade(r, g, ox) {
    const b = this.box(r), W = 540;
    this.cloud({ x0: ox, y0: b.y + b.h / 2, x1: b.x + 6, y1: b.y + b.h / 2 - 8, arc: 6, T: W + 120, n: 36, r0: 4.6, r1: .2, rx0: 30, ry0: 19, rx1: 62, ry1: 40, o0: 1, o1: .35, cols: this.brand() });
    r.style.transition = 'clip-path ' + W + 'ms ease-in-out'; void r.offsetWidth; r.style.clipPath = 'inset(0 100% 0 0)';
    return W;
  }
  brand() { return [this.tk(1), this.tk(2), this.tk(2), this.tk(3)]; }
  // The same sweep played backward: dust gathers at the far end, grows and returns to the control.
  uncascade(r, ox) {
    const b = this.box(r), W = 540;
    this.cloud({ x0: b.x + 6, y0: b.y + b.h / 2 - 8, x1: ox, y1: b.y + b.h / 2, arc: -6, T: W + 120, n: 36, r0: .2, r1: 4.6, rx0: 62, ry0: 40, rx1: 30, ry1: 19, o0: .35, o1: 1, absorb: true, cols: this.brand() });
    r.style.transition = 'clip-path ' + W + 'ms ease-in-out'; void r.offsetWidth; r.style.clipPath = 'inset(0 0 0 0)';
  }
  // Undo toast: five brand dots count the seconds away, then an undo tap plays the action in reverse.
  toast(undoAfter, onUndo, label) {
    const t = this.$('[data-k=toast]'), u = this.$('[data-k=undo]'), D = this.$$('[data-cd]'); D.forEach((d) => { d.style.transform = ''; }); if (label) this.$('[data-k=tlabel]').textContent = label;
    t.style.opacity = '1'; t.style.transform = 'none';
    D.forEach((d, i) => this.at(1000 * (D.length - i), () => { d.style.transform = 'scale(0)'; }));
    const hide = () => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; };
    this.undoFn = () => { this.undoFn = null; hide(); onUndo(); };
    if (undoAfter) { this.at(undoAfter, () => { this.tap(u); }); this.at(undoAfter + 110, () => { if (this.undoFn) this.undoFn(); }); }
    else this.at(5200, () => { if (this.undoFn) { this.undoFn = null; hide(); } });
  }
  tap(el) { const m = this.$('[data-k=tap]'), b = this.box(el); m.style.left = (b.x + b.w / 2 - 20) + 'px'; m.style.top = (b.y + b.h / 2 - 20) + 'px'; m.style.opacity = '1'; m.style.transform = 'scale(.8)'; this.at(180, () => { m.style.opacity = '0'; m.style.transform = 'scale(1.1)'; }); }
  ease(k, p) { if (k === 'acc') return Math.pow(p, 1.7); return k === 'out' ? 1 - (1 - p) * (1 - p) * (1 - p) : k === 'in' ? p * p * p : p * p * (3 - 2 * p); }
  alloc(L, M, CC) {
    const C = CC || 20, g = new Map(), m = M == null ? 1 : M;
    L.forEach((d) => { const k = Math.floor(d.x / C) + ':' + Math.floor(d.y / C); (g.get(k) || g.set(k, []).get(k)).push(d); });
    L.forEach((d) => { let nb = 1e9; const cx = Math.floor(d.x / C), cy = Math.floor(d.y / C);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const c = g.get((cx + i) + ':' + (cy + j)); if (!c) continue; for (const o of c) { if (o === d) continue; const q = Math.hypot(o.x - d.x, o.y - d.y); if (q < nb) nb = q; } }
      d.rr = Math.max(0, Math.min(d.dr, (nb - m) / 2)); });
  }
  dot(x, y, r, c, o) { if (r <= .02) return; const X = this.ctx; X.globalAlpha = o; X.fillStyle = c; X.beginPath(); X.arc(x, y, r, 0, 6.2832); X.fill(); }
  frame(now) {
    const X = this.ctx; X.setTransform(2, 0, 0, 2, 0, 0); X.clearRect(0, 0, this.W, this.H);
    if (this.tick) this.tick(now);
    const live = this.X || []; this.X = []; this.cloudDots(now, live);
    this.P = this.P.filter((p) => {
      const q = (now - p.born - p.d) / p.T;
      if (q < 0 && !p.hold) return true;
      const t = Math.max(0, Math.min(1, q)), u = this.ease(p.ease, t), mx = (p.x0 + p.x1) / 2, my = (p.y0 + p.y1) / 2, dx = p.x1 - p.x0, dy = p.y1 - p.y0, L = Math.hypot(dx, dy) || 1, cx = mx - dy / L * p.arc, cy = my + dx / L * p.arc, a = 1 - u;
      p.x = a * a * p.x0 + 2 * a * u * cx + u * u * p.x1; p.y = a * a * p.y0 + 2 * a * u * cy + u * u * p.y1;
      p.dr = t < .5 ? p.r0 + (p.rm - p.r0) * t * 2 : p.rm + (p.r1 - p.rm) * (t * 2 - 1); p.op = p.o0 + (p.o1 - p.o0) * t;
      if (t >= 1 && p.done !== undefined) p.done && p.done();
      live.push(p); return t < 1 || p.keep;
    });
    if (live.length) { this.alloc(live); live.forEach((p) => this.dot(p.x, p.y, p.rr, p.c, p.op)); }
    X.globalAlpha = 1;
  }
  renderVals() { return { replay: () => this.restart() }; }
