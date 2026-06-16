import { createAdminClient } from '@/lib/supabase'
import ExportButton from '@/components/ExportButton'

async function getReportData() {
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('user_subscriptions')
    .select('status, created_at, subscription_plans(slug, name)')

  const all = subs ?? []
  const byPlan: Record<string, number> = {}
  const byStatus: Record<string, number> = {}

  for (const s of all as any[]) {
    const slug = s.subscription_plans?.slug ?? 'unknown'
    byPlan[slug] = (byPlan[slug] ?? 0) + 1
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1
  }

  // Monthly signups (last 6 months)
  const now = new Date()
  const monthly: { month: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const count = (all as any[]).filter((s) => {
      const created = new Date(s.created_at)
      return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth()
    }).length
    monthly.push({ month: label, count })
  }

  return { byPlan, byStatus, total: all.length, monthly }
}

const PLAN_COLOR: Record<string, string> = {
  basic: 'var(--stone3)',
  premium: 'var(--cobalt)',
  entreprise: 'var(--gold)',
}
const STATUS_COLOR: Record<string, string> = {
  active: 'var(--emerald)',
  cancelled: 'var(--crimson)',
  incomplete: 'var(--gold)',
  past_due: 'var(--gold-dk)',
  incomplete_expired: 'var(--crimson)',
}

export default async function RapportsPage() {
  const data = await getReportData()

  const maxMonthly = Math.max(...data.monthly.map((m) => m.count), 1)
  const totalPlans = Object.values(data.byPlan).reduce((a, b) => a + b, 0)

  return (
    <>
      <div className="topbar">
        <div className="page-title">Rapports & Analytics</div>
        <div style={{ flex: 1 }} />
        <ExportButton
          filename={`rapport-${new Date().toISOString().split('T')[0]}.csv`}
          rows={[
            ...Object.entries(data.byPlan).map(([slug, count]) => ({ categorie: 'plan', valeur: slug, total: count })),
            ...Object.entries(data.byStatus).map(([status, count]) => ({ categorie: 'statut', valeur: status, total: count })),
            ...data.monthly.map((m) => ({ categorie: 'inscriptions', valeur: m.month, total: m.count })),
          ]}
        />
      </div>
      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Distribution par plan */}
          <div className="card">
            <div className="card-title">Distribution par plan</div>
            {Object.entries(data.byPlan).map(([slug, count]) => (
              <div key={slug} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{slug}</span>
                  <span style={{ fontWeight: 700 }}>{count} <span style={{ fontWeight: 400, color: 'var(--ink4)' }}>({totalPlans > 0 ? Math.round((count / totalPlans) * 100) : 0}%)</span></span>
                </div>
                <div style={{ height: 6, background: 'var(--stone2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${totalPlans > 0 ? (count / totalPlans) * 100 : 0}%`,
                    background: PLAN_COLOR[slug] ?? 'var(--navy)',
                    borderRadius: 4,
                    transition: 'width 0.5s',
                  }} />
                </div>
              </div>
            ))}
            {Object.keys(data.byPlan).length === 0 && (
              <div style={{ color: 'var(--ink4)', fontSize: 13, padding: '12px 0' }}>Aucune donnée disponible</div>
            )}
          </div>

          {/* Distribution par statut */}
          <div className="card">
            <div className="card-title">Distribution par statut</div>
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLOR[status] ?? 'var(--ink4)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: `${(count / data.total) * 80}px`,
                    height: 4, borderRadius: 2,
                    background: STATUS_COLOR[status] ?? 'var(--ink4)', opacity: 0.5,
                  }} />
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 20, textAlign: 'right' }}>{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.byStatus).length === 0 && (
              <div style={{ color: 'var(--ink4)', fontSize: 13, padding: '12px 0' }}>Aucune donnée disponible</div>
            )}
          </div>
        </div>

        {/* Monthly signups */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Nouvelles inscriptions (6 derniers mois)</div>
          <div className="chart-wrap" style={{ height: 160 }}>
            {data.monthly.map((m, i) => (
              <div key={i} className="bar-col">
                {m.count > 0 && <div className="bar-val">{m.count}</div>}
                <div
                  className="bar-fill"
                  style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? 4 : 2, opacity: m.count > 0 ? 0.8 : 0.2 }}
                />
                <div className="bar-month">{m.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs row */}
        <div className="kpi-row">
          <div className="kpi orange">
            <div className="kpi-label">Total utilisateurs</div>
            <div className="kpi-value">{data.total}</div>
            <div className="kpi-delta" style={{ color: 'var(--ink3)' }}>Depuis le lancement</div>
          </div>
          <div className="kpi blue">
            <div className="kpi-label">Taux Premium</div>
            <div className="kpi-value">
              {data.total > 0 ? Math.round(((data.byPlan.premium ?? 0) / data.total) * 100) : 0} %
            </div>
            <div className="kpi-delta up">Plans payants actifs</div>
          </div>
          <div className="kpi green">
            <div className="kpi-label">Plans actifs</div>
            <div className="kpi-value">{data.byStatus.active ?? 0}</div>
            <div className="kpi-delta up">Abonnements actifs</div>
          </div>
          <div className="kpi purple">
            <div className="kpi-label">Taux d&apos;annulation</div>
            <div className="kpi-value">
              {data.total > 0 ? Math.round(((data.byStatus.cancelled ?? 0) / data.total) * 100) : 0} %
            </div>
            <div className={`kpi-delta ${(data.byStatus.cancelled ?? 0) > 0 ? 'down' : 'up'}`}>
              {data.byStatus.cancelled ?? 0} annulés
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
