LEN = 7000;
scene() {
  const r = this.$('[data-k=r1]'), g = this.$('[data-k=g1]'), x = this.$('[data-k=x1]'), tot = this.$('[data-k=tot]'), la = this.$('[data-k=la]'), bd = this.$('[data-k=badge]');
  this.at(860, () => { this.tap(x); x.style.color = 'var(--fc-signal-stop-fg)'; x.style.background = 'var(--fc-signal-stop-bg)'; });
  this.at(1000, () => {
    const b = this.box(x), ox = b.x + b.w / 2, W = this.cascade(r, g, ox), h = r.offsetHeight;
    this.at(W + 120, () => { r.style.transition = 'height .22s, padding .22s'; r.style.height = '0px'; r.style.paddingTop = '0px'; r.style.paddingBottom = '0px'; r.style.borderBottomWidth = '0px'; tot.textContent = '$20 stake · 2 legs'; la.textContent = 'Lose it all 62%'; bd.textContent = '2'; });
    this.at(W + 260, () => this.toast(2600, () => {
      r.style.height = (h - 21) + 'px'; r.style.paddingTop = '10px'; r.style.paddingBottom = '10px'; r.style.borderBottomWidth = '1px'; tot.textContent = tot._t; la.textContent = la._t; bd.textContent = bd._t; x.style.color = '#8f8f8f'; x.style.background = 'transparent';
      this.at(230, () => { r.style.height = ''; this.uncascade(r, ox); });
    }));
  });
}
