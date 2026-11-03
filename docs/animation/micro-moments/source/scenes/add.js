LEN = 3800;
scene() {
  const b = this.$('[data-k=badge]'), card = this.$('[data-k=pc0]'), bt = this.$('[data-k=b0]'), dot = this.$('[data-k=b0d]'), tab = b.parentElement, bar = tab.parentElement, cols = this.brand();
  // Nothing travels. The Slips tab answers the click with the same edge glint as the drawer.
  const glint = (ms) => { const t0 = performance.now(), S_ = 11; this.tick = (now) => { const p = (now - t0) / ms; if (p >= 1) { this.tick = null; return; } const B = this.box(bar), o = this.box(b), ox = o.x + o.w / 2, n = Math.floor(B.w / S_), A = Math.sin(Math.PI * Math.min(1, p * 1.05)); for (let i = 0; i <= n; i++) { const c = i * S_, d = Math.abs(c - ox), w = Math.exp(-Math.pow((d - p * B.w * 1.25) / 62, 2)) * A + .12 * A; (this.X = this.X || []).push({ x: c, y: B.y, dr: Math.min(S_ / 2 - .8, .7 + 4.2 * w), c: cols[i % 4], op: Math.min(1, w * 1.5) }); } }; };
  tab.style.color = '#6b6b6b';
  this.at(620, () => this.tap(bt));
  this.at(720, () => {
    card.style.transform = 'scale(.975)'; card.style.background = 'color-mix(in srgb, var(--fc-brand-bg) 34%, #0a0a0a)'; card.style.borderColor = 'var(--fc-control-on)'; card.style.boxShadow = 'inset 0 0 0 1px var(--fc-control-on)';
    bt.style.background = 'var(--fc-control-on)'; bt.style.borderColor = 'var(--fc-control-on)'; dot.style.transform = 'scale(1)';
    this.at(150, () => { card.style.transform = 'none'; });
    glint(820);
    tab.style.transition = 'color .3s'; tab.style.color = '#ededed';
    b.textContent = '2'; b.style.background = 'var(--fc-brand-solid)'; b.style.transform = 'scale(1.4)';
    this.at(220, () => { b.style.transform = 'scale(1)'; });
    this.at(1100, () => { b.style.background = '#2e2e2e'; tab.style.color = '#6b6b6b'; });
  });
}
