LEN = 0;
reset() {
  this.book = this.Z.path === 'short' ? 'DraftKings' : ['st-pause', 'st-built', 'st-anyway', 'st-send', 'st-keep', 'st-clear'].includes(this.Z.path) ? 'FanDuel' : null; this.edited = false; this.gone = {}; this.manual = false; this.undoFn = null; this.magicOn = false;
  if (this.book) this.setCta();
  if (!this.bound) { this.bound = true; this.root.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); if (!a) return; if (!this.manual) { this.manual = true; this.clearT(); } this.act(a.getAttribute('data-act'), a.getAttribute('data-arg')); }); }
}
setCta() { const c = this.$('[data-k=cta]'); c.textContent = this.book ? 'Send to ' + this.book : 'Choose a sportsbook'; const b = this.$('[data-k=bookname]'); b.textContent = this.book || 'Not chosen yet'; }
sheet(k, on) { const s = this.$('[data-k=' + k + ']'), bd = this.$('[data-k=bd]'); s.style.transform = on ? 'none' : 'translateY(100%)'; bd.style.opacity = on ? '1' : '0'; bd.style.pointerEvents = on ? 'auto' : 'none'; }
nums(skip) { const O = [1.8, 1.56, 2.6], P = [.55, .65, .4]; let o = 1, p = 1, n = 0; O.forEach((v, i) => { if (!this.gone[i] && i !== skip) { o *= v; p *= P[i]; n++; } }); return { pay: '$' + Math.round(20 * o), la: Math.round((1 - p) * 100) + '%', n }; }
paint() { const v = this.nums(-1); this.$('[data-k=pay]').textContent = '$20 stake · pays ' + v.pay; this.$('[data-k=la]').textContent = 'Lose it all ' + v.la; const t = this.$('[data-k=tag]'); t.textContent = this.edited ? 'Edited by you. The Jeweler\'s read no longer applies.' : 'Built by Hidden Gems. The Jeweler says keep all three.'; }
act(a, arg) {
  if (a === 'cta') { if (this.book) this.magic(); else this.sheet('sb', true); }
  if (a === 'book') this.sheet('sb', true);
  if (a === 'pick') { this.book = arg; this.setCta(); this.sheet('sb', false); }
  if (a === 'rm') { const i = +arg; this.leg = i; if (this.edited) { this.removeLeg(i); return; } const v = this.nums(-1), w = this.nums(i); this.$('[data-k=pname]').textContent = 'Removing ' + this.$('[data-k=r' + i + '] [data-n]').textContent + ' changes the slip:'; this.$('[data-k=pa]').textContent = v.pay + ' → ' + w.pay; this.$('[data-k=pb]').textContent = v.la + ' → ' + w.la; this.$('[data-k=pc]').textContent = v.n + ' → ' + w.n; this.sheet('sp', true); }
  if (a === 'keepbuilt') this.sheet('sp', false);
  if (a === 'anyway') { this.sheet('sp', false); this.at(260, () => this.removeLeg(this.leg)); }
  if (a === 'keepslip') { this.$('[data-k=sent]').style.opacity = '0'; this.$('[data-k=sent]').style.pointerEvents = 'none'; const c = this.$('[data-k=cta]'); c.textContent = 'Sent to ' + this.book; c.style.background = '#1f1f1f'; c.style.color = '#a1a1a1'; this.$('[data-k=slipcard]').style.opacity = '1'; }
  if (a === 'clearslip') this.clearAll();
  if (a === 'undo' && this.undoFn) this.undoFn();
}
removeLeg(i) { const r = this.$('[data-k=r' + i + ']'), g = this.$('[data-k=g' + i + ']'), x = this.box(this.$('[data-k=x' + i + ']')), ox = x.x + x.w / 2, W = this.cascade(r, g, ox), h = r.offsetHeight;
  this.at(W + 120, () => { r.style.transition = 'height .22s, padding .22s'; r.style.height = '0px'; r.style.paddingTop = '0px'; r.style.paddingBottom = '0px'; r.style.borderBottomWidth = '0px'; this.gone[i] = 1; const was = this.edited; this.edited = true; this.paint();
    this.toast(0, () => { delete this.gone[i]; this.edited = was; this.paint(); r.style.height = (h - 21) + 'px'; r.style.paddingTop = '10px'; r.style.paddingBottom = '10px'; r.style.borderBottomWidth = '1px'; this.at(230, () => { r.style.height = ''; this.uncascade(r, ox); }); }, 'Leg removed'); }); }
