// pnpm db:supabase-sql [--app-password <password>] > setup.sql
// Writes one script to paste into the Supabase SQL editor and run as the project owner. Safe to run
// again: each migration applies once (recorded exactly as `pnpm db:migrate` records it), reference
// data is upserted, and grants are idempotent. It also:
//   - closes Supabase's automatic public API (anon and authenticated roles) on every app table;
//   - with --app-password, creates or updates `hiddengems_app`, the app's own login: it can read and
//     write rows but cannot create, alter, drop or truncate anything.
import { buildSupabaseSql } from '../supabase-sql';

const at = process.argv.indexOf('--app-password');
const password = at > 0 ? process.argv[at + 1] : undefined;
if (at > 0 && !password) { console.error('--app-password needs a value'); process.exit(1); }
process.stdout.write(buildSupabaseSql({ appPassword: password }));
