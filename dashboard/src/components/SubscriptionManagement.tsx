import { useEffect, useRef, useState } from 'react'
import { AdminService } from '../services/adminService'

type Subscription = {
  id: string
  user_id: string
  plan_id: string
  status: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  last_invoice_status?: string
  last_payment_error?: string
  created_at: string
  updated_at?: string
  plan?: {
    slug: string
    name: string
    monthly_price: number
    currency: string
  } | null
  user?: {
    email?: string | null
    first_name?: string | null
    last_name?: string | null
  } | null
}

type EnterpriseUser = {
  userId: string
  email: string
  name: string
}

const BLUE = '#285AFF'
const FILTER_BTN_BASE: React.CSSProperties = {
  padding: '7px 14px',
  border: '1.5px solid #E2E8F0',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  background: '#fff',
  color: '#64748B',
}
const FILTER_BTN_ACTIVE: React.CSSProperties = {
  ...FILTER_BTN_BASE,
  background: BLUE,
  color: '#fff',
  borderColor: BLUE,
}

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'canceled' | 'past_due' | 'trialing'>('all')

  // Enterprise modal state
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)
  const [enterpriseUsers, setEnterpriseUsers] = useState<EnterpriseUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [amountEuros, setAmountEuros] = useState('')
  const [currency, setCurrency] = useState('eur')
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const [description, setDescription] = useState('')
  const [loadingUsersError, setLoadingUsersError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await AdminService.getAllSubscriptions()
      setSubscriptions(data as Subscription[])
    } catch (err: any) {
      console.error('Erreur chargement abonnements:', err)
      setError(err?.message || 'Impossible de charger les abonnements')
    } finally {
      setLoading(false)
    }
  }

  const openEnterpriseModal = async () => {
    setShowEnterpriseModal(true)
    setSubmitSuccess(null)
    setSubmitError(null)
    setPaymentUrl(null)
    setCopied(false)
    setSelectedUserId('')
    setUserSearch('')
    setAmountEuros('')
    setCurrency('eur')
    setBillingInterval('month')
    setDescription('')
    setLoadingUsers(true)
    setLoadingUsersError(null)
    try {
      const users = await AdminService.getUsersForEnterprise()
      setEnterpriseUsers(users as EnterpriseUser[])
    } catch (err: any) {
      console.error('Erreur chargement utilisateurs:', err)
      setLoadingUsersError(err?.message || 'Impossible de charger la liste des clients')
    } finally {
      setLoadingUsers(false)
    }
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  const handleEnterpriseSubmit = async () => {
    if (!selectedUserId) { setSubmitError('Sélectionnez un utilisateur'); return }
    const euros = parseFloat(amountEuros)
    if (!euros || euros <= 0) { setSubmitError('Saisissez un montant valide (> 0)'); return }

    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      const amountCents = Math.round(euros * 100)
      const result = await AdminService.createEnterpriseSubscription(
        selectedUserId, amountCents, currency, billingInterval, description || undefined
      )
      setSubmitSuccess(result?.message || 'Abonnement Enterprise créé avec succès.')
      setPaymentUrl(result?.paymentUrl ?? null)
      await loadSubscriptions()
    } catch (err: any) {
      setSubmitError(err?.message || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredUsers = userSearch.trim()
    ? enterpriseUsers.filter(u =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.name.toLowerCase().includes(userSearch.toLowerCase())
      )
    : enterpriseUsers

  const filteredSubscriptions = filter === 'all'
    ? subscriptions
    : subscriptions.filter(s => s.status === filter)

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    active:   { bg: '#DCFCE7', color: '#15803D', label: 'Actif' },
    trialing: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Essai' },
    past_due: { bg: '#FEE2E2', color: '#B91C1C', label: 'En retard' },
    canceled: { bg: '#F1F5F9', color: '#64748B', label: 'Annulé' },
    unpaid:   { bg: '#FEE2E2', color: '#B91C1C', label: 'Impayé' },
  }

  const getStatusStyle = (status: string) => statusConfig[status] || { bg: '#FEF3C7', color: '#92400E', label: status }

  const invoiceConfig: Record<string, { bg: string; color: string }> = {
    paid:           { bg: '#DCFCE7', color: '#15803D' },
    open:           { bg: '#DBEAFE', color: '#1D4ED8' },
    void:           { bg: '#F1F5F9', color: '#64748B' },
    uncollectible:  { bg: '#FEE2E2', color: '#B91C1C' },
  }
  const getInvoiceStyle = (s: string) => invoiceConfig[s] || { bg: '#FEF3C7', color: '#92400E' }

  const formatPrice = (price: number, currency: string) => {
    if (!price && price !== 0) return '—'
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(price)
  }

  const formatDate = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR')
  }

  const countBy = (status: string) => subscriptions.filter(s => s.status === status).length

  // Revenus actifs estimés
  const monthlyRevenue = subscriptions
    .filter(s => s.status === 'active' && s.plan?.monthly_price)
    .reduce((sum, s) => sum + (s.plan?.monthly_price || 0), 0)

  return (
    <div className="subscription-management">
      {/* ── En-tête ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Abonnements
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748B' }}>
            {subscriptions.length} abonnement{subscriptions.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openEnterpriseModal}
            style={{ padding: '8px 16px', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
          >
            + Créer abonnement Enterprise
          </button>
          <button
            onClick={loadSubscriptions}
            style={{ padding: '8px 16px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(40,90,255,0.25)' }}
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Modal Enterprise ── */}
      {showEnterpriseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEnterpriseModal(false) }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Abonnement Enterprise personnalisé</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B' }}>Stripe envoie la facture par email au client</p>
              </div>
              <button onClick={() => setShowEnterpriseModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#64748B', padding: '4px' }}>✕</button>
            </div>

            {/* Recherche utilisateur */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Client</label>
              <input
                ref={searchRef}
                type="text"
                placeholder="Rechercher par email ou nom…"
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setSelectedUserId('') }}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              {/* Dropdown utilisateurs */}
              {!selectedUserId && (
                <div style={{ border: '1.5px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: '180px', overflowY: 'auto', background: '#fff' }}>
                  {loadingUsers ? (
                    <div style={{ padding: '14px', color: '#64748B', fontSize: '0.82rem', textAlign: 'center' }}>Chargement des clients…</div>
                  ) : loadingUsersError ? (
                    <div style={{ padding: '12px', color: '#B91C1C', fontSize: '0.8rem', textAlign: 'center' }}>{loadingUsersError}</div>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.slice(0, 30).map(u => (
                      <div key={u.userId}
                        onClick={() => { setSelectedUserId(u.userId); setUserSearch(u.email) }}
                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontSize: '0.84rem' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{u.email}</div>
                        {u.name && u.name !== u.email && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{u.name}</div>}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '14px', color: '#94A3B8', fontSize: '0.82rem', textAlign: 'center' }}>
                      {userSearch.trim() ? `Aucun client trouvé pour "${userSearch}"` : 'Aucun client disponible'}
                    </div>
                  )}
                </div>
              )}
              {selectedUserId && (
                <div style={{ marginTop: '6px', padding: '6px 10px', background: '#EDE9FE', borderRadius: '6px', fontSize: '0.78rem', color: '#5B21B6', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>✓ {userSearch}</span>
                  <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => { setSelectedUserId(''); setUserSearch('') }}>✕</span>
                </div>
              )}
            </div>

            {/* Montant + Devise */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Montant</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="ex: 500"
                  value={amountEuros}
                  onChange={e => setAmountEuros(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Devise</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', background: '#fff', cursor: 'pointer', height: '39px' }}
                >
                  <option value="eur">EUR €</option>
                  <option value="usd">USD $</option>
                  <option value="gbp">GBP £</option>
                  <option value="chf">CHF</option>
                </select>
              </div>
            </div>

            {/* Fréquence */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Fréquence de facturation</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([['month', 'Mensuel'], ['year', 'Annuel']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setBillingInterval(val)}
                    style={{ flex: 1, padding: '8px', border: `2px solid ${billingInterval === val ? '#7C3AED' : '#E2E8F0'}`, borderRadius: '8px', background: billingInterval === val ? '#EDE9FE' : '#fff', color: billingInterval === val ? '#5B21B6' : '#64748B', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description (optionnel) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Description <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optionnel)</span></label>
              <input
                type="text"
                placeholder="ex: Contrat annuel flotte 20 véhicules"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Récapitulatif */}
            {selectedUserId && amountEuros && parseFloat(amountEuros) > 0 && (
              <div style={{ padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', marginBottom: '16px', fontSize: '0.84rem', color: '#15803D' }}>
                Stripe créera un abonnement de <strong>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format(parseFloat(amountEuros))}/{billingInterval === 'month' ? 'mois' : 'an'}</strong> et enverra une facture par email à <strong>{userSearch}</strong>.
              </div>
            )}

            {/* Messages retour */}
            {submitSuccess && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ padding: '12px 14px', background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '10px', fontSize: '0.84rem', color: '#15803D', fontWeight: 500, marginBottom: paymentUrl ? '10px' : 0 }}>
                  ✅ {submitSuccess}
                </div>
                {paymentUrl && (
                  <div style={{ padding: '14px', background: '#EDE9FE', border: '1px solid #C4B5FD', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5B21B6', marginBottom: '8px' }}>
                      Lien de paiement — envoie-le au client
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        readOnly
                        value={paymentUrl}
                        style={{ flex: 1, padding: '7px 10px', border: '1px solid #C4B5FD', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', background: '#fff', color: '#374151', outline: 'none' }}
                        onFocus={e => e.target.select()}
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(paymentUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                        style={{ padding: '7px 12px', background: copied ? '#15803D' : '#7C3AED', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                      >
                        {copied ? '✓ Copié !' : 'Copier'}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6D28D9', marginTop: '6px', opacity: 0.8 }}>
                      Ce lien expire après paiement. Partage-le par email, WhatsApp ou SMS.
                    </div>
                  </div>
                )}
              </div>
            )}
            {submitError && (
              <div style={{ padding: '12px 14px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', marginBottom: '16px', fontSize: '0.84rem', color: '#B91C1C', fontWeight: 500 }}>
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowEnterpriseModal(false)}
                style={{ flex: 1, padding: '10px', border: '1.5px solid #E2E8F0', borderRadius: '8px', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
              <button
                onClick={handleEnterpriseSubmit}
                disabled={submitting || !selectedUserId || !amountEuros}
                style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '8px', background: submitting || !selectedUserId || !amountEuros ? '#C4B5FD' : '#7C3AED', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: submitting || !selectedUserId || !amountEuros ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {submitting ? 'Création en cours…' : 'Créer & envoyer la facture Stripe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Actifs',   count: countBy('active'),   bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
          { label: 'En essai', count: countBy('trialing'), bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
          { label: 'En retard',count: countBy('past_due'), bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
          { label: 'Annulés',  count: countBy('canceled'), bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' },
          { label: 'MRR estimé', count: null, revenue: monthlyRevenue, bg: '#EFF6FF', color: BLUE, border: '#BFDBFE' },
        ].map((card, i) => (
          <div key={i} style={{ padding: '14px 16px', backgroundColor: card.bg, borderRadius: '12px', border: `1px solid ${card.border}` }}>
            <div style={{ fontSize: card.revenue !== undefined ? '1.15rem' : '1.75rem', fontWeight: 800, color: card.color, lineHeight: 1.1 }}>
              {card.revenue !== undefined
                ? formatPrice(card.revenue, 'EUR')
                : card.count}
            </div>
            <div style={{ fontSize: '0.75rem', color: card.color, fontWeight: 600, marginTop: '4px', opacity: 0.85 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {([
          { key: 'all',      label: `Tous (${subscriptions.length})` },
          { key: 'active',   label: `Actifs (${countBy('active')})` },
          { key: 'trialing', label: `Essai (${countBy('trialing')})` },
          { key: 'past_due', label: `En retard (${countBy('past_due')})` },
          { key: 'canceled', label: `Annulés (${countBy('canceled')})` },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={filter === f.key ? FILTER_BTN_ACTIVE : FILTER_BTN_BASE}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div style={{ padding: '14px 16px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', color: '#B91C1C', fontSize: '0.875rem', fontWeight: 500, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {error}
        </div>
      )}

      {/* ── Tableau ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          Chargement des abonnements…
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Plan</th>
                <th>Prix / mois</th>
                <th>Statut</th>
                <th>Période</th>
                <th>Stripe ID</th>
                <th>Dernier paiement</th>
                <th>Annulation auto</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.length > 0 ? filteredSubscriptions.map(sub => {
                const sc = getStatusStyle(sub.status)
                return (
                  <tr key={sub.id}>
                    {/* Utilisateur */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem' }}>
                        {sub.user?.email || <span style={{ color: '#94A3B8' }}>{sub.user_id.substring(0, 8)}…</span>}
                      </div>
                      {sub.user?.first_name && (
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>{sub.user.first_name}</div>
                      )}
                    </td>
                    {/* Plan */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {sub.plan?.name || <span style={{ color: '#94A3B8' }}>—</span>}
                        {sub.plan?.slug === 'entreprise' && (
                          <span style={{ padding: '1px 6px', background: '#EDE9FE', color: '#6D28D9', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>ENTERPRISE</span>
                        )}
                      </div>
                      {sub.plan?.slug && (
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace' }}>{sub.plan.slug}</div>
                      )}
                    </td>
                    {/* Prix */}
                    <td style={{ fontWeight: 700, color: BLUE }}>
                      {sub.plan ? formatPrice(sub.plan.monthly_price, sub.plan.currency) : '—'}
                    </td>
                    {/* Statut */}
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                        {sc.label}
                      </span>
                    </td>
                    {/* Période */}
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {sub.current_period_start || sub.current_period_end
                        ? <>{formatDate(sub.current_period_start)} → {formatDate(sub.current_period_end)}</>
                        : <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    {/* Stripe ID */}
                    <td style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#94A3B8' }}>
                      {sub.stripe_subscription_id
                        ? sub.stripe_subscription_id.substring(0, 22) + '…'
                        : <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    {/* Dernier paiement */}
                    <td>
                      {sub.last_invoice_status ? (() => {
                        const is = getInvoiceStyle(sub.last_invoice_status!)
                        return (
                          <div>
                            <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, background: is.bg, color: is.color }}>
                              {sub.last_invoice_status}
                            </span>
                            {sub.last_payment_error && (
                              <div style={{ fontSize: '0.68rem', color: '#EF4444', marginTop: '4px', maxWidth: '180px' }}>
                                {sub.last_payment_error}
                              </div>
                            )}
                          </div>
                        )
                      })() : <span style={{ color: '#CBD5E1', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    {/* Annulation auto */}
                    <td>
                      {sub.cancel_at_period_end
                        ? <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.8rem' }}>Fin de période</span>
                        : <span style={{ color: '#CBD5E1', fontSize: '0.8rem' }}>Non</span>}
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8', padding: '60px', fontSize: '0.9rem' }}>
                    {error ? 'Erreur de chargement' : 'Aucun abonnement trouvé'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
