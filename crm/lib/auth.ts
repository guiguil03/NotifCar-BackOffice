import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'crm_session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 jours

function getSecret(): string {
  const s = process.env.CRM_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('CRM_SESSION_SECRET not configured')
  return s
}

function getPassword(): string {
  return process.env.CRM_ADMIN_PASSWORD || ''
}

export function isAuthEnabled(): boolean {
  return !!process.env.CRM_ADMIN_PASSWORD
}

export function checkPassword(input: string): boolean {
  const expected = getPassword()
  if (!expected) return false
  const a = Buffer.from(input, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function signSession(): string {
  const payload = `${Date.now() + SESSION_DURATION * 1000}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifySession(cookie: string | undefined): boolean {
  if (!cookie) return false
  const parts = cookie.split('.')
  if (parts.length !== 2) return false
  const [exp, sig] = parts
  const expectedSig = createHmac('sha256', getSecret()).update(exp).digest('hex')
  if (sig !== expectedSig) return false
  return parseInt(exp, 10) > Date.now()
}

export { COOKIE_NAME, SESSION_DURATION }
