import { NextRequest, NextResponse } from 'next/server'
import { verifySessionEdge, isAuthEnabledEdge, COOKIE_NAME } from '@/lib/auth-edge'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout']

export async function middleware(req: NextRequest) {
  // Si pas de mot de passe configuré, auth désactivée (utile en dev local)
  if (!isAuthEnabledEdge()) {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl

  // Routes publiques
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Assets Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value
  const valid = await verifySessionEdge(cookie)

  if (!valid) {
    // API → 401, pages → redirect /login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
