import { createAdminClient } from '@/lib/supabase'
import ExportButton from '@/components/ExportButton'

interface PaidInvoice {
  id: string
  number: string
  client_name: string
  total_ht: number
  total_ttc: number
  emission_date: string
  status: string
  type: string
  contact?: { name: string; company: string | null } | null
}

async function getCAData() {
  const sb = createAdminClient()

  const { data: invoices } = await sb
    .from('crm_invoices')
    .select('id, number, client_name, total_ht, total_ttc, emission_date, status, type, contact:crm_contacts(name, company)')
    .order('emission_date', { ascending: false })

  const all = (invoices ?? []) as unknown as PaidInvoice[]
  const paid = all.filter((i) => i.status === 'paid')

  const now = new Date()
  const monthly: { month: string; value: number; prev: number; key: string }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const dPrev = new Date(now.getFullYear(), now.getMonth() - i - 12, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const prevKey = `${dPrev.getFullYear()}-${String(dPrev.getMonth() + 1).padStart(2, '0')}`
    const value = paid
      .filter((inv) => inv.emission_date.startsWith(monthKey))
      .reduce((acc, inv) => acc + (inv.total_ttc ?? 0), 0)
    const prev = paid
      .filter((inv) => inv.emission_date.startsWith(prevKey))
      .reduce((acc, inv) => acc + (inv.total_ttc ?? 0), 0)
    monthly.push({
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      value: Math.round(value),
      prev: Math.round(prev),
      key: monthKey,
    })
  }

  const totalCA = monthly.reduce((acc, m) => acc + m.value, 0)
  const lastMonth = monthly[monthly.length - 1]?.value ?? 0
  const prevMonth = monthly[monthly.length - 2]?.value ?? 0
  const growth = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : (lastMonth > 0 ? 100 : 0)

  const overdue = all.filter((i) => i.status === 'overdue')
  const overdueAmount = overdue.reduce((acc, i) => acc + (i.total_ttc ?? 0), 0)

  const recentPayments = paid.slice(0, 10)

  return { monthly, totalCA, lastMonth, growth, paidCount: paid.length, overdueCount: overdue.length, overdueAmount, recentPayments }
}

function fmtE(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function CAPage() {
  const data = await getCAData()

  const maxVal = Math.max(...data.monthly.map((d) => Math.max(d.value, d.prev)), 1)

  return (
    <>
      <div className="topbar">
        <div className="page-title">Chiffre d&apos;Affaires</div>
        <div style={{ flex: 1 }} />
        <ExportButton
          filename={`ca-${new Date().toISOString().split('T')[0]}.csv`}
          rows={data.monthly.map((m) => ({
            mois: m.month,
            ca_ttc: m.value,
            ca_ttc_n_1: m.prev,
            ecart: m.value - m.prev,
          }))}
        />
      </div>
      <div className="content">
        {/* KPIs */}
        <div className="kpi-row">
          <div className="kpi orange">
            <div className="kpi-icon">💰</div>
            <div className="kpi-label">CA total (12m)</div>
            <div className="kpi-value">{fmtE(data.totalCA)}</div>
            <div className={`kpi-delta ${data.growth >= 0 ? 'up' : 'down'}`}>
              {data.growth >= 0 ? '↑' : '↓'} {Math.abs(data.growth)} % vs mois précédent
            </div>
          </div>
          <div className="kpi blue">
            <div className="kpi-icon">📅</div>
            <div className="kpi-label">CA ce mois</div>
            <div className="kpi-value">{fmtE(data.lastMonth)}</div>
            <div className="kpi-delta up">{data.paidCount} factures payées</div>
          </div>
          <div className="kpi green">
            <div className="kpi-icon">✓</div>
            <div className="kpi-label">Factures payées</div>
            <div className="kpi-value">{data.paidCount}</div>
            <div className="kpi-delta up">Total encaissé</div>
          </div>
          <div className="kpi purple">
            <div className="kpi-icon">⚠</div>
            <div className="kpi-label">Impayés (en retard)</div>
            <div className="kpi-value">{fmtE(data.overdueAmount)}</div>
            <div className={`kpi-delta ${data.overdueCount > 0 ? 'down' : 'up'}`}>
              {data.overdueCount} facture{data.overdueCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Évolution du CA mensuel (TTC)</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>12 derniers mois</div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink3)' }}>
              <div style={{ width: 10, height: 10, background: 'var(--navy)', borderRadius: 2, opacity: 0.8 }} />
              Année actuelle
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink3)' }}>
              <div style={{ width: 10, height: 10, background: 'var(--stone3)', borderRadius: 2 }} />
              Année précédente (n-1)
            </div>
          </div>

          <div className="chart-wrap">
            {data.monthly.map((d, i) => (
              <div key={i} className="bar-col">
                <div className="bar-val">{d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value}</div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', flex: 1, width: '100%' }}>
                  <div
                    className="bar-fill prev-year"
                    style={{ height: `${(d.prev / maxVal) * 100}%`, flex: 1, minHeight: 2 }}
                    title={`n-1: ${fmtE(d.prev)}`}
                  />
                  <div
                    className="bar-fill"
                    style={{ height: `${(d.value / maxVal) * 100}%`, flex: 1, minHeight: 2 }}
                    title={`${d.month}: ${fmtE(d.value)}`}
                  />
                </div>
                <div className="bar-month">{d.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div className="card table-wrap">
          <div className="card-title">Factures payées récentes</div>
          {data.recentPayments.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
              Aucune facture payée — marquez une facture comme « Payée » pour la voir ici
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>N°</th><th>Client</th><th>Type</th><th>Montant TTC</th><th>Date</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.number}</td>
                    <td>
                      <div>{p.client_name}</div>
                      {p.contact?.company && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{p.contact.company}</div>}
                    </td>
                    <td><span className={`status-pill ${p.type === 'FACTURE' ? 'active' : 'prospect'}`}>{p.type}</span></td>
                    <td style={{ fontWeight: 700 }}>{fmtE(p.total_ttc)}</td>
                    <td style={{ color: 'var(--ink3)' }}>{fmtDate(p.emission_date)}</td>
                    <td><span className="status-pill active">Payée</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
