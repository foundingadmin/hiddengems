LEN = 7400;
scene() {
  const rows = this.$$('[data-r]'), emp = this.$('[data-k=emp]'), tot = this.$('[data-k=totrow]'), bt = this.$('[data-k=clear]');
  this.at(820, () => { this.tap(bt); bt.style.background = 'var(--fc-signal-stop-bg)'; });
  this.at(920, () => {
    const b = this.box(bt), all = rows.concat([tot]), last = this.box(tot), x0 = b.x + b.w / 2, y0 = b.y + b.h / 2, x1 = this.W / 2, y1 = last.y + last.h + 30, T = 640;
    const when = all.map((r) => { const q = this.box(r), f = Math.min(1, (q.y + q.h / 2 - y0) / (y1 - y0)); let p = 0; while (p < 1 && p * p * (3 - 2 * p) < f) p += .01; return p * T; });
    this.cloud({ x0, y0, x1, y1, arc: 30, T, n: 80, r0: 5, r1: .2, rx0: 70, ry0: 26, rx1: 190, ry1: 70, o0: 1, o1: .3, cols: this.brand() });
    all.forEach((r, i) => this.at(when[i], () => { r.style.transition = 'opacity .1s'; r.style.opacity = '0'; }));
    this.at(560, () => { emp.style.opacity = '1'; });
    this.at(T + 60, () => this.toast(2600, () => {
      emp.style.opacity = '0'; bt.style.background = 'transparent';
      this.cloud({ x0: x1, y0: y1, x1: x0, y1: y0, arc: -30, T, n: 80, r0: .2, r1: 5, rx0: 190, ry0: 70, rx1: 70, ry1: 26, o0: .3, o1: 1, absorb: true, cols: this.brand() });
      all.forEach((r, i) => this.at(T - when[i], () => { r.style.opacity = '1'; }));
    }));
  });
}
