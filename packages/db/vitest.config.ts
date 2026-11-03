import { defineConfig } from 'vitest/config';

// PGlite applies every migration in each suite's setup, which takes several seconds on a busy machine.
export default defineConfig({ test: { testTimeout: 30_000, hookTimeout: 60_000 } });
