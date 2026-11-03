LEN = 5600;
// Dots ripple along the drawer's leading edge, outward from the side the gem came from.
shimmer(sh, ms, fromX, fromY) {
  const t0 = performance.now(), horiz = sh.getAttribute('data-axis') !== 'x', cols = this.brand(), S_ = 11;
  this.tick = (now) => { const p = (now - t0) / ms; if (p >= 1) { this.tick = null; return; } const b = this.box(sh), L = horiz ? b.w : this.H, n = Math.floor(L / S_), o = horiz ? fromX : fromY, A = Math.sin(Math.PI * Math.min(1, p * 1.05));
    for (let i = 0; i <= n; i++) { const c = i * S_, d = Math.abs(c - o), front = p * L * 1.25, w = Math.exp(-Math.pow((d - front) / 62, 2)) * A + .12 * A; const x = horiz ? c : b.x, y = horiz ? b.y : c; (this.X = this.X || []).push({ x, y, dr: Math.min(S_ / 2 - .8, .7 + 4.2 * w), c: cols[i % 4], op: Math.min(1, w * 1.5) }); } };
}
scene() {
  const small = this.$('[data-k=g0]'), big = this.$('[data-k=big]'), sh = this.$('[data-k=sheet]'), bd = this.$('[data-k=bd]'), row = this.$('[data-k=r0]'), parts = this.$$('[data-st]'), xAxis = sh.getAttribute('data-axis') === 'x';
  this.at(700, () => this.tap(row));
  this.at(800, () => {
    row.style.background = 'var(--fc-brand-bg)'; row.style.boxShadow = 'inset 0 0 0 1px var(--fc-brand-border)';
    const sb = this.box(small);
    sh.style.transform = 'none'; bd.style.opacity = '1';
    this.shimmer(sh, 760, sb.x + sb.w / 2, sb.y + sb.h / 2);
    parts.forEach((p, i) => this.at(170 + i * 42, () => { p.style.opacity = '1'; p.style.transform = 'none'; }));
    this.at(170, () => { big.style.opacity = '1'; big.style.transform = 'none'; });
  });
  this.at(3400, () => {
    const sb = this.box(small);
    big.style.opacity = '0'; parts.forEach((p) => { p.style.opacity = '0'; p.style.transform = 'translateY(8px)'; });
    sh.style.transition = 'transform .3s cubic-bezier(.4,0,.8,.4)'; sh.style.transform = xAxis ? 'translateX(100%)' : 'translateY(100%)'; bd.style.opacity = '0';
    this.shimmer(sh, 360, sb.x + sb.w / 2, sb.y + sb.h / 2);
    this.at(380, () => { row.style.background = ''; row.style.boxShadow = ''; });
  });
}
