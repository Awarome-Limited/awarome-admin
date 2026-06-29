import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/session';

const PUBLIC_ROUTES = ['/login'];

// Optimistic check only (cookie presence, not full verification) - the real
// authorization check happens server-side against the BE on every request.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(TOKEN_COOKIE);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!isPublicRoute && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


