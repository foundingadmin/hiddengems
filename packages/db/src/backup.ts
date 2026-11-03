// Whole-database backup and restore as plain JSON, table by table in foreign key order. The nightly
// backup job writes it off-site; `pnpm db:restore <file>` loads it into an empty database.
import { gunzipSync, gzipSync } from 'node:zlib';
import { type AnyColumn, getTableColumns, getTableName } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { type Db, isMissingTable } from './client';
import {
  bets, books, estimates, games, gemMarks, gemRecords, grades, jobSettings, markets, oddsLatest, oddsSlots, oddsSnapshots, picks, playerGameStats, playerUsage,
  players, providerCaps, providerRefs, providerUsage, runs, slipLegs, slips, teams,
} from './schema';

/** Every table worth keeping, parents before children. Run logs and job locks are left out: they are noise. */
export const BACKUP_TABLES: PgTable[] = [
  teams, books, markets, players, games, providerRefs, oddsSnapshots, oddsLatest, oddsSlots, estimates, picks,
  playerGameStats, playerUsage, gemMarks, bets, slips, slipLegs, gemRecords, grades, runs, providerUsage, jobSettings, providerCaps,
];


export interface Backup {
  version: 1;
  takenAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export async function dumpDatabase(db: Db, now = new Date()): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const t of BACKUP_TABLES) {
    // A table whose migration has not run yet is left out, so the backup keeps working until it does.
    try {
      tables[getTableName(t)] = await db.select().from(t) as Record<string, unknown>[];
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }
  }
  return { version: 1, takenAt: now.toISOString(), tables };
}

export const packBackup = (b: Backup): Uint8Array => gzipSync(JSON.stringify(b));
export const unpackBackup = (bytes: Uint8Array): Backup => JSON.parse(gunzipSync(bytes).toString('utf8')) as Backup;

/** A readable summary: when, and how many rows in each table. */
export function backupSummary(b: Backup, file: string, bytes: number): string {
  const rows = Object.entries(b.tables).map(([name, r]) => `| ${name} | ${r.length} |`).join('\n');
  return `# Hidden Gems database backup\n\nLatest: \`${file}\`, taken ${b.takenAt}, ${(bytes / 1024).toFixed(1)} KB gzipped.\n` +
    'Every earlier night is in this repository\'s history. Restore one with `pnpm db:restore <file>` against an empty, migrated database.\n\n' +
    `| Table | Rows |\n|---|---|\n${rows}\n`;
}

const isTimestamp = (c: AnyColumn) => c.columnType === 'PgTimestamp';

/** Loads a backup into a migrated database. Rows that already exist are left as they are. */
export async function restoreDatabase(db: Db, b: Backup): Promise<Record<string, number>> {
  const restored: Record<string, number> = {};
  for (const t of BACKUP_TABLES) {
    const name = getTableName(t);
    const rows = b.tables[name] ?? [];
    const cols = Object.entries(getTableColumns(t));
    const revive = (r: Record<string, unknown>) => Object.fromEntries(cols.map(([key, c]) => {
      const v = r[key];
      return [key, isTimestamp(c) && typeof v === 'string' ? new Date(v) : v];
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(t).values(rows.slice(i, i + 500).map(revive)).onConflictDoNothing();
    }
    restored[name] = rows.length;
  }
  return restored;
}
