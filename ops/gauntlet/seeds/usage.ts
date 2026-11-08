// Usage is destiny. Snaps decide which games count, carries and targets set the volume, recent games first and last
// season early. Its chance is the shared projection's chance to clear the line. Silent with no games on record.
import type { Seed } from '../contract';
import { speakFromProjection } from './projection';

export const usage: Seed = {
  id: 'usage',
  name: 'Usage is destiny',
  read: (world) => speakFromProjection(world, () => ({ window: 'recent' })),
};
