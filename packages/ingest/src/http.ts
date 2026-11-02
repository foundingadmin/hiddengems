// Instrumented HTTP for providers: timeout, one retry for transient failures, request counting,
// failure classification, and a hook for quota headers.
import { ours, theirs } from './errors';

export interface HttpOptions {
  provider: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Called with every response, for quota headers. */
  onResponse?: (res: Response) => void | Promise<void>;
  fetch?: typeof fetch;
}

export interface Http {
  getJson(url: string): Promise<unknown>;
  readonly requestCount: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Keeps keys out of logs: strips apiKey and key query params. */
export const redact = (url: string) => url.replace(/([?&](api_?key|key)=)[^&]+/gi, '$1***');

export function createHttp(opts: HttpOptions): Http {
  const doFetch = opts.fetch ?? fetch;
  let requestCount = 0;
  const once = async (url: string): Promise<Response> => {
    requestCount++;
    return doFetch(url, { headers: { accept: 'application/json', ...opts.headers }, signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000) });
  };
  return {
    get requestCount() { return requestCount; },
    async getJson(url) {
      const safe = redact(url);
      let res: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await once(url);
        } catch (err) {
          if (attempt === 0) { await sleep(750); continue; }
          const timedOut = err instanceof Error && err.name === 'TimeoutError';
          throw theirs(timedOut ? 'timeout' : 'network', `${opts.provider} did not respond${timedOut ? ' in time' : ''}`, { provider: opts.provider, url: safe });
        }
        if (res.status >= 500 && attempt === 0) { await sleep(750); continue; }
        break;
      }
      if (!res) throw theirs('network', `${opts.provider} did not respond`, { provider: opts.provider, url: safe });
      await opts.onResponse?.(res);
      const requestId = res.headers.get('x-request-id') ?? res.headers.get('request-id') ?? undefined;
      const detail = { provider: opts.provider, status: res.status, requestId, url: safe };
      if (res.status === 401 || res.status === 403) throw ours('auth', `${opts.provider} rejected the API key`, detail);
      if (res.status === 429) throw ours('quota', `${opts.provider} quota or rate limit reached`, detail);
      if (res.status >= 500) throw theirs('server', `${opts.provider} returned ${res.status}`, detail);
      if (!res.ok) throw ours('request', `${opts.provider} refused the request (${res.status})`, detail);
      try {
        return await res.json();
      } catch {
        throw ours('payload', `${opts.provider} sent a response we could not read`, detail);
      }
    },
  };
}
