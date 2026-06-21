import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { normalizeRole } from '@/lib/rbac'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder-url.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Retrieve user session info and refresh session automatically
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Safely extract the role from authenticated token metadata (JWT claims).
  // This bypasses external database queries on every HTTP request.
  const role = normalizeRole(user?.user_metadata?.role ?? user?.app_metadata?.role)

  return { supabaseResponse, user, role }
}
