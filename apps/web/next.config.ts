import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript and CSS source; Next compiles them (no package build step).
  transpilePackages: ['@foundingcreative/facet', '@hiddengems/core', '@hiddengems/db', '@hiddengems/ingest'],
  // PGlite loads WebAssembly from its own package at runtime.
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default config;