clearAll() { const sent = this.$('[data-k=sent]'), emp = this.$('[data-k=emp]'), b = this.box(this.$('[data-k=clearbtn]')), x0 = b.x + b.w / 2, y0 = b.y + b.h / 2;
  this.cloud({ x0, y0, x1: this.W / 2, y1: 150, arc: 30, T: 640, n: 80, r0: 5, r1: .2, rx0: 70, ry0: 26, rx1: 190, ry1: 70, o0: 1, o1: .3, cols: this.brand() });
  sent.style.opacity = '0'; sent.style.pointerEvents = 'none'; this.at(300, () => { emp.style.opacity = '1'; emp.style.pointerEvents = 'auto'; });
  this.at(700, () => this.toast(0, () => { emp.style.opacity = '0'; emp.style.pointerEvents = 'none'; sent.style.opacity = '1'; sent.style.pointerEvents = 'auto'; }, 'Slip cleared')); }
// The big moment: the slip dissolves, the dots fill the screen in chaos, form one huge gem, hold, then swirl out through the edges.
magic() {
  if (this.magicOn) return; this.magicOn = true;
  const ov = this.$('[data-k=ovl]'), lab = this.$('[data-k=ovt]'), sent = this.$('[data-k=sent]'), st = this.$('[data-k=stitle]'), wr = this.box(this.$('[data-k=slipcard]')), W = this.W, H = this.H, k = 3.1, cx = W / 2, cy = H / 2 - 40, cols = [this.tk(1), this.tk(2), this.tk(3), this.tk(4)];
  const D = GEMDOTS.map((g) => { const W_ = []; const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) W_.push([this.rnd(10, W - 10), this.rnd(10, H - 10)]); const fx = cx + (g[0] - 50) * k, fy = cy + (g[1] - 50) * k, s = [this.rnd(wr.x, wr.x + wr.w), this.rnd(wr.y, wr.y + wr.h)]; return { W: [s].concat(W_).concat([[fx, fy]]), fx, fy, fr: g[2] * k, c: cols[g[3]], ta: this.rnd(.45, .86), rt: this.rnd(2.5, 8), ph: this.rnd(0, 6.28), f: this.rnd(14, 30), a: this.rnd(0, 6.28), v: this.rnd(10, 40), w0: (fx + fy * 1.3) / 500 }; });
  const cr = (P, x) => { const n = P.length - 1, u = Math.min(x * n, n - 1e-6), i = Math.floor(u), t = u - i, a = P[Math.max(i - 1, 0)], b = P[i], c = P[i + 1], d = P[Math.min(i + 2, n)]; return [0, 1].map((m) => .5 * (2 * b[m] + (c[m] - a[m]) * t + (2 * a[m] - 5 * b[m] + 4 * c[m] - d[m]) * t * t + (3 * b[m] - a[m] - 3 * c[m] + d[m]) * t * t * t)); };
  const T1 = 1800, T2 = 1000, T3 = 860, t0 = performance.now(); this.undoFn = null; const tt = this.$('[data-k=toast]'); tt.style.opacity = '0'; tt.style.transform = 'translateY(8px)';
  this.$('[data-k=slipcard]').style.opacity = '0'; ov.style.opacity = '1'; ov.style.pointerEvents = 'auto'; st.textContent = 'Slip sent to ' + this.book; lab.textContent = 'Sending to ' + this.book; this.at(420, () => { lab.style.opacity = '1'; });
  this.tick = (now) => { const e = now - t0; 
    D.forEach((d) => {
      if (e < T1) { const q = e / T1; if (q < d.ta) { const x = q / d.ta, u = x * x * (3 - 2 * x), p = cr(d.W, u); d.x = p[0]; d.y = p[1]; d.dr = d.rt * (.6 + .4 * Math.sin(q * d.f + d.ph)); d.op = Math.min(1, q / .04); } else { const g = Math.min(1, (q - d.ta) / .2), pk = d.fr * 1.3 + 1; d.x = d.fx; d.y = d.fy + 16 * Math.cos(q * 7) * (1 - q); d.dr = g < .5 ? 2 + (pk - 2) * g * 2 : pk + (d.fr - pk) * (g - .5) * 2; d.op = 1; } }
      else if (e < T1 + T2) { const q = (e - T1) / T2; d.x = d.fx; d.y = d.fy; d.dr = d.fr * (.86 + .24 * Math.sin(q * 6.283 + 4.71 - d.w0 * 5) * .5 + .12); d.op = 1; }
      else { const q = Math.min(1, (e - T1 - T2) / T3), u = q * q, A = 2.2 * u, vx = (d.fx - cx) * (1 + 3.4 * u) + Math.cos(d.a) * d.v * u * 3, vy = (d.fy - cy) * (1 + 3.4 * u) + Math.sin(d.a) * d.v * u * 3; d.x = cx + vx * Math.cos(A) - vy * Math.sin(A); d.y = cy + vx * Math.sin(A) + vy * Math.cos(A); d.dr = d.fr * (1 + 1.2 * q); d.op = 1 - q * q * q; }
    });
    this.alloc(D, 1, 34); D.forEach((d) => this.dot(d.x, d.y, d.rr, d.c, d.op));
    if (e >= T1 + T2 + T3) this.tick = null; };
  this.at(T1 + T2 + 60, () => { lab.style.opacity = '0'; });
  this.at(T1 + T2 + 360, () => { sent.style.opacity = '1'; sent.style.pointerEvents = 'auto'; ov.style.opacity = '0'; ov.style.pointerEvents = 'none'; });
  this.at(T1 + T2 + T3 + 40, () => { this.magicOn = false; });
}
auto(ms, el, a, arg) { this.at(ms, () => { this.tap(this.$(el)); }); this.at(ms + 110, () => { if (!this.manual) { this.act(a, arg); } }); }
scene() {
  const p = this.Z.path;
  // Stage boards: start already in the moment before, play one step, hold, repeat.
  const sentNow = () => { const v = this.$('[data-k=sent]'); this.$('[data-k=slipcard]').style.opacity = '0'; v.style.opacity = '1'; v.style.pointerEvents = 'auto'; this.$('[data-k=stitle]').textContent = 'Slip sent to ' + this.book; };
  const again = (ms) => this.at(ms, () => this.restart());
  if (p === 'short') { this.auto(900, '[data-k=cta]', 'cta'); this.auto(6100, '[data-k=keepbtn]', 'keepslip'); again(7700); return; }
  if (p === 'st-start') return;
  if (p === 'st-pick') { this.auto(1200, '[data-k=cta]', 'cta'); again(5200); return; }
  if (p === 'st-picked') { this.sheet('sb', true); this.auto(1400, '[data-k=pick-FanDuel]', 'pick', 'FanDuel'); again(5000); return; }
  if (p === 'st-pause') { this.auto(1200, '[data-k=x1]', 'rm', '1'); again(6400); return; }
  if (p === 'st-built') { this.act('rm', '1'); this.auto(1600, '[data-k=keepbuilt]', 'keepbuilt'); again(4800); return; }
  if (p === 'st-anyway') { this.act('rm', '1'); this.auto(1600, '[data-k=anyway]', 'anyway'); again(8000); return; }
  if (p === 'st-send') { this.auto(1100, '[data-k=cta]', 'cta'); again(8200); return; }
  if (p === 'st-keep') { sentNow(); this.auto(1800, '[data-k=keepbtn]', 'keepslip'); again(5600); return; }
  if (p === 'st-clear') { sentNow(); this.auto(1800, '[data-k=clearbtn]', 'clearslip'); again(9800); return; }
  this.auto(800, '[data-k=cta]', 'cta');
  this.auto(1900, '[data-k=pick-FanDuel]', 'pick', 'FanDuel');
  this.auto(3100, '[data-k=x1]', 'rm', '1');
  if (p === 'edit') { this.auto(5900, '[data-k=anyway]', 'anyway'); this.auto(9600, '[data-k=cta]', 'cta'); this.auto(14700, '[data-k=clearbtn]', 'clearslip'); this.at(17600, () => this.restart()); return; }
  this.auto(5900, '[data-k=keepbuilt]', 'keepbuilt'); this.auto(7000, '[data-k=cta]', 'cta'); this.auto(12100, '[data-k=keepbtn]', 'keepslip'); this.at(13900, () => this.restart());
}
