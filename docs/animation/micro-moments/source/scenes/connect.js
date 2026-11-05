LEN = 11000;
scene() {
  const a = this.$('[data-k=nb]'), z = this.$('[data-k=na]'), gem = this.$('[data-k=gna]'), ok = this.$('[data-k=ok]'), lab = this.$('[data-k=lab]');
  const A = this.box(a), Z = this.box(z), y = A.y + A.h / 2, x0 = A.x + A.w + 12, x1 = Z.x - 12, mx = (x0 + x1) / 2, S_ = 13, cols = this.brand(), t0 = performance.now(), T1 = 2600, T2 = 700, N = 34, GR = [this.tk('c2'), this.tk('c3'), this.tk('c3'), this.tk('c4')];
  const D = []; for (let i = 0; i < N; i++) D.push({ a: this.rnd(0, 6.28), w: this.rnd(.8, 2) * (i % 2 ? 1 : -1), q: Math.sqrt(Math.random()), f: this.rnd(3, 7), g: this.rnd(3, 7), p: this.rnd(0, 6.28), h: this.rnd(0, 6.28), b: this.rnd(1.3, 4.2), c: cols[i % 4], gc: GR[i % 4], slot: i < S_ ? i : -1, op: 1 });
  const slotX = (i) => x0 + (x1 - x0) * i / (S_ - 1);
  let beat = -1;
  this.tick = (now) => {
    const e = now - t0;
    if (e < T1 + T2) {
      const g = Math.min(1, e / 500), s = Math.max(0, Math.min(1, (e - T1) / T2)), u = s * s * (3 - 2 * s), t = e / 1000, rx = (x1 - x0) * .5 + 34, ry = (108 - 50 * e / T1) * g;
      D.forEach((d) => { const ang = d.a + d.w * t, cx_ = mx + rx * (d.q * Math.cos(ang) + .14 * Math.sin(t * d.f + d.p)), cy_ = y + ry * (d.q * Math.sin(ang) + .14 * Math.cos(t * d.g + d.h)), tx = d.slot >= 0 ? slotX(d.slot) : Z.x + Z.w / 2, ty = d.slot >= 0 ? y : y;
        d.x = cx_ + (tx - cx_) * u; d.y = cy_ + (ty - cy_) * u; d.dr = (d.b * g * (.7 + .3 * Math.sin(t * d.f))) * (1 - u) + (d.slot >= 0 ? 1.8 : 0) * u; d.op = d.slot >= 0 ? 1 : 1 - u * u; });
      this.alloc(D, 1.2, 24); D.forEach((d) => this.dot(d.x, d.y, d.rr, u > .45 ? d.c : d.gc, d.op));
      return;
    }
    const P = 1500, q = (e - T1 - T2) / P, n = Math.floor(q), f = q - n, hx = x0 - 20 + f * (x1 - x0 + 40);
    D.forEach((d) => { if (d.slot < 0) return; const X = slotX(d.slot), w = Math.exp(-Math.pow((X - hx) / 22, 2)); this.dot(X, y, Math.min((x1 - x0) / (S_ - 1) / 2 - 1, 1.8 + 4.4 * w), d.c, .55 + .45 * w); });
    if (n !== beat && f > .86) { beat = n; gem.style.transform = 'scale(1.14)'; this.at(180, () => { gem.style.transform = 'scale(1)'; }); }
  };
  this.at(T1 + 300, () => { lab.textContent = 'Sportsbook connected'; lab.style.color = '#ededed'; ok.style.opacity = '1'; });
}
