LEN = 0;
scene() {
  const card = this.$('[data-k=top]');
  this.tick = (now) => {
    const b = this.box(card), per = 2 * (b.w + b.h), t = (now - this.t0) / 5200;
    for (let i = 0; i < 6; i++) {
      let s = ((t - i * .017) % 1 + 1) % 1 * per, x, y;
      if (s < b.w) { x = b.x + s; y = b.y; } else if (s < b.w + b.h) { x = b.x + b.w; y = b.y + s - b.w; } else if (s < 2 * b.w + b.h) { x = b.x + b.w - (s - b.w - b.h); y = b.y + b.h; } else { x = b.x; y = b.y + b.h - (s - 2 * b.w - b.h); }
      this.dot(x, y, 2.1 * (1 - i * .13), i === 0 ? this.tk(1) : this.tk(2), 1 - i * .14);
    }
  };
}
