import { createAdminClient } from '@/lib/supabase'
import GlobalSearch from '@/components/GlobalSearch'

async function getStats() {
  const supabase = createAdminClient()

  const [subRes, planRes, dealsRes, tasksRes] = await Promise.all([
    supabase.from('user_subscriptions').select('status, plan_id, updated_at, stripe_customer_id, user_id, subscription_plans(slug, name)'),
    supabase.from('subscription_plans').select('id, slug, name').eq('is_active', true),
    supabase.from('crm_deals').select('id, stage, amount_monthly'),
    supabase.from('crm_tasks')
      .select('id, title, due_date, priority, status, contact:crm_contacts(id, name, company)')
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(8),
  ])

  const subs = subRes.data ?? []
  const active = subs.filter((s: any) => s.status === 'active').length
  const premium = subs.filter((s: any) => s.subscription_plans?.slug === 'premium' && s.status === 'active').length
  const basic = subs.filter((s: any) => s.subscription_plans?.slug === 'basic').length
  const cancelled = subs.filter((s: any) => s.status === 'cancelled' || s.status === 'incomplete_expired').length
  const convRate = active > 0 ? Math.round((premium / active) * 100) : 0

  const recent = subs
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  const deals = dealsRes.data ?? []
  const pipelineByStage = {
    lead: deals.filter((d: any) => d.stage === 'lead').length,
    prospect: deals.filter((d: any) => d.stage === 'prospect').length,
    negocie: deals.filter((d: any) => d.stage === 'negocie').length,
    gagne: deals.filter((d: any) => d.stage === 'gagne').length,
  }

  const tasks = tasksRes.data ?? []

  return { active, premium, basic, cancelled, convRate, total: subs.length, recent, plans: planRes.data ?? [], pipelineByStage, tasks }
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  cancelled: 'Annulé',
  incomplete: 'Incomplet',
  incomplete_expired: 'Expiré',
  past_due: 'Retard',
  trialing: 'Essai',
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(due: string | null): boolean {
  if (!due) return false
  return new Date(due) < new Date(new Date().toDateString())
}

export default async function DashboardPage() {
  const stats = await getStats()

  const pipelineSummary = [
    { label: 'Leads', value: stats.pipelineByStage.lead, color: '#5b21b6' },
    { label: 'Prospects', value: stats.pipelineByStage.prospect, color: '#1d4ed8' },
    { label: 'Négociation', value: stats.pipelineByStage.negocie, color: '#c8912a' },
    { label: 'Gagnés', value: stats.pipelineByStage.gagne, color: '#047857' },
  ]

  const urgentCount = stats.tasks.filter((t: any) => t.priority === 'urgente' || isOverdue(t.due_date)).length

  return (
    <>
      <div className="topbar">
        <div className="page-title">Tableau de bord</div>
        <GlobalSearch />
        <a href="/tasks" className="btn btn-gold btn-sm">+ Nouvelle tâche</a>
      </div>
      <div className="content">
        {/* KPIs */}
        <div className="kpi-row">
          <div className="kpi orange">
            <div className="kpi-icon">💰</div>
            <div className="kpi-label">Abonnés actifs</div>
            <div className="kpi-value">{stats.active}</div>
            <div className="kpi-delta up">↑ Total utilisateurs actifs</div>
          </div>
          <div className="kpi blue">
            <div className="kpi-icon">⭐</div>
            <div className="kpi-label">Abonnés Premium</div>
            <div className="kpi-value">{stats.premium}</div>
            <div className="kpi-delta up">↑ Plans payants</div>
          </div>
          <div className="kpi green">
            <div className="kpi-icon">✓</div>
            <div className="kpi-label">Plan Basic (gratuit)</div>
            <div className="kpi-value">{stats.basic}</div>
            <div className="kpi-delta" style={{ color: 'var(--ink3)' }}>Potentiel à convertir</div>
          </div>
          <div className="kpi purple">
            <div className="kpi-icon">%</div>
            <div className="kpi-label">Taux de conversion</div>
            <div className="kpi-value">{stats.convRate} %</div>
            <div className={`kpi-delta ${stats.convRate >= 20 ? 'up' : 'down'}`}>
              {stats.premium} premium / {stats.active} actifs
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>
          {/* Activité récente */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Activité récente</div>
              <a href="/clients" style={{ fontSize: 11.5, color: 'var(--gold-dk)', cursor: 'pointer', fontWeight: 600 }}>
                Voir tout →
              </a>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Plan</th>
                    <th>Statut</th>
                    <th>Mise à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 ? (
                    <tr><td colSpan={4} style={{ color: 'var(--ink4)', textAlign: 'center', padding: 24 }}>Aucune donnée</td></tr>
                  ) : (
                    stats.recent.map((s: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {s.user_id?.substring(0, 12)}…
                        </td>
                        <td>
                          <span className={`status-pill ${s.subscription_plans?.slug === 'premium' ? 'premium' : 'basic'}`}>
                            {s.subscription_plans?.name ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${s.status === 'active' ? 'active' : s.status === 'cancelled' ? 'cancelled' : 'incomplete'}`}>
                            {STATUS_LABEL[s.status] ?? s.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ink3)' }}>{fmt(s.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pipeline résumé */}
          <div className="card">
            <div className="card-title">Pipeline résumé</div>
            {pipelineSummary.map((p) => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                  <span style={{ fontSize: 13 }}>{p.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 700 }}>{p.value}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--stone2)', marginTop: 8, paddingTop: 12 }}>
              <a href="/pipeline" style={{ fontSize: 12, color: 'var(--gold-dk)', fontWeight: 600 }}>
                Voir le pipeline →
              </a>
            </div>
          </div>
        </div>

        {/* Tâches */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Tâches & relances en cours</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {urgentCount > 0 && (
                <span style={{ fontSize: 10, background: 'var(--crimson-lt)', color: 'var(--crimson)', padding: '3px 10px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
                </span>
              )}
              <a href="/tasks" style={{ fontSize: 11.5, color: 'var(--gold-dk)', fontWeight: 600 }}>
                Voir tout →
              </a>
            </div>
          </div>
          {stats.tasks.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
              Aucune tâche en cours — <a href="/tasks" style={{ color: 'var(--gold-dk)', fontWeight: 600 }}>créez-en une</a>
            </div>
          ) : (
            stats.tasks.map((t: any, i: number) => {
              const overdue = isOverdue(t.due_date)
              const urgent = t.priority === 'urgente' || overdue
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < stats.tasks.length - 1 ? '1px solid var(--stone)' : 'none' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--navy)', width: 14, height: 14, flexShrink: 0 }} disabled />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: overdue ? 'var(--crimson)' : 'var(--ink4)', marginTop: 2, fontWeight: overdue ? 700 : 400 }}>
                      {overdue ? '⚠ Retard : ' : t.due_date ? '📅 ' : ''}
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Sans échéance'}
                      {t.contact && ` · ${t.contact.name}`}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: urgent ? 'var(--crimson-lt)' : 'var(--stone)',
                    color: urgent ? 'var(--crimson)' : 'var(--ink3)',
                  }}>
                    {urgent ? 'urgente' : t.priority}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
