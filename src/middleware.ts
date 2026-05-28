import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN || 'secret-admin-token-123';
  const cookie = request.cookies.get('admin_token');

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!cookie || cookie.value !== adminToken) {
      // Redirect to login if unauthorized
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // If logged in, don't let them see the login page again
  if (request.nextUrl.pathname === '/') {
    if (cookie && cookie.value === adminToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
