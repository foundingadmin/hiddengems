// The app's sign-in gate: HTTP Basic auth with APP_PASSWORD on every page. Off for now (owner decision,
// 2026-11-03: the browser prompt got in the way). Set APP_LOCK=on in Vercel and redeploy to turn it back
// on. Cron routes are excluded either way and check CRON_SECRET themselves.
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  if (process.env.APP_LOCK !== 'on') return NextResponse.next();
  const password = process.env.APP_PASSWORD;
  if (!password) return new NextResponse('Set APP_PASSWORD to open Hidden Gems.', { status: 503 });
  const header = req.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [, given] = atob(encoded).split(/:(.*)/s);
    if (given === password) return NextResponse.next();
  }
  return new NextResponse('Sign in to Hidden Gems.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Hidden Gems", charset="UTF-8"' } });
}

export const config = {
  matcher: ['/((?!api/cron|_next/static|_next/image|favicon.ico).*)'],
};
