LEN = 8200;
scene() {
  const w = this.$('[data-k=w1]'), r = this.$('[data-k=r1]'), g = this.$('[data-k=g1]'), ic = this.$('[data-k=ic]'), t = this.$('[data-k=tch]'), tot = this.$('[data-k=tot]');
  const pull = (n) => { r.style.transform = 'translateX(-' + n + 'px)'; t.style.transform = 'translateX(-' + n + 'px)'; ic.style.width = n + 'px'; };
  const remove = () => { const b = this.box(ic), ox = b.x + b.w / 2; t.style.opacity = '0';
    const W = this.cascade(r, g, ox); ic.style.opacity = '0';
    const la = this.$('[data-k=la]'), bd = this.$('[data-k=badge]');
    this.at(W + 80, () => { w.style.height = '0px'; w.style.borderBottomWidth = '0px'; tot.textContent = '$20 stake · 2 legs'; la.textContent = 'Lose it all 62%'; bd.textContent = '2'; });
    this.at(W + 240, () => this.toast(2600, () => { w.style.height = '64px'; w.style.borderBottomWidth = '1px'; tot.textContent = tot._t; la.textContent = la._t; bd.textContent = bd._t; r.style.transform = 'none'; ic.style.width = '0px'; this.at(240, () => { const q = this.box(w); this.uncascade(r, q.x + q.w - 30); }); })); };
  this.at(700, () => { t.style.opacity = '1'; });
  if (this.Z.hard) { this.at(850, () => pull(236)); this.at(1320, remove); return; }
  this.at(850, () => pull(84));
  this.at(1250, () => { t.style.opacity = '0'; });
  this.at(2300, () => { t.style.transition = 'none'; t.style.transform = 'translateX(-84px)'; void t.offsetWidth; t.style.transition = ''; t.style.opacity = '1'; });
  this.at(2450, () => pull(170));
  this.at(2850, remove);
}
