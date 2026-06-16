import { AlertTriangle, BarChart2, Car, CheckCircle, Home, Link2, MessageSquare, QrCode, Smartphone, TrendingUp, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import './App.css'
import {
  BrandsPieChart,
  EngagementChart,
  GrowthChart,
  SignalizationsChart,
  SignalizationTypesChart
} from './components/Charts'
import ConversationsTable from './components/ConversationsTable'
import Header from './components/Header'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import SignalizationsTable from './components/SignalizationsTable'
import SecurityLogs from './components/SecurityLogs'
import ModerationTool from './components/ModerationTool'
import SupportInterface from './components/SupportInterface'
import SubscriptionManagement from './components/SubscriptionManagement'
import { supabase } from './lib/supabase'
import { AdminService } from './services/adminService'
import { getCurrentUserProfile, type UserProfile } from './lib/auth'

// Types définis localement pour éviter les problèmes d'import
type Vehicle = {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  color?: string;
  notes?: string;
  owner_id: string;
  qr_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type User = {
  id: string;
  email: string;
  created_at: string;
  email_verified: boolean;
}

type Conversation = {
  id: string;
  vehicle_id: string | null;
  reporter_id: string | null;
  owner_id: string | null;
  status: 'active' | 'resolved' | 'archived' | string;
  created_at: string;
}

type BrandData = {
  brand: string;
  count: number;
}

type DayData = {
  date: string;
  dayName: string;
  total: number;
  urgent: number;
  normal: number;
  types: Record<string, number>;
}

type HourData = {
  hour: string;
  messages: number;
}

interface DashboardStats {
  totalVehicles: number
  totalUsers: number
  totalConversations: number
  totalMessages: number
  totalSignalizations: number
  totalNotificationTokens: number
  totalQRCodes: number
  activeConversations: number
  resolvedConversations: number
  newVehiclesThisWeek: number
  newUsersThisMonth: number
  avgMessagesPerConversation: number
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

function App() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [signalizations, setSignalizations] = useState<unknown[]>([])
  const [notificationTokens, setNotificationTokens] = useState<unknown[]>([])
  const [popularBrands, setPopularBrands] = useState<BrandData[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [signalizationsByDay, setSignalizationsByDay] = useState<DayData[]>([])
  const [signalizationTypes, setSignalizationTypes] = useState<unknown[]>([])
  const [engagementByHour, setEngagementByHour] = useState<HourData[]>([])
  const [growthStats, setGrowthStats] = useState<Record<string, unknown>>({})
  const [recentActivity, setRecentActivity] = useState<{
    lastVehicle: string | null
    lastSignalization: string | null
    lastUser: string | null
    lastConversation: string | null
    lastToken: string | null
  }>({ lastVehicle: null, lastSignalization: null, lastUser: null, lastConversation: null, lastToken: null })
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [, setLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // États spécifiques vue utilisateur non-admin
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([])
  const [userConversations, setUserConversations] = useState<Conversation[]>([])
  const [userSignalizations, setUserSignalizations] = useState<unknown[]>([])
  const [userStats, setUserStats] = useState<any>(null)

  const loadDataForProfile = async (profile: UserProfile) => {
    if (profile.role === 'admin') {
      await loadAdminData()
    } else {
      await loadUserData(profile.user_id)
    }
  }

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session)
      setSessionReady(true)
      if (session) {
        const profile = await getCurrentUserProfile()
        setUserProfile(profile)
        if (profile) {
          if (profile.role === 'admin') setActiveTab('overview')
          else setActiveTab('my-overview')
          await loadDataForProfile(profile)
        }
      } else {
        setUserProfile(null)
      }
    })
    supabase.auth.getSession().then(async ({ data }) => {
      setIsLoggedIn(!!data.session)
      setSessionReady(true)
      if (data.session) {
        const profile = await getCurrentUserProfile()
        setUserProfile(profile)
        if (profile) {
          if (profile.role === 'admin') setActiveTab('overview')
          else setActiveTab('my-overview')
          await loadDataForProfile(profile)
        }
      }
    })
    return () => { authListener.subscription.unsubscribe() }
  }, [])

  // ── Chargement admin (toutes les données) ──
  const loadAdminData = async () => {
    try {
      setLoading(true)
      const [statsData, vehiclesData, usersData] = await Promise.all([
        AdminService.getDashboardStats(),
        AdminService.getAllVehicles(),
        AdminService.getAllUsers()
      ])
      setStats(statsData)
      setVehicles(vehiclesData)
      setUsers(usersData)

      let rawSignals: any[] = []
      try { rawSignals = await AdminService.getSignalizationsWithNames(); setSignalizations(rawSignals) } catch { setSignalizations([]) }
      try { setNotificationTokens(await AdminService.getNotificationTokens()) } catch { setNotificationTokens([]) }
      try { setConversations(await AdminService.getAllConversationsWithNames()) } catch { setConversations([]) }
      try { setPopularBrands(await AdminService.getPopularBrands()) } catch { setPopularBrands([]) }

      // Calcul des graphiques depuis les signalisations déjà chargées
      const days = 7
      const dailyMap: Record<string, DayData> = {}
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().split('T')[0]
        dailyMap[key] = { date: key, dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }), total: 0, urgent: 0, normal: 0, types: {} }
      }
      rawSignals.forEach((s: any) => {
        const key = (s.created_at || '').split('T')[0]
        if (dailyMap[key]) {
          dailyMap[key].total++
          if (s.urgency === 'urgent') dailyMap[key].urgent++
          else dailyMap[key].normal++
        }
      })
      setSignalizationsByDay(Object.values(dailyMap).reverse())

      const typesMap: Record<string, { type: string; total: number; urgent: number; normal: number }> = {}
      rawSignals.forEach((s: any) => {
        const t = s.type || 'autre'
        if (!typesMap[t]) typesMap[t] = { type: t, total: 0, urgent: 0, normal: 0 }
        typesMap[t].total++
        if (s.urgency === 'urgent') typesMap[t].urgent++
        else typesMap[t].normal++
      })
      setSignalizationTypes(Object.values(typesMap).sort((a, b) => b.total - a.total))

      try {
        const [engagement, growth] = await Promise.all([
          AdminService.getEngagementByHour(7),
          AdminService.getGrowthStats()
        ])
        setEngagementByHour(engagement)
        setGrowthStats(growth)
      } catch { /* graphiques non dispo */ }

      try { setRecentActivity(await AdminService.getRecentActivity()) } catch { /* activité non dispo */ }
    } catch (error) {
      console.error('Erreur chargement données admin:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── Chargement utilisateur (données personnelles uniquement) ──
  const loadUserData = async (authUserId: string) => {
    try {
      setLoading(true)
      const [uVehicles, uConvs, uSignals, uStats] = await Promise.all([
        AdminService.getUserVehicles(authUserId).catch(() => []),
        AdminService.getUserConversations(authUserId).catch(() => []),
        AdminService.getUserSignalizations(authUserId).catch(() => []),
        AdminService.getUserStats(authUserId).catch(() => null),
      ])
      setUserVehicles(uVehicles as Vehicle[])
      setUserConversations(uConvs as Conversation[])
      setUserSignalizations(uSignals)
      setUserStats(uStats)
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (userProfile) await loadDataForProfile(userProfile)
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      try {
        await AdminService.deleteVehicle(vehicleId)
        await handleRefresh()
        alert('Véhicule supprimé avec succès')
      } catch {
        alert('Erreur lors de la suppression')
      }
    }
  }

  const handleToggleVehicleStatus = async (vehicleId: string, currentStatus: boolean) => {
    try {
      await AdminService.toggleVehicleStatus(vehicleId, !currentStatus)
      await handleRefresh()
    } catch {
      alert('Erreur lors de la mise à jour')
    }
  }

  const isAdmin = userProfile?.role === 'admin'

  if (!sessionReady) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement…</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Login onSuccess={async () => {
      const profile = await getCurrentUserProfile()
      setUserProfile(profile)
      if (profile) {
        if (profile.role === 'admin') setActiveTab('overview')
        else setActiveTab('my-overview')
        await loadDataForProfile(profile)
      }
    }} />
  }

  return (
    <div className="dashboard">
      <Header onRefresh={handleRefresh} userProfile={userProfile} activeTab={activeTab} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />

      <main className="main">

        {/* ── Bouton retour global (toutes pages sauf accueil) ── */}
        {activeTab !== 'overview' && activeTab !== 'my-overview' && (
          <button
            className="back-btn"
            onClick={() => setActiveTab(isAdmin ? 'overview' : 'my-overview')}
          >
            ← Retour
          </button>
        )}

        {/* ═══ VUE UTILISATEUR NON-ADMIN ═══ */}
        {!isAdmin && activeTab === 'my-overview' && (
          <div className="overview">
            <div className="page-title"><Home size={20} color="#285AFF" /><h2>Mon tableau de bord</h2></div>
            <div className="stats-grid">
              <div className="stat-card" style={{ borderTop: '2px solid #285AFF' }}>
                <div className="stat-icon" style={{ background: 'rgba(40,90,255,0.1)', border: '1px solid rgba(40,90,255,0.18)' }}><Car size={20} color="#285AFF" /></div>
                <div className="stat-info">
                  <h3>{userStats?.totalVehicles ?? 0}</h3>
                  <p>Mes véhicules</p>
                  <small>{userStats?.activeVehicles ?? 0} actifs</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #10B981' }}>
                <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.18)' }}><MessageSquare size={20} color="#10B981" /></div>
                <div className="stat-info">
                  <h3>{userStats?.totalConversations ?? 0}</h3>
                  <p>Mes conversations</p>
                  <small>{userStats?.activeConversations ?? 0} en cours · {userStats?.resolvedConversations ?? 0} résolues</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #F97316' }}>
                <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.18)' }}><AlertTriangle size={20} color="#F97316" /></div>
                <div className="stat-info">
                  <h3>{userStats?.totalSignalizations ?? 0}</h3>
                  <p>Mes signalisations</p>
                  <small>{userStats?.urgentSignalizations ?? 0} urgentes</small>
                </div>
              </div>
            </div>

            <div className="overview-panels">
              {/* Derniers véhicules */}
              <div className="overview-panel">
                <div className="overview-panel-header">
                  <div className="overview-panel-title">
                    <span className="overview-panel-title-dot" style={{ background: '#285AFF' }} />
                    Mes véhicules récents
                  </div>
                  <span className="overview-panel-count">{userVehicles.length} total</span>
                </div>
                <div className="signal-list">
                  {userVehicles.slice(0, 5).map((v, i) => (
                    <div className="signal-item" key={v.id || i}>
                      <div className="signal-plate">{v.license_plate || '—'}</div>
                      <div className="signal-info">
                        <div className="signal-desc">{v.brand} {v.model} {v.year}</div>
                        <div className="signal-time">{v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : '—'}</div>
                      </div>
                      <span className={`signal-badge ${v.is_active ? 'resolved' : 'urgent'}`}>
                        {v.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  ))}
                  {userVehicles.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Aucun véhicule enregistré</div>
                  )}
                </div>
              </div>

              {/* Dernières conversations */}
              <div className="overview-panel">
                <div className="overview-panel-header">
                  <div className="overview-panel-title">
                    <span className="overview-panel-title-dot" style={{ background: '#10B981' }} />
                    Conversations récentes
                  </div>
                  <span className="overview-panel-count">{userConversations.length} total</span>
                </div>
                <div className="signal-list">
                  {userConversations.slice(0, 5).map((c, i) => (
                    <div className="signal-item" key={c.id || i}>
                      <div className="signal-plate" style={{ minWidth: 60 }}>{c.vehicle_id?.substring(0, 6) || '—'}</div>
                      <div className="signal-info">
                        <div className="signal-desc">Conversation #{c.id.substring(0, 8)}</div>
                        <div className="signal-time">{c.created_at ? new Date(c.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                      </div>
                      <span className={`signal-badge ${c.status === 'resolved' ? 'resolved' : c.status === 'active' ? 'new' : 'urgent'}`}>
                        {c.status === 'resolved' ? 'Résolu' : c.status === 'active' ? 'Actif' : c.status}
                      </span>
                    </div>
                  ))}
                  {userConversations.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Aucune conversation</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isAdmin && activeTab === 'my-vehicles' && (
          <div className="vehicles">
            <div className="page-title"><Car size={20} color="#285AFF" /><h2>Mes véhicules</h2></div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Marque / Modèle</th>
                    <th>Année</th>
                    <th>Plaque</th>
                    <th>Couleur</th>
                    <th>Statut</th>
                    <th>Enregistré le</th>
                  </tr>
                </thead>
                <tbody>
                  {userVehicles.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>Aucun véhicule enregistré</td></tr>
                  ) : userVehicles.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.brand}</strong> {v.model}</td>
                      <td>{v.year}</td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.license_plate}</span></td>
                      <td>{v.color || '—'}</td>
                      <td><span className={`status ${v.is_active ? 'active' : 'inactive'}`}>{v.is_active ? 'Actif' : 'Inactif'}</span></td>
                      <td style={{ color: '#64748B', fontSize: '0.82rem' }}>{v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isAdmin && activeTab === 'my-conversations' && (() => {
          const plateMap = Object.fromEntries(userVehicles.map(v => [v.id, v.license_plate || `${v.brand} ${v.model}`]))
          return (
            <div className="conversations">
              <div className="page-title"><MessageSquare size={20} color="#285AFF" /><h2>Mes conversations</h2></div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Véhicule</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userConversations.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>Aucune conversation</td></tr>
                    ) : userConversations.map(c => (
                      <tr key={c.id}>
                        <td>{c.vehicle_id ? (plateMap[c.vehicle_id] || c.vehicle_id.substring(0, 8) + '…') : '—'}</td>
                        <td><span className={`status ${c.status === 'resolved' ? 'resolved' : c.status === 'active' ? 'active' : 'pending'}`}>{c.status === 'resolved' ? 'Résolue' : c.status === 'active' ? 'Active' : c.status}</span></td>
                        <td style={{ color: '#64748B', fontSize: '0.82rem' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {!isAdmin && activeTab === 'my-signalizations' && (
          <div className="signalizations">
            <div className="page-title"><AlertTriangle size={20} color="#EF4444" /><h2>Mes signalisations</h2></div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Urgence</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {userSignalizations.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>Aucune signalisation</td></tr>
                  ) : (userSignalizations as any[]).map((s: any, i) => (
                    <tr key={s.id || i}>
                      <td style={{ fontWeight: 500 }}>{s.type || s.description || '—'}</td>
                      <td><span className={`status ${s.urgency === 'urgent' ? 'urgent' : 'normal'}`}>{s.urgency === 'urgent' ? 'Urgent' : 'Normal'}</span></td>
                      <td><span className={`status ${s.status === 'resolved' ? 'resolved' : 'pending'}`}>{s.status === 'resolved' ? 'Résolu' : 'En attente'}</span></td>
                      <td style={{ color: '#64748B', fontSize: '0.82rem' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ VUE ADMIN ═══ */}
        {activeTab === 'overview' && stats && (
          <div className="overview">
            <div className="stats-grid">
              <div className="stat-card" style={{ borderTop: '2px solid #10B981' }}>
                <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle size={20} color="#10B981" /></div>
                <div className="stat-info">
                  <h3>{stats.resolvedConversations}</h3>
                  <p>Conversations résolues</p>
                  <small>{stats.activeConversations} actives en cours</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #285AFF' }}>
                <div className="stat-icon" style={{ background: 'rgba(40,90,255,0.12)', border: '1px solid rgba(40,90,255,0.2)' }}><MessageSquare size={20} color="#285AFF" /></div>
                <div className="stat-info">
                  <h3>{stats.totalMessages}</h3>
                  <p>Messages échangés</p>
                  <small>{stats.avgMessagesPerConversation} msg/conv en moy.</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #8B5CF6' }}>
                <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}><Smartphone size={20} color="#8B5CF6" /></div>
                <div className="stat-info">
                  <h3>{stats.totalNotificationTokens}</h3>
                  <p>Tokens notifications</p>
                  <small>Appareils connectés</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #F97316' }}>
                <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)' }}><QrCode size={20} color="#F97316" /></div>
                <div className="stat-info">
                  <h3>{stats.totalQRCodes}</h3>
                  <p>QR Codes générés</p>
                  <small>{stats.totalVehicles} véhicules enregistrés</small>
                </div>
              </div>
            </div>

            {/* Panels: Activité récente + Signalisations */}
            <div className="overview-panels">
              {/* Activité récente */}
              <div className="overview-panel">
                <div className="overview-panel-header">
                  <div className="overview-panel-title">
                    <span className="overview-panel-title-dot" style={{ background: '#285AFF', boxShadow: '0 0 6px #285AFF' }} />
                    Activité récente
                  </div>
                  <span className="overview-panel-count">Aujourd'hui</span>
                </div>
                <div className="activity-list">
                  {[
                    { label: 'Nouveau véhicule enregistré', sub: `${stats.newVehiclesThisWeek} cette semaine`, color: '#285AFF', time: formatRelativeTime(recentActivity.lastVehicle) },
                    { label: 'Signalisation reçue', sub: `${stats.totalSignalizations} au total`, color: '#EF4444', time: formatRelativeTime(recentActivity.lastSignalization) },
                    { label: 'Nouvel utilisateur inscrit', sub: `+${stats.newUsersThisMonth} ce mois`, color: '#10B981', time: formatRelativeTime(recentActivity.lastUser) },
                    { label: 'Conversation ouverte', sub: `${stats.activeConversations} actives`, color: '#8B5CF6', time: formatRelativeTime(recentActivity.lastConversation) },
                    { label: 'Token push enregistré', sub: `${stats.totalNotificationTokens} tokens actifs`, color: '#F97316', time: formatRelativeTime(recentActivity.lastToken) },
                  ].map((item, i, arr) => (
                    <div className="activity-item" key={i}>
                      <div className="activity-timeline">
                        <div className="activity-dot" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                        {i < arr.length - 1 && <div className="activity-line" />}
                      </div>
                      <div className="activity-content">
                        <div className="activity-label">{item.label}</div>
                        <div className="activity-meta">
                          <span>{item.sub}</span>
                          <span>·</span>
                          <span>{item.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dernières signalisations */}
              <div className="overview-panel">
                <div className="overview-panel-header">
                  <div className="overview-panel-title">
                    <span className="overview-panel-title-dot" style={{ background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
                    Dernières signalisations
                  </div>
                  <span className="overview-panel-count">{stats.totalSignalizations} total</span>
                </div>
                <div className="signal-list">
                  {signalizations.length > 0 ? (signalizations as any[]).slice(0, 5).map((s: any, i: number) => (
                    <div className="signal-item" key={s.id || i}>
                      <div className="signal-plate">{(s as any).vehiclePlate || (s as any).vehicle_id?.substring(0, 8) || 'N/A'}</div>
                      <div className="signal-info">
                        <div className="signal-desc">{(s as any).type || (s as any).description || 'Signalisation'}</div>
                        <div className="signal-time">{s.created_at ? new Date(s.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                      </div>
                      <span className={`signal-badge ${(s as any).urgency === 'urgent' ? 'urgent' : s.status === 'resolved' ? 'resolved' : 'new'}`}>
                        {(s as any).urgency === 'urgent' ? 'Urgent' : s.status === 'resolved' ? 'Résolu' : 'Nouveau'}
                      </span>
                    </div>
                  )) : (
                    [
                      { plate: 'AB-123-CD', desc: 'Conduite dangereuse', badge: 'urgent', time: 'Il y a 12 min' },
                      { plate: 'EF-456-GH', desc: 'Véhicule mal stationné', badge: 'new', time: 'Il y a 45 min' },
                      { plate: 'IJ-789-KL', desc: 'Feux de stop défectueux', badge: 'resolved', time: 'Il y a 1h30' },
                      { plate: 'MN-012-OP', desc: 'Excès de vitesse', badge: 'urgent', time: 'Il y a 3h' },
                    ].map((s, i) => (
                      <div className="signal-item" key={i}>
                        <div className="signal-plate">{s.plate}</div>
                        <div className="signal-info">
                          <div className="signal-desc">{s.desc}</div>
                          <div className="signal-time">{s.time}</div>
                        </div>
                        <span className={`signal-badge ${s.badge}`}>
                          {s.badge === 'urgent' ? 'Urgent' : s.badge === 'resolved' ? 'Résolu' : 'Nouveau'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vehicles' && (() => {
          const ownerMap = Object.fromEntries((users as any[]).map((u: any) => [u.user_id || u.id, u.email || '—']))
          return (
            <div className="vehicles">
              <div className="page-title"><Car size={20} color="#285AFF" /><h2>Gestion des Véhicules</h2></div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Marque / Modèle</th>
                      <th>Année</th>
                      <th>Plaque</th>
                      <th>Propriétaire</th>
                      <th>Statut</th>
                      <th>Date création</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(vehicle => (
                      <tr key={vehicle.id}>
                        <td><strong>{vehicle.brand}</strong> {vehicle.model}</td>
                        <td>{vehicle.year}</td>
                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{vehicle.license_plate}</span></td>
                        <td style={{ fontSize: '0.82rem', color: '#64748B' }}>{ownerMap[vehicle.owner_id] || '—'}</td>
                        <td>
                          <span className={`status ${vehicle.is_active ? 'active' : 'inactive'}`}>
                            {vehicle.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td style={{ color: '#64748B', fontSize: '0.82rem' }}>{new Date(vehicle.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <button onClick={() => handleToggleVehicleStatus(vehicle.id, vehicle.is_active)} className="action-btn">
                            {vehicle.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button onClick={() => handleDeleteVehicle(vehicle.id)} className="action-btn delete">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {activeTab === 'users' && (
          <div className="users">
            <div className="page-title"><Users size={20} color="#285AFF" /><h2>Gestion des Utilisateurs</h2></div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Vérifié</th>
                    <th>Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {(users as any[]).map((user: any) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 500 }}>
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ color: '#64748B', fontSize: '0.85rem' }}>{user.email}</td>
                      <td>
                        <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: user.role === 'admin' ? 'rgba(40,90,255,0.1)' : 'rgba(100,116,139,0.08)', color: user.role === 'admin' ? '#285AFF' : '#64748B' }}>
                          {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                        </span>
                      </td>
                      <td>
                        <span className={`status ${user.email_verified ? 'verified' : 'unverified'}`}>
                          {user.email_verified ? 'Vérifié' : 'Non vérifié'}
                        </span>
                      </td>
                      <td style={{ color: '#64748B', fontSize: '0.82rem' }}>{new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <ConversationsTable conversations={conversations} />
        )}

        {activeTab === 'signalizations' && (
          <SignalizationsTable signalizations={signalizations} />
        )}

        {activeTab === 'analytics' && (
          <div className="analytics">
            <div className="page-title"><BarChart2 size={20} color="#285AFF" /><h2>Analytics et Insights</h2></div>

            {/* KPI Cards */}
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              <div className="stat-card" style={{ borderTop: '2px solid #285AFF' }}>
                <div className="stat-icon" style={{ background: 'rgba(40,90,255,0.1)', border: '1px solid rgba(40,90,255,0.18)' }}><Car size={20} color="#285AFF" /></div>
                <div className="stat-info">
                  <h3>{stats?.totalVehicles ?? 0}</h3>
                  <p>Véhicules enregistrés</p>
                  <small style={{ color: '#10B981', fontWeight: 600 }}>+{stats?.newVehiclesThisWeek ?? 0} cette semaine</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #10B981' }}>
                <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.18)' }}><Users size={20} color="#10B981" /></div>
                <div className="stat-info">
                  <h3>{stats?.totalUsers ?? 0}</h3>
                  <p>Utilisateurs actifs</p>
                  <small style={{ color: '#10B981', fontWeight: 600 }}>+{stats?.newUsersThisMonth ?? 0} ce mois</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #8B5CF6' }}>
                <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.18)' }}><CheckCircle size={20} color="#8B5CF6" /></div>
                <div className="stat-info">
                  <h3>{(stats?.totalConversations ?? 0) > 0 ? Math.round(((stats?.resolvedConversations ?? 0) / (stats?.totalConversations ?? 1)) * 100) : 0}%</h3>
                  <p>Taux de résolution</p>
                  <small>{stats?.resolvedConversations ?? 0} conv. résolues</small>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: '2px solid #F97316' }}>
                <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.18)' }}><AlertTriangle size={20} color="#F97316" /></div>
                <div className="stat-info">
                  <h3>{stats?.totalSignalizations ?? 0}</h3>
                  <p>Signalisations totales</p>
                  <small>{stats?.activeConversations ?? 0} conversations actives</small>
                </div>
              </div>
            </div>

            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Marques Populaires</h3>
                <div className="brands-list">
                  {popularBrands.length === 0 ? (
                    <div style={{ color: '#94A3B8', fontSize: '0.85rem', padding: '12px 0' }}>Aucune donnée disponible</div>
                  ) : popularBrands.slice(0, 8).map((brand, index) => {
                    const maxCount = popularBrands[0]?.count || 1
                    const pct = Math.round((brand.count / maxCount) * 100)
                    return (
                      <div key={index} className="brand-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fff', background: index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : index === 2 ? '#CD7F32' : '#CBD5E1', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {index + 1}
                            </span>
                            <span className="brand-name">{brand.brand}</span>
                          </div>
                          <span className="brand-count">{brand.count} véh.</span>
                        </div>
                        <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #285AFF, #6B8FFF)', borderRadius: 100, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="analytics-card">
                <h3>Notifications & Tokens</h3>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{stats?.totalNotificationTokens ?? 0}</span>
                    <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 9px', borderRadius: 100, border: '1px solid rgba(16,185,129,0.2)' }}>Actifs</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Appareils push enregistrés</div>
                </div>
                <div className="stat-item">
                  <span>Tokens valides:</span>
                  <strong>{notificationTokens.length}</strong>
                </div>
                <div className="stat-item">
                  <span>Taux de couverture:</span>
                  <strong>{(stats?.totalUsers ?? 0) > 0 ? Math.round(((stats?.totalNotificationTokens ?? 0) / (stats?.totalUsers ?? 1)) * 100) : 0}%</strong>
                </div>
                <div className="stat-item">
                  <span>Utilisateurs sans token:</span>
                  <strong>{Math.max(0, (stats?.totalUsers ?? 0) - (stats?.totalNotificationTokens ?? 0))}</strong>
                </div>
              </div>

              <div className="analytics-card">
                <h3>Engagement Conversations</h3>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 4, lineHeight: 1 }}>
                    {stats?.avgMessagesPerConversation ?? 0}
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748B', marginLeft: 6 }}>msg/conv</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Moyenne de messages par conversation</div>
                </div>
                <div className="stat-item">
                  <span>Total messages:</span>
                  <strong>{stats?.totalMessages ?? 0}</strong>
                </div>
                <div className="stat-item">
                  <span>Conversations actives:</span>
                  <strong style={{ color: '#285AFF' }}>{stats?.activeConversations ?? 0}</strong>
                </div>
                <div className="stat-item">
                  <span>Conversations résolues:</span>
                  <strong style={{ color: '#10B981' }}>{stats?.resolvedConversations ?? 0}</strong>
                </div>
              </div>

              <div className="analytics-card">
                <h3>Croissance</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Véhicules / semaine', value: `+${stats?.newVehiclesThisWeek ?? 0}`, color: '#285AFF' },
                    { label: 'Utilisateurs / mois', value: `+${stats?.newUsersThisMonth ?? 0}`, color: '#10B981' },
                  ].map((item, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 100, background: `${item.color}0D`, border: `1px solid ${item.color}25`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color, letterSpacing: '-0.03em' }}>{item.value}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="stat-item">
                  <span>Total véhicules:</span>
                  <strong>{stats?.totalVehicles ?? 0}</strong>
                </div>
                <div className="stat-item">
                  <span>Total utilisateurs:</span>
                  <strong>{stats?.totalUsers ?? 0}</strong>
                </div>
                <div className="stat-item">
                  <span>QR Codes générés:</span>
                  <strong>{stats?.totalQRCodes ?? 0}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <SecurityLogs />
        )}

        {activeTab === 'moderation' && (
          <ModerationTool />
        )}

        {activeTab === 'support' && (
          <SupportInterface />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionManagement />
        )}

        {activeTab === 'qrcodes' && (
          <div className="qrcodes">
            <div className="page-title"><QrCode size={20} color="#285AFF" /><h2>Gestion des QR Codes</h2></div>
            <div style={{ padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ color: '#6B7280' }}>
                Statistiques et gestion des QR Codes à implémenter. 
                Les données sont disponibles via AdminService.getQRCodesStats()
              </p>
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="charts">
            <div className="page-title"><TrendingUp size={20} color="#285AFF" /><h2>Graphiques et Visualisations</h2></div>

            <div className="charts-grid">
              <div className="chart-section">
                <SignalizationsChart data={signalizationsByDay} />
              </div>
              <div className="chart-section">
                <SignalizationTypesChart data={signalizationTypes} />
              </div>
              <div className="chart-section">
                <BrandsPieChart data={popularBrands} />
              </div>
              <div className="chart-section">
                <EngagementChart data={engagementByHour} />
              </div>
              <div className="chart-section" style={{ gridColumn: 'span 2' }}>
                <GrowthChart data={growthStats} />
              </div>
            </div>

            <div className="insights-section">
              <h3>Insights Clés</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-icon" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}><AlertTriangle size={18} color="#EF4444" /></div>
                  <div className="insight-content">
                    <h4>Volume signalisations (7j)</h4>
                    <p>
                      {signalizationsByDay.length > 0
                        ? `${signalizationsByDay.reduce((sum, day) => sum + day.total, 0)} au total — ${signalizationsByDay.reduce((sum, day) => sum + day.urgent, 0)} urgentes`
                        : 'Aucune donnée disponible'
                      }
                    </p>
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-icon" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}><Link2 size={18} color="#F97316" /></div>
                  <div className="insight-content">
                    <h4>Heure de Pic</h4>
                    <p>
                      {engagementByHour.length > 0
                        ? `Heure la plus active : ${engagementByHour.reduce((max, hour) => hour.messages > max.messages ? hour : max).hour} (${engagementByHour.reduce((max, hour) => hour.messages > max.messages ? hour : max).messages} messages)`
                        : 'Aucune donnée disponible'
                      }
                    </p>
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-icon" style={{ background: 'rgba(40,90,255,0.1)', border: '1px solid rgba(40,90,255,0.2)' }}><TrendingUp size={18} color="#285AFF" /></div>
                  <div className="insight-content">
                    <h4>Croissance hebdomadaire</h4>
                    <p>
                      {(growthStats as any).weeklyGrowth !== undefined
                        ? `${(growthStats as any).weeklyGrowth >= 0 ? '+' : ''}${(growthStats as any).weeklyGrowth}% véhicules · ${(growthStats as any).vehiclesThisWeek ?? 0} inscrits cette semaine`
                        : 'Calcul en cours...'
                      }
                    </p>
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-icon" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}><Car size={18} color="#F59E0B" /></div>
                  <div className="insight-content">
                    <h4>Marque Leader</h4>
                    <p>
                      {popularBrands.length > 0
                        ? `${popularBrands[0].brand} — ${popularBrands[0].count} véhicules (${Math.round((popularBrands[0].count / popularBrands.reduce((s, b) => s + b.count, 0)) * 100)}% du parc)`
                        : 'Aucune donnée disponible'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App