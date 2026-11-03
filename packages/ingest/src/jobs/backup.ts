// backup: the whole database, gzipped JSON, to off-site storage every night (providers/backup.ts), plus
// a readable BACKUP.md with the row counts. One file per day; the storage keeps every earlier day.
// Restore with `pnpm db:restore <file>`.
import { backupSummary, dumpDatabase, packBackup } from '@hiddengems/db';
import type { Job } from '../runner';
import { plural } from './shared';

export const backupDatabase: Job = {
  name: 'backup',
  provider: 'backup',
  async run(ctx) {
    const target = ctx.providers.backup;
    const pctx = ctx.using(target);
    const backup = await dumpDatabase(ctx.db, ctx.now);
    const bytes = packBackup(backup);
    const file = `backups/${ctx.now.toISOString().slice(0, 10)}.json.gz`;
    await target.put(pctx, file, bytes, `Backup ${backup.takenAt}`);
    await target.put(pctx, 'BACKUP.md', new TextEncoder().encode(backupSummary(backup, file, bytes.length)), `Backup summary ${backup.takenAt}`);
    const rows = Object.values(backup.tables).reduce((n, t) => n + t.length, 0);
    // The Backups page lists these from the run log, so it never calls the storage itself.
    const tables = Object.fromEntries(Object.entries(backup.tables).map(([name, t]) => [name, t.length]));
    return {
      message: `Backed up ${plural(rows, 'row')} from ${Object.keys(backup.tables).length} tables to ${target.where}, ${(bytes.length / 1024).toFixed(1)} KB`,
      rowsWritten: 0,
      meta: { file, where: target.where, link: target.link?.(file) ?? null, bytes: bytes.length, rows, tables, takenAt: backup.takenAt },
    };
  },
};
