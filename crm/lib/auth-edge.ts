export const COOKIE_NAME = 'crm_session'

function getSecret(): string {
  return process.env.CRM_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const bytes = new Uint8Array(sig)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

export async function verifySessionEdge(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false
  const parts = cookie.split('.')
  if (parts.length !== 2) return false
  const [exp, sig] = parts
  const secret = getSecret()
  if (!secret) return false
  const expectedSig = await hmacHex(secret, exp)
  if (sig !== expectedSig) return false
  return parseInt(exp, 10) > Date.now()
}

export function isAuthEnabledEdge(): boolean {
  return !!process.env.CRM_ADMIN_PASSWORD
}
