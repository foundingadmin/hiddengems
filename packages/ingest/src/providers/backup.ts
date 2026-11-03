// Where nightly backups go. Live: a private GitHub repository (BACKUP_GITHUB_REPO, "owner/name"),
// written with a fine-grained token limited to that one repository (BACKUP_GITHUB_TOKEN, Contents
// read and write). Never this public code repository: backups hold bets and stakes.
import { ours, theirs } from '../errors';
import type { BackupTarget } from './types';

export function memoryBackup(): BackupTarget & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return { id: 'memory', where: 'memory', files, async put(_ctx, path, bytes) { files.set(path, bytes); } };
}

export function githubBackup(token: string | undefined, repo: string | undefined): BackupTarget {
  return {
    id: 'github-backup',
    where: repo ?? 'an unset BACKUP_GITHUB_REPO',
    async put(_ctx, path, bytes, message) {
      if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        throw ours('config', 'Add BACKUP_GITHUB_TOKEN and BACKUP_GITHUB_REPO (a private owner/name repository) to back up the database', { provider: 'github-backup' });
      }
      const url = `https://api.github.com/repos/${repo}/contents/${path}`;
      const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
      const call = async (init?: RequestInit) => {
        let res: Response;
        try { res = await fetch(url, { ...init, headers: { ...headers, ...init?.headers }, signal: AbortSignal.timeout(30_000) }); }
        catch { throw theirs('network', 'GitHub did not respond', { provider: 'github-backup' }); }
        if (res.status >= 500) throw theirs('server', `GitHub returned ${res.status}`, { provider: 'github-backup', status: res.status });
        if (res.status === 401 || res.status === 403) throw ours('auth', 'GitHub rejected the backup token', { provider: 'github-backup', status: res.status });
        return res;
      };
      const existing = await call();
      const sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined;
      const res = await call({ method: 'PUT', body: JSON.stringify({ message, content: Buffer.from(bytes).toString('base64'), ...(sha ? { sha } : {}) }) });
      if (res.status === 404) throw ours('config', `Backup repository ${repo} not found, or the token cannot write to it`, { provider: 'github-backup', status: 404 });
      if (!res.ok) throw ours('request', `GitHub refused the backup (${res.status})`, { provider: 'github-backup', status: res.status });
    },
  };
}
