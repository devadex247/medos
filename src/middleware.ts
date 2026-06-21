import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { canAccessDashboardPath, getDashboardRedirectPath } from '@/lib/rbac'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, role } = await updateSession(request)

  const path = request.nextUrl.pathname

  if (path.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', `${path}${request.nextUrl.search}`)
      return NextResponse.redirect(url)
    }

    if (!canAccessDashboardPath(role, path)) {
      const url = request.nextUrl.clone()
      url.pathname = getDashboardRedirectPath(role)
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if ((path === '/login' || path.startsWith('/signup')) && user) {
    const url = request.nextUrl.clone()
    url.pathname = getDashboardRedirectPath(role)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (route handlers perform their own auth checks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
