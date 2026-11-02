// Hidden Gems is private (docs/vercel-deployment.md, "Access"). Every page sits behind HTTP Basic auth
// with APP_PASSWORD. Cron routes are excluded here and check CRON_SECRET themselves. In production a
// missing APP_PASSWORD closes the app rather than leaving odds and stakes on an open URL.
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
      return new NextResponse('Set APP_PASSWORD to open Hidden Gems.', { status: 503 });
    }
    return NextResponse.next();
  }
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
