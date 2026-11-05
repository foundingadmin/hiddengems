LEN = 7000;
reset() { this.$$('[data-u]').forEach((c) => c.classList.add('shiny')); this.left = 3; }
readCard(c) {
  const b = this.box(c), n = this.$('[data-k=cnt]');
  this.cloud({ x0: b.x + 10, y0: b.y + b.h / 2, x1: b.x + b.w - 10, y1: b.y + b.h / 2, T: 420, n: 16, r0: 2.6, r1: .3, rx0: 16, ry0: 13, rx1: 30, ry1: 20, o0: 1, o1: .3, cols: this.brand() });
  this.at(170, () => { c.classList.remove('shiny'); this.left--; n.textContent = this.left ? this.left + ' new' : ''; });
}
scene() {
  const C = [0, 1, 2, 3, 4].map((i) => this.$('[data-k=nc' + i + ']')), bt = this.$('[data-k=mark]');
  // Opening one gem reads just that gem.
  this.at(900, () => this.tap(C[0]));
  this.at(1000, () => this.readCard(C[0]));
  // Mark all read reads the rest, top down.
  this.at(2500, () => this.tap(bt));
  this.at(2600, () => { this.readCard(C[1]); this.at(170, () => this.readCard(C[2])); this.at(340, () => { bt.style.opacity = '0'; }); });
  // Nothing unread: the list settles back into rating order.
  this.at(4000, () => { const d = C[3].getBoundingClientRect().top - C[2].getBoundingClientRect().top, k = this.sc(); C[2].style.transform = 'translateY(' + d / k + 'px)'; C[3].style.transform = 'translateY(' + (-d / k) + 'px)'; });
}
