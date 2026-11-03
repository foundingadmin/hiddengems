// pnpm db:supabase-apply production [--sql "<statement>"]
// Rapid build mode (AGENTS.md, "Database"): sends the setup script from `pnpm db:supabase-sql` (every
// migration once, reference data, grants) to a Supabase project through the Management API, so no one
// pastes it by hand. With --sql it runs that statement instead and prints the rows.
// Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PRODUCTION_REF (the project ref in the dashboard URL). Staging has
// no database of its own: previews run on an in-memory fixture (apps/web/lib/db.ts). History tables still reject edits and the app login still cannot alter anything.
import { buildSupabaseSql } from '../supabase-sql';

const [target, flag, statement] = process.argv.slice(2);
function fail(message: string): never { console.error(message); process.exit(1); }

if (target !== 'production') fail('Usage: pnpm db:supabase-apply production [--sql "<statement>"]');
if (flag && (flag !== '--sql' || !statement)) fail('--sql needs a statement');
const token = process.env.SUPABASE_ACCESS_TOKEN || fail('SUPABASE_ACCESS_TOKEN is not set');
const ref = process.env.SUPABASE_PRODUCTION_REF || fail('SUPABASE_PRODUCTION_REF is not set');

const query = statement ?? buildSupabaseSql();
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
const body = await res.text();
if (!res.ok) fail(`Supabase answered ${res.status} for ${target}: ${body}`);
console.log(statement ? body : `Applied the setup script to ${target}`);
