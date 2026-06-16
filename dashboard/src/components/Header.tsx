import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../lib/auth'

const TAB_LABELS: Record<string, string> = {
  overview:            '📊 Vue d\'ensemble',
  vehicles:            '🚗 Véhicules',
  users:               '👥 Utilisateurs',
  conversations:       '💬 Conversations',
  signalizations:      '🚨 Signalisations',
  analytics:           '📈 Analytics',
  charts:              '📉 Graphiques',
  subscriptions:       '💳 Abonnements',
  security:            '🔒 Logs Sécurité',
  moderation:          '🛡️ Modération',
  support:             '🎧 Support',
  qrcodes:             '📱 QR Codes',
  'my-overview':       '🏠 Mon tableau de bord',
  'my-vehicles':       '🚗 Mes véhicules',
  'my-conversations':  '💬 Mes conversations',
  'my-signalizations': '🚨 Mes signalisations',
}

export default function Header({ onRefresh, userProfile, activeTab }: {
  onRefresh: () => void
  userProfile: UserProfile | null
  activeTab?: string
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const displayName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || userProfile.email?.split('@')[0]
    : ''
  const initials = (userProfile?.first_name?.[0] ?? userProfile?.email?.[0] ?? 'U').toUpperCase()
  const label = activeTab ? (TAB_LABELS[activeTab] ?? 'Dashboard') : 'Dashboard'

  return (
    <header className="header">
      <div className="header-left">
        <h1>{label}</h1>
        <div className="header-meta">
          <span>{dateStr}</span>
          <span className="header-meta-dot" />
          <span>{timeStr}</span>
          <span className="header-meta-dot" />
          <span className="header-live">
            <span className="header-live-dot" />
            En ligne
          </span>
        </div>
      </div>

      <div className="header-actions">
        {userProfile && (
          <div className="header-user">
            <div className="header-user-avatar">{initials}</div>
            <span className="header-user-name">{displayName}</span>
            {userProfile.role === 'admin' && (
              <span className="header-admin-badge">Admin</span>
            )}
          </div>
        )}
        <button onClick={onRefresh} className="refresh-btn">
          🔄 Actualiser
        </button>
        <button onClick={handleSignOut} className="signout-btn">
          🚪 Déconnexion
        </button>
      </div>
    </header>
  )
}
