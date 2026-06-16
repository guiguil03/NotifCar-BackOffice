import {
  AlertTriangle,
  BarChart2,
  Car,
  CreditCard,
  Home,
  LayoutDashboard,
  Lock,
  MessageSquare,
  QrCode,
  Shield,
  Headphones,
  TrendingUp,
  Users,
} from 'lucide-react'
import React from 'react'

type NavItem = { id: string; label: string }

const NAV_ICONS: Record<string, React.ReactNode> = {
  overview:            <LayoutDashboard size={16} />,
  vehicles:            <Car size={16} />,
  users:               <Users size={16} />,
  conversations:       <MessageSquare size={16} />,
  signalizations:      <AlertTriangle size={16} />,
  analytics:           <BarChart2 size={16} />,
  charts:              <TrendingUp size={16} />,
  subscriptions:       <CreditCard size={16} />,
  security:            <Lock size={16} />,
  moderation:          <Shield size={16} />,
  support:             <Headphones size={16} />,
  qrcodes:             <QrCode size={16} />,
  'my-overview':       <Home size={16} />,
  'my-vehicles':       <Car size={16} />,
  'my-conversations':  <MessageSquare size={16} />,
  'my-signalizations': <AlertTriangle size={16} />,
}

// ── Navigation admin complète ──
const ADMIN_MAIN: NavItem[] = [
  { id: 'overview',       label: 'Vue d\'ensemble' },
  { id: 'vehicles',       label: 'Véhicules' },
  { id: 'users',          label: 'Utilisateurs' },
  { id: 'conversations',  label: 'Conversations' },
  { id: 'signalizations', label: 'Signalisations' },
]
const ADMIN_ANALYTICS: NavItem[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'charts',    label: 'Graphiques' },
]
const ADMIN_TOOLS: NavItem[] = [
  { id: 'subscriptions', label: 'Abonnements' },
  { id: 'security',      label: 'Logs Sécurité' },
  { id: 'moderation',    label: 'Modération' },
  { id: 'support',       label: 'Support' },
  { id: 'qrcodes',       label: 'QR Codes' },
]

// ── Navigation utilisateur restreinte ──
const USER_NAV: NavItem[] = [
  { id: 'my-overview',       label: 'Mon tableau de bord' },
  { id: 'my-vehicles',       label: 'Mes véhicules' },
  { id: 'my-conversations',  label: 'Mes conversations' },
  { id: 'my-signalizations', label: 'Mes signalisations' },
]

const LOGO_URL = 'https://lifmyjdygwakmimjgkef.supabase.co/storage/v1/object/public/alert-images/notifcar-app-icon.jpg'

export default function Sidebar({ activeTab, setActiveTab, isAdmin }: {
  activeTab: string
  setActiveTab: (t: any) => void
  isAdmin: boolean
}) {
  const renderNav = (items: NavItem[]) =>
    items.map(item => (
      <button
        key={item.id}
        className={activeTab === item.id ? 'active' : ''}
        onClick={() => setActiveTab(item.id)}
      >
        <span className="nav-icon">{NAV_ICONS[item.id]}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
      </button>
    ))

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src={LOGO_URL} alt="NotifCar" className="sidebar-logo-img" />
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">NotifCar</span>
          <span className="sidebar-logo-badge">{isAdmin ? 'Admin Console' : 'Mon espace'}</span>
        </div>
      </div>

      {isAdmin ? (
        <>
          <div className="sidebar-section-label">Général</div>
          <nav className="nav">{renderNav(ADMIN_MAIN)}</nav>
          <div className="sidebar-section-label">Analytics</div>
          <nav className="nav">{renderNav(ADMIN_ANALYTICS)}</nav>
          <div className="sidebar-section-label">Administration</div>
          <nav className="nav">{renderNav(ADMIN_TOOLS)}</nav>
        </>
      ) : (
        <>
          <div className="sidebar-section-label">Mon compte</div>
          <nav className="nav">{renderNav(USER_NAV)}</nav>
        </>
      )}
    </div>
  )
}
