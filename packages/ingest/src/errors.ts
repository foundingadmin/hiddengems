// Every failure says whose move it is (Facet patterns/failures.md):
// - ours: something we can fix (a missing or rejected key, a used-up quota, a payload we cannot read)
// - provider: out of our hands (their outage, timeouts); we wait and the next run retries

export type FailureOwner = 'ours' | 'provider';

export class JobError extends Error {
  constructor(
    message: string,
    readonly owner: FailureOwner,
    readonly code: string,
    readonly detail: { provider?: string; status?: number; requestId?: string; url?: string } = {},
  ) {
    super(message);
    this.name = 'JobError';
  }
}

/** Ours to fix: configuration, keys, quota, or an adapter that no longer matches the payload. */
export const ours = (code: string, message: string, detail?: JobError['detail']) => new JobError(message, 'ours', code, detail);
/** The provider's problem: outages, timeouts, server errors. */
export const theirs = (code: string, message: string, detail?: JobError['detail']) => new JobError(message, 'provider', code, detail);

export function toJobError(err: unknown): JobError {
  if (err instanceof JobError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new JobError(message, 'ours', 'unexpected');
}
