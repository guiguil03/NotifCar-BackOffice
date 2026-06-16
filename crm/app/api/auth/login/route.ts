import { NextRequest, NextResponse } from 'next/server'
import { checkPassword, signSession, COOKIE_NAME, SESSION_DURATION, isAuthEnabled } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: 'Auth not configured (set CRM_ADMIN_PASSWORD)' }, { status: 503 })
  }
  const { password } = await req.json()
  if (!checkPassword(password ?? '')) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }
  const session = signSession()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  })
  return res
}
