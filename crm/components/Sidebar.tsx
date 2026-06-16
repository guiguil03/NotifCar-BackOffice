'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  {
    section: 'Principal',
    items: [
      { href: '/', label: 'Tableau de bord', icon: <GridIcon />, badge: null },
      { href: '/contacts', label: 'Contacts CRM', icon: <UsersIcon />, badge: null },
      { href: '/clients', label: 'Abonnés app', icon: <UsersIcon />, badge: null },
      { href: '/pipeline', label: 'Pipeline Entreprise', icon: <PipeIcon />, badge: null },
      { href: '/tasks', label: 'Tâches & Relances', icon: <CheckIcon />, badge: null },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/invoices', label: 'Devis & Factures', icon: <DocIcon />, badge: null },
      { href: '/ca', label: "Chiffre d'Affaires", icon: <TrendIcon />, badge: null },
    ],
  },
  {
    section: 'Analyses',
    items: [
      { href: '/rapports', label: 'Rapports & Analytics', icon: <BarIcon />, badge: null },
      { href: '/calendar', label: 'Calendrier', icon: <CalIcon />, badge: null },
    ],
  },
  {
    section: 'Système',
    items: [
      { href: '/settings', label: 'Paramètres', icon: <CogIcon />, badge: null },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">🚗</div>
        <div>
          <div className="logo-text">Notifcar</div>
          <div className="logo-badge">Enterprise CRM</div>
        </div>
      </div>
      <nav className="nav">
        {navItems.map((section) => (
          <div key={section.section} className="nav-section">
            <div className="nav-label">{section.section}</div>
            {section.items.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${active ? ' active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="user-block">
        <div className="avatar">NC</div>
        <div style={{ flex: 1 }}>
          <div className="user-name">Admin</div>
          <div className="user-role">Propriétaire</div>
        </div>
        <button
          onClick={logout}
          title="Se déconnecter"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink4)', padding: 4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h4"/>
      <circle cx="17" cy="17" r="4"/><path d="M21 21l-1.5-1.5"/>
    </svg>
  )
}
function PipeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18M3 12h18M3 18h18"/>
      <circle cx="7" cy="6" r="2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
      <circle cx="17" cy="18" r="2" fill="currentColor" stroke="none"/>
    </svg>
  )
}
function DocIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  )
}
function TrendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  )
}
function BarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}
function CalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function CogIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
