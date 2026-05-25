import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if we are running in production and the request is HTTP
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol;
  
  if (process.env.NODE_ENV === 'production' && proto !== 'https' && proto !== 'https:') {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = 'https:';
    
    // Default to canonical domain if accessing an old/insecure host
    if (secureUrl.hostname === 'live.withsocio.com') {
      secureUrl.hostname = 'app.withsocio.com';
    }
    
    return NextResponse.redirect(secureUrl, 308); // 308 Permanent Redirect
  }

  // Also enforce canonical domain even if HTTPS
  if (request.nextUrl.hostname === 'live.withsocio.com') {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = 'app.withsocio.com';
    return NextResponse.redirect(canonicalUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .well-known (App Links/verification files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|.well-known).*)',
  ],
};