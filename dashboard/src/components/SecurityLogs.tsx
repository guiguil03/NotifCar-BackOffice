import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type AuthLog = {
  id: string
  type: string
  action: string
  label: string
  timestamp: string
  ip: string | null
  user_id: string | null
  email: string | null
  severity: 'low' | 'medium' | 'high'
}

type ScanLog = {
  id: string
  created_at: string
  vehicle_id: string | null
  reporter_id: string | null
  success: boolean
}

type AbuseReport = {
  id: string
  created_at: string
  reason: string
  description?: string
  status: string
  severity?: string
  reported_by_user_id?: string
}

type ConsentLog = {
  id: string
  consent_date: string
  user_id: string
  consent_type: string
  consented: boolean
  version?: string
}

type Tab = 'auth' | 'scans' | 'abuses' | 'consents'

const BLUE = '#2633E1'

const severityBadge = (s: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    high:   { bg: 'rgba(239,68,68,0.08)',   color: '#EF4444', label: 'Élevée' },
    medium: { bg: 'rgba(245,158,11,0.08)',  color: '#F59E0B', label: 'Moyenne' },
    low:    { bg: 'rgba(16,185,129,0.08)',  color: '#10B981', label: 'Faible' },
  }
  const style = map[s] || { bg: '#F1F5F9', color: '#94A3B8', label: s }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, background: style.bg, color: style.color }}>
      {style.label}
    </span>
  )
}

const actionIcon: Record<string, string> = {
  login:                    '🔓',
  logout:                   '🚪',
  signup:                   '✨',
  token_refreshed:          '🔄',
  password_recovery:        '🔑',
  user_updated:             '✏️',
  user_deleted:             '🗑️',
  user_banned:              '🚫',
  invalid_login_attempt:    '⚠️',
  login_failed:             '⚠️',
  mfa_challenge_verified:   '🛡️',
}

export default function SecurityLogs() {
  const [authLogs, setAuthLogs]     = useState<AuthLog[]>([])
  const [scans, setScans]           = useState<ScanLog[]>([])
  const [abuses, setAbuses]         = useState<AbuseReport[]>([])
  const [consents, setConsents]     = useState<ConsentLog[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<Tab>('auth')
  const [search, setSearch]         = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error: fnErr } = await supabase.functions.invoke('admin-auth-logs', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (fnErr) throw fnErr

      setAuthLogs(data.authLogs || [])
      setScans(data.scans || [])
      setAbuses(data.abuses || [])
      setConsents(data.consents || [])
    } catch (e: any) {
      console.error(e)
      setError('Impossible de charger les logs')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'auth',     label: 'Authentification', count: authLogs.length },
    { id: 'scans',    label: 'Scans QR',          count: scans.length },
    { id: 'abuses',   label: 'Signalements',       count: abuses.length },
    { id: 'consents', label: 'Consentements',      count: consents.length },
  ]

  const filteredAuth = authLogs.filter(l =>
    !search || l.email?.toLowerCase().includes(search.toLowerCase()) || l.label.toLowerCase().includes(search.toLowerCase()) || l.ip?.includes(search)
  )

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Logs de sécurité</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>Activité d'authentification et événements sensibles</p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', background: BLUE, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.83rem', fontWeight: 600,
            color: activeTab === t.id ? BLUE : '#64748B',
            borderBottom: activeTab === t.id ? `2px solid ${BLUE}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
            <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 99, fontSize: '0.7rem', background: activeTab === t.id ? `${BLUE}15` : '#F1F5F9', color: activeTab === t.id ? BLUE : '#94A3B8', fontWeight: 700 }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Chargement…</div>}
      {error   && <div style={{ textAlign: 'center', padding: 40, color: '#EF4444' }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* ── Auth logs ── */}
          {activeTab === 'auth' && (
            <>
              <input
                placeholder="Rechercher par email, action, IP…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.83rem', marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                {filteredAuth.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Aucun log d'authentification</div>
                )}
                {filteredAuth.map((log, i) => (
                  <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '11px 16px', alignItems: 'center', background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '1rem' }}>{actionIcon[log.action] || '🔹'}</span>
                    <div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0F172A' }}>{log.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>
                        {log.email || 'Anonyme'}
                        {log.ip && <span style={{ marginLeft: 8, color: '#CBD5E1' }}>· {log.ip}</span>}
                        <span style={{ marginLeft: 8 }}>{fmt(log.timestamp)}</span>
                      </div>
                    </div>
                    {severityBadge(log.severity)}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Scans QR ── */}
          {activeTab === 'scans' && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              {scans.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Aucun scan enregistré</div>}
              {scans.map((s, i) => (
                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '11px 16px', background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
                  <span>{s.success ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0F172A' }}>
                      Scan {s.success ? 'réussi' : 'échoué'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>
                      Véhicule : {s.vehicle_id?.substring(0, 12)}…
                      {s.reporter_id && <span style={{ marginLeft: 8 }}>· Par : {s.reporter_id.substring(0, 8)}…</span>}
                      <span style={{ marginLeft: 8 }}>{fmt(s.created_at)}</span>
                    </div>
                  </div>
                  {severityBadge(s.success ? 'low' : 'medium')}
                </div>
              ))}
            </div>
          )}

          {/* ── Signalements ── */}
          {activeTab === 'abuses' && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              {abuses.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Aucun signalement</div>}
              {abuses.map((a, i) => (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '11px 16px', background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
                  <span>⚠️</span>
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0F172A' }}>{a.reason}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>
                      {a.description && <span>{a.description} · </span>}
                      Statut : {a.status}
                      <span style={{ marginLeft: 8 }}>{fmt(a.created_at)}</span>
                    </div>
                  </div>
                  {severityBadge(a.severity || 'medium')}
                </div>
              ))}
            </div>
          )}

          {/* ── Consentements ── */}
          {activeTab === 'consents' && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              {consents.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Aucun consentement enregistré</div>}
              {consents.map((c, i) => (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '11px 16px', background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
                  <span>{c.consented ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0F172A' }}>
                      {c.consent_type.toUpperCase()} — {c.consented ? 'Accepté' : 'Refusé'}
                      {c.version && <span style={{ fontWeight: 400, color: '#94A3B8' }}> v{c.version}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>
                      {c.user_id.substring(0, 12)}… · {fmt(c.consent_date)}
                    </div>
                  </div>
                  {severityBadge(c.consented ? 'low' : 'medium')}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
