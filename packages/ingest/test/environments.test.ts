// Previews (staging and task branches) never touch live providers, odds credits or the backup repository,
// whatever their environment variables say (docs/architecture.md, "Environments").
import { describe, expect, it } from 'vitest';
import { dataMode, providersFor } from '../src/providers';

const live = { ODDS_API_KEY: 'key', DATA_MODE: 'live', BACKUP_GITHUB_TOKEN: 'token', BACKUP_GITHUB_REPO: 'owner/backups' };

describe('environments', () => {
  it('runs production live, with the off-site backup', () => {
    expect(dataMode({ ...live, VERCEL_ENV: 'production' })).toBe('live');
    const p = providersFor({ ...live, VERCEL_ENV: 'production' });
    expect(p.odds.id).toBe('odds-api');
    expect(p.backup.id).toBe('github-backup');
    expect(p.capsuleOdds).toBeUndefined();
  });

  it('gives capsules the paid key and leaves live pulls on the free one', () => {
    const p = providersFor({ ...live, ODDS_API_KEY_PAID: 'paid', VERCEL_ENV: 'production' });
    expect(p.odds.id).toBe('odds-api');
    expect(p.capsuleOdds?.id).toBe('odds-api-paid');
    expect(providersFor({ ...live, ODDS_API_KEY_PAID: 'paid', VERCEL_ENV: 'preview' }).capsuleOdds).toBeUndefined();
  });

  it('keeps every preview on sample data with a local backup, even with live keys set', () => {
    expect(dataMode({ ...live, VERCEL_ENV: 'preview' })).toBe('sample');
    const p = providersFor({ ...live, VERCEL_ENV: 'preview' });
    expect(p.odds.id).toBe('sample');
    expect(p.schedule.id).toBe('sample');
    expect(p.backup.id).toBe('memory');
  });

  it('stays live when VERCEL_ENV is unset (local runs, the CLI)', () => {
    expect(dataMode(live)).toBe('live');
    expect(providersFor(live).backup.id).toBe('github-backup');
  });

  it('defaults to sample without a key', () => {
    expect(dataMode({})).toBe('sample');
  });
});
