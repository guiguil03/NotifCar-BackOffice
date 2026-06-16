import { useState } from 'react'
import '../App.css'
import { supabase } from '../lib/supabase'

const LOGO_URL = 'https://lifmyjdygwakmimjgkef.supabase.co/storage/v1/object/public/alert-images/notifcar-app-icon.jpg'

const FEATURES = [
  { icon: '📡', label: 'Suivi des véhicules en temps réel' },
  { icon: '🚨', label: 'Gestion des signalisations' },
  { icon: '💬', label: 'Messagerie intégrée' },
]



export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.')
    } else {
      onSuccess()
    }
  }

  return (
    <div className="login-responsive" style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
      background: '#F0F4FA',
    }}>
      {/* ── LEFT BRAND PANEL ── */}
      <div style={{
        flex: '0 0 52%',
        background: 'linear-gradient(145deg, #04091A 0%, #080F2A 35%, #0B1840 65%, #0E1F50 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, rgba(40,90,255,0.06) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-60px', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(40,90,255,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '80px', right: '-80px', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,200,200,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 64 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 13,
              overflow: 'hidden',
              border: '1.5px solid rgba(40,90,255,0.45)',
              boxShadow: '0 0 0 4px rgba(40,90,255,0.1), 0 4px 20px rgba(0,0,0,0.4)',
              flexShrink: 0,
            }}>
              <img src={LOGO_URL} alt="NotifCar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>NotifCar</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(50,200,200,0.85)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 2 }}>Admin Console</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(40,90,255,0.15)',
              border: '1px solid rgba(40,90,255,0.3)',
              borderRadius: 100,
              padding: '5px 14px',
              marginBottom: 24,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#32C8C8', boxShadow: '0 0 8px #32C8C8' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#A5C0FF', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Plateforme véhicule connecté</span>
            </div>
            <h1 style={{
              fontSize: '3.4rem',
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              lineHeight: 1.12,
              letterSpacing: '-0.05em',
            }}>
              Votre véhicule<br />
              vous <span style={{
                color: '#32C8C8',
                position: 'relative',
                display: 'inline-block',
              }}>parle</span>,<br />
              écoutez-le.
            </h1>
          </div>

          <p style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '1rem',
            lineHeight: 1.7,
            margin: '0 0 36px',
            fontWeight: 400,
          }}>
            Gérez vos véhicules, signalisations et conversations depuis une seule plateforme. Simple, rapide, fiable.
          </p>

          {/* Feature badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 12,
                padding: '13px 18px',
                width: '100%',
                backdropFilter: 'blur(4px)',
                transition: 'background 0.2s',
              }}>
                <span style={{
                  fontSize: '1rem',
                  width: 34,
                  height: 34,
                  background: 'rgba(40,90,255,0.15)',
                  border: '1px solid rgba(40,90,255,0.25)',
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>{f.icon}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'rgba(255,255,255,0.78)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

       
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        background: '#F0F4FA',
        position: 'relative',
      }}>
        {/* Subtle bg pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
          backgroundImage: `radial-gradient(circle, rgba(40,90,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }} />

        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.9) inset',
          padding: '44px 40px 36px',
          border: '1px solid rgba(0,0,0,0.07)',
        }}>
          {/* Card header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(40,90,255,0.07)',
              border: '1px solid rgba(40,90,255,0.15)',
              borderRadius: 100,
              padding: '5px 13px',
              marginBottom: 18,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#285AFF', boxShadow: '0 0 6px rgba(40,90,255,0.6)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#285AFF', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Espace Administrateur</span>
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.04em' }}>Connexion</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', fontWeight: 400 }}>Connectez-vous à votre tableau de bord</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                Adresse email
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@notifcar.fr"
                  disabled={loading}
                  required
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 12,
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#285AFF'; e.target.style.boxShadow = '0 0 0 3px rgba(40,90,255,0.1)'; e.target.style.background = '#fff' }}
                  onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Mot de passe</label>
                <button type="button" style={{ background: 'none', border: 'none', fontSize: '0.78rem', color: '#285AFF', cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                  Mot de passe oublié ?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 42px',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 12,
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#285AFF'; e.target.style.boxShadow = '0 0 0 3px rgba(40,90,255,0.1)'; e.target.style.background = '#fff' }}
                  onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '11px 14px',
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10,
                color: '#DC2626',
                fontSize: '0.83rem',
                fontWeight: 500,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#fff',
                background: loading ? 'rgba(40,90,255,0.6)' : 'linear-gradient(135deg, #285AFF 0%, #1a46d4 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(40,90,255,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                marginTop: 4,
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(40,90,255,0.42)' }}}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(40,90,255,0.35)' }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                  Connexion en cours…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Se connecter
                </>
              )}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>ou continuer avec</span>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>

            {/* Google button */}
            <button
              type="button"
              style={{
                width: '100%',
                padding: '11px 20px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                background: '#fff',
                border: '1.5px solid #E2E8F0',
                borderRadius: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={(e) => { const btn = e.currentTarget; btn.style.borderColor = '#CBD5E1'; btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; btn.style.background = '#FAFAFA' }}
              onMouseLeave={(e) => { const btn = e.currentTarget; btn.style.borderColor = '#E2E8F0'; btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; btn.style.background = '#fff' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuer avec Google
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 28, textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 20 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#CBD5E1' }}>© 2025 NotifCar. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
