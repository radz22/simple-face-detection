import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const session = req.auth;
  const isAdmin = session?.user?.role === 'ADMIN';
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isAttendanceRoute = req.nextUrl.pathname === '/attendance';
  const isProfileRoute = req.nextUrl.pathname === '/profile';

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect admins away from attendance and profile routes
  if (isAdmin && (isAttendanceRoute || isProfileRoute)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/attendance', '/profile'],
};
