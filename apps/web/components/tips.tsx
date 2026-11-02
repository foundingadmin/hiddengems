'use client';
// Mounts Facet's helpers (packages/facet/js/tips.mjs): a dotted underline opens its tip on hover, focus or tap.
import { mountTips } from '@foundingcreative/facet/js/tips.mjs';
import { useEffect } from 'react';

export function Tips() {
  useEffect(() => mountTips(document).destroy, []);
  return null;
}
