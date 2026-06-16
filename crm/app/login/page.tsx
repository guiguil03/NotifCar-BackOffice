'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/'

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Connexion refusée')
      }
      router.push(redirect)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: 'var(--white)', padding: 36, borderRadius: 12,
        boxShadow: 'var(--shadow-lg)', width: 380,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>🚗</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>
          Notifcar CRM
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 4 }}>
          Connexion administrateur
        </div>
      </div>

      <div className="form-field" style={{ marginBottom: 16 }}>
        <label className="form-label">Mot de passe</label>
        <input
          className="form-input"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 6, marginBottom: 14,
          background: 'var(--crimson-lt)', color: 'var(--crimson)',
          fontSize: 12, fontWeight: 600,
        }}>
          ✕ {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-gold"
        disabled={loading || !password}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--ivory)',
    }}>
      <Suspense fallback={<div>Chargement…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
