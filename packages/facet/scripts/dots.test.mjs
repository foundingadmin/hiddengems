// Motion rule 1, dots never touch: alloc must leave every pair at least the margin apart, whatever it is given.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alloc } from '../js/dots.mjs';

const closest = (dots) => {
  let min = Infinity;
  for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
    const a = dots[i], b = dots[j];
    if (a.rr <= 0.02 || b.rr <= 0.02) continue; // not drawn
    min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y) - a.rr - b.rr);
  }
  return min;
};

test('a dense cloud of large dots keeps a 1px gap', () => {
  for (let run = 0; run < 50; run++) {
    const dots = Array.from({ length: 80 }, () => ({ x: Math.random() * 60, y: Math.random() * 40, dr: 2 + Math.random() * 6 }));
    alloc(dots);
    assert.ok(closest(dots) >= 1 - 1e-9);
  }
});

test('dots with room keep the radius they asked for', () => {
  const dots = [{ x: 0, y: 0, dr: 3 }, { x: 100, y: 0, dr: 3 }];
  alloc(dots);
  assert.deepEqual(dots.map((d) => d.rr), [3, 3]);
});

test('dots larger than the grid cell still never touch', () => {
  const dots = Array.from({ length: 40 }, (_, i) => ({ x: i * 13, y: (i % 3) * 7, dr: 14 }));
  alloc(dots, 2);
  assert.ok(closest(dots) >= 2 - 1e-9);
});
