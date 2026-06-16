'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CRMInvoice, CRMInvoiceLine, CRMContact } from '@/lib/types'
import GlobalSearch from '@/components/GlobalSearch'

interface LineItem { desc: string; qty: string; price: string }

const STATUS_CSS: Record<string, string> = { paid: 'active', sent: 'prospect', draft: 'basic', overdue: 'past-due', cancelled: 'cancelled' }
const STATUS_LABEL: Record<string, string> = { paid: 'Payée', sent: 'Envoyée', draft: 'Brouillon', overdue: 'En retard', cancelled: 'Annulée' }

function fmt(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fmtE(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' }

interface Toast { msg: string; ok: boolean }

function InvoicesPageInner() {
  const searchParams = useSearchParams()
  const prefilledContactId = searchParams.get('contact')
  const [tab, setTab] = useState<'list' | 'new'>(prefilledContactId ? 'new' : 'list')
  const [invoices, setInvoices] = useState<CRMInvoice[]>([])
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | CRMInvoice['status']>('all')

  // Form state
  const [docType, setDocType] = useState<'DEVIS' | 'FACTURE'>('DEVIS')
  const [contactId, setContactId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [dateEmission, setDateEmission] = useState(new Date().toISOString().split('T')[0])
  const [dateValidity, setDateValidity] = useState('')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('Paiement à 30 jours. TVA non applicable — article 293 B du CGI.')
  const [lines, setLines] = useState<LineItem[]>([
    { desc: 'Abonnement Entreprise Notifcar', qty: '1', price: '1200' },
  ])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/invoices')
    const data = await res.json()
    setInvoices(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const fetchContacts = useCallback(async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { fetchInvoices(); fetchContacts() }, [fetchInvoices, fetchContacts])

  const onSelectContact = useCallback((id: string, contactsList: CRMContact[] = contacts) => {
    setContactId(id)
    const c = contactsList.find((x) => x.id === id)
    if (c) {
      setClientName(c.company || c.name)
      setClientEmail(c.email)
    }
  }, [contacts])

  useEffect(() => {
    if (prefilledContactId && contacts.length > 0 && !contactId) {
      onSelectContact(prefilledContactId, contacts)
    }
  }, [prefilledContactId, contacts, contactId, onSelectContact])

  const filteredInvoices = invoices.filter((inv) =>
    statusFilter === 'all' ? true : inv.status === statusFilter
  )

  const addLine = () => setLines((p) => [...p, { desc: '', qty: '1', price: '' }])
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, val: string) =>
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const totalHT = lines.reduce((acc, l) => acc + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0), 0)
  const tva = totalHT * 0.2
  const ttc = totalHT + tva

  const createInvoice = async (status: 'draft' | 'sent' = 'draft') => {
    if (!clientName.trim()) { showToast('Le nom client est requis', false); return }
    setSaving(true)
    try {
      const computeNextGen = (start: string, interval: string) => {
        const d = new Date(start + 'T12:00:00')
        if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
        else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3)
        else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1)
        return d.toISOString().split('T')[0]
      }

      const payload = {
        type: docType,
        contact_id: contactId || null,
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        emission_date: dateEmission,
        validity_date: dateValidity || null,
        reference: ref.trim() || null,
        notes: notes.trim() || null,
        lines: lines.filter((l) => l.desc).map((l, i) => ({
          description: l.desc,
          quantity: parseFloat(l.qty) || 1,
          unit_price: parseFloat(l.price) || 0,
          sort_order: i,
        })) as CRMInvoiceLine[],
        status,
        is_recurring: docType === 'FACTURE' ? isRecurring : false,
        recurring_interval: isRecurring && docType === 'FACTURE' ? recurringInterval : null,
        next_generation_date: isRecurring && docType === 'FACTURE'
          ? computeNextGen(dateEmission, recurringInterval) : null,
      }
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(`Document créé (${status === 'sent' ? 'envoyé' : 'brouillon'})`)
      // Reset form
      setContactId('')
      setClientName('')
      setClientEmail('')
      setDateValidity('')
      setRef('')
      setLines([{ desc: 'Abonnement Entreprise Notifcar', qty: '1', price: '1200' }])
      setTab('list')
      fetchInvoices()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: CRMInvoice['status']) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status } : inv))
      showToast('Statut mis à jour')
    } else {
      showToast('Erreur', false)
    }
  }

  const deleteInvoice = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id))
      showToast('Document supprimé')
    } else {
      showToast('Erreur lors de la suppression', false)
    }
  }

  const sendByEmail = (inv: CRMInvoice) => {
    if (!inv.client_email) {
      showToast('Aucun email destinataire', false)
      return
    }
    const docLabel = inv.type === 'FACTURE' ? 'facture' : 'devis'
    const subject = `${inv.type === 'FACTURE' ? 'Facture' : 'Devis'} ${inv.number}`
    const printUrl = `${window.location.origin}/invoices/${inv.id}/print`
    const body = [
      `Bonjour,`,
      ``,
      `Veuillez trouver ci-joint notre ${docLabel} ${inv.number} d'un montant de ${inv.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € TTC.`,
      ``,
      `Vous pouvez consulter le document à l'adresse suivante :`,
      printUrl,
      ``,
      `Restant à votre disposition pour toute question.`,
      ``,
      `Cordialement`,
    ].join('\n')
    const mailto = `mailto:${encodeURIComponent(inv.client_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    // Auto-update status to 'sent' if draft
    if (inv.status === 'draft') {
      updateStatus(inv.id, 'sent')
    }
  }

  // Preview computed number
  const previewNum = `${docType === 'FACTURE' ? 'F' : 'D'}-${new Date().getFullYear()}-XXX`

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 100,
          background: toast.ok ? 'var(--emerald)' : 'var(--crimson)',
          color: '#fff', padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)',
        }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="topbar">
        <div className="page-title">Devis & Factures</div>
        <GlobalSearch />
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            const res = await fetch('/api/invoices/generate-recurring', { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
              showToast(`${data.count} facture${data.count > 1 ? 's' : ''} générée${data.count > 1 ? 's' : ''}`)
              fetchInvoices()
            } else {
              showToast('Erreur', false)
            }
          }}
          title="Générer les factures récurrentes dont la date est atteinte"
          style={{ marginRight: 8 }}
        >
          🔁 Générer récurrentes
        </button>
        <button className="btn btn-gold btn-sm" onClick={() => setTab('new')}>+ Nouveau document</button>
      </div>

      <div className="content">
        <div className="tabs">
          <div className={`tab${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>
            Liste des documents {!loading ? `(${invoices.length})` : ''}
          </div>
          <div className={`tab${tab === 'new' ? ' active' : ''}`} onClick={() => setTab('new')}>
            Nouveau devis / facture
          </div>
        </div>

        {/* ── LISTE ── */}
        {tab === 'list' && (
          <>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
            ) : (
              <>
                {/* Filtres statut */}
                <div className="tabs" style={{ marginBottom: 16 }}>
                  {([
                    { k: 'all', label: 'Tous' },
                    { k: 'draft', label: 'Brouillons' },
                    { k: 'sent', label: 'Envoyées' },
                    { k: 'paid', label: 'Payées' },
                    { k: 'overdue', label: 'En retard' },
                    { k: 'cancelled', label: 'Annulées' },
                  ] as const).map((f) => (
                    <div
                      key={f.k}
                      className={`tab${statusFilter === f.k ? ' active' : ''}`}
                      onClick={() => setStatusFilter(f.k as 'all' | CRMInvoice['status'])}
                    >
                      {f.label} ({f.k === 'all' ? invoices.length : invoices.filter((i) => i.status === f.k).length})
                    </div>
                  ))}
                </div>

                {/* Recent cards */}
                {invoices.length > 0 && (
                  <div className="invoice-row">
                    {invoices.slice(0, 4).map((inv) => (
                      <div key={inv.id} className="invoice-card">
                        <div className="invoice-num">{inv.number}</div>
                        <div className="invoice-client">{inv.client_name}</div>
                        <div className="invoice-amount">{fmtE(inv.total_ttc)}</div>
                        <div className="invoice-date">{fmt(inv.emission_date)}</div>
                        <span className={`status-pill ${STATUS_CSS[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="card table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Client</th>
                        <th>Type</th>
                        <th>Montant HT</th>
                        <th>TVA</th>
                        <th>TTC</th>
                        <th>Date</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink4)', padding: 40 }}>
                            {invoices.length === 0 ? 'Aucun document — créez votre premier devis ou facture' : 'Aucun document dans cette catégorie'}
                          </td>
                        </tr>
                      ) : filteredInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600 }}>
                            {inv.is_recurring && <span title="Facture récurrente" style={{ marginRight: 6 }}>🔁</span>}
                            {inv.number}
                          </td>
                          <td>
                            <div>{inv.client_name}</div>
                            {inv.client_email && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{inv.client_email}</div>}
                          </td>
                          <td>
                            <span className={`status-pill ${inv.type === 'FACTURE' ? 'active' : 'prospect'}`}>
                              {inv.type}
                            </span>
                          </td>
                          <td>{fmtE(inv.total_ht)}</td>
                          <td style={{ color: 'var(--ink3)' }}>{fmtE(inv.total_tva)}</td>
                          <td style={{ fontWeight: 700 }}>{fmtE(inv.total_ttc)}</td>
                          <td style={{ color: 'var(--ink3)' }}>{fmt(inv.emission_date)}</td>
                          <td>
                            <select
                              value={inv.status}
                              onChange={(e) => updateStatus(inv.id, e.target.value as CRMInvoice['status'])}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                                color: inv.status === 'paid' ? 'var(--emerald)' :
                                  inv.status === 'overdue' ? 'var(--crimson)' :
                                    inv.status === 'sent' ? 'var(--cobalt)' : 'var(--ink3)',
                              }}
                            >
                              <option value="draft">Brouillon</option>
                              <option value="sent">Envoyée</option>
                              <option value="paid">Payée</option>
                              <option value="overdue">En retard</option>
                              <option value="cancelled">Annulée</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <a
                                href={`/invoices/${inv.id}/print`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm"
                                style={{ background: 'var(--navy)', color: '#fff', textDecoration: 'none' }}
                                title="Voir / Imprimer / PDF"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="6 9 6 2 18 2 18 9" />
                                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                  <rect x="6" y="14" width="12" height="8" />
                                </svg>
                              </a>
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: 'var(--cobalt-lt)',
                                  color: 'var(--cobalt)',
                                  border: '1px solid #bfdbfe',
                                }}
                                onClick={() => sendByEmail(inv)}
                                title="Envoyer par email"
                                disabled={!inv.client_email}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                              </button>
                              <button
                                className="btn btn-sm"
                                style={{ background: 'var(--crimson-lt)', color: 'var(--crimson)', border: '1px solid #fecaca' }}
                                onClick={() => deleteInvoice(inv.id)}
                                title="Supprimer"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── NOUVEAU ── */}
        {tab === 'new' && (
          <div className="inv-split">
            {/* Form */}
            <div className="inv-form">
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 4 }}>
                Créer un document commercial
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 24 }}>
                L&apos;aperçu se synchronise en temps réel avec votre saisie.
              </div>

              {/* Type selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
                <button
                  className={`btn ${docType === 'DEVIS' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setDocType('DEVIS')}
                >Devis</button>
                <button
                  className={`btn ${docType === 'FACTURE' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setDocType('FACTURE')}
                >Facture</button>
              </div>

              <div className="form-section-label">Informations générales</div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">Contact CRM (optionnel)</label>
                <select
                  className="form-input"
                  value={contactId}
                  onChange={(e) => onSelectContact(e.target.value)}
                >
                  <option value="">— Saisie libre —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Nom client *</label>
                  <input
                    className="form-input"
                    placeholder="AutoFleet Lyon"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">E-mail destinataire</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="contact@client.fr"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Date d&apos;émission</label>
                  <input className="form-input" type="date" value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Validité / Échéance</label>
                  <input className="form-input" type="date" value={dateValidity} onChange={(e) => setDateValidity(e.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-field">
                  <label className="form-label">Référence interne</label>
                  <input className="form-input" placeholder="ex: PROJ-2026-042" value={ref} onChange={(e) => setRef(e.target.value)} />
                </div>
                <div />
              </div>

              {docType === 'FACTURE' && (
                <div style={{ padding: 14, border: '1px solid var(--stone2)', borderRadius: 8, marginBottom: 16, background: 'var(--ivory)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      style={{ accentColor: 'var(--navy)', width: 14, height: 14 }}
                    />
                    🔁 Facture récurrente
                  </label>
                  {isRecurring && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <label style={{ fontSize: 12, color: 'var(--ink3)' }}>Régénérer :</label>
                      <select
                        className="form-input"
                        style={{ maxWidth: 200 }}
                        value={recurringInterval}
                        onChange={(e) => setRecurringInterval(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
                      >
                        <option value="monthly">Tous les mois</option>
                        <option value="quarterly">Tous les trimestres</option>
                        <option value="yearly">Tous les ans</option>
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                        La prochaine sera créée automatiquement
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-section-label" style={{ marginTop: 8 }}>Lignes de prestation</div>
              <div className="line-items">
                <div className="line-head">
                  <span>Description</span><span>Qté</span><span>Prix unit. HT</span><span />
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="line-item">
                    <input className="li-input" placeholder="Description" value={l.desc} onChange={(e) => updateLine(i, 'desc', e.target.value)} />
                    <input className="li-input" type="number" min="1" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} />
                    <input className="li-input" type="number" step="0.01" placeholder="0,00" value={l.price} onChange={(e) => updateLine(i, 'price', e.target.value)} />
                    <button className="li-del" onClick={() => removeLine(i)}>✕</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 22 }} onClick={addLine}>
                + Ajouter une ligne
              </button>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="form-label">Notes / Conditions</label>
                  <textarea className="form-input" rows={4} placeholder="Conditions de paiement…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="inv-total" style={{ width: 220, flexShrink: 0 }}>
                  <div className="total-row"><span>Sous-total HT</span><span>{fmtE(totalHT)}</span></div>
                  <div className="total-row"><span>TVA (20 %)</span><span>{fmtE(tva)}</span></div>
                  <div className="total-row final"><span>Total TTC</span><span>{fmtE(ttc)}</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-gold" onClick={() => createInvoice('draft')} disabled={saving || !clientName.trim()} style={{ opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Enregistrement…' : 'Sauvegarder brouillon'}
                </button>
                <button className="btn btn-primary" onClick={() => createInvoice('sent')} disabled={saving || !clientName.trim()} style={{ opacity: saving ? 0.6 : 1 }}>
                  Marquer comme envoyé
                </button>
                <button className="btn btn-ghost" onClick={() => setTab('list')}>Annuler</button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="preview-panel">
              <div className="preview-chrome">
                <div className="preview-chrome-title">Aperçu document</div>
                <div className="live-badge">
                  <div className="live-dot" />
                  Live
                </div>
              </div>
              <div className="preview-scroll">
                <div className="preview-doc">
                  {/* Header */}
                  <div className="prev-header">
                    <div className="prev-brand">
                      <div className="prev-brand-icon">🚗</div>
                      <div>
                        <div className="prev-brand-name">Notifcar</div>
                        <div className="prev-brand-sub">notifcar.app</div>
                      </div>
                    </div>
                    <div className="prev-doc-badge">
                      <div className="prev-doc-type">{docType}</div>
                      <div className="prev-doc-num">{previewNum}</div>
                      <div className={`prev-doc-pill ${docType === 'DEVIS' ? 'devis' : 'facture'}`}>
                        {docType === 'DEVIS' ? 'Devis' : 'Facture'}
                      </div>
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="prev-parties">
                    <div>
                      <div className="prev-party-label">Émetteur</div>
                      <div className="prev-party-name">Notifcar SAS</div>
                      <div className="prev-party-info">
                        123 rue de l&apos;Innovation<br />
                        75001 Paris, France<br />
                        contact@notifcar.app
                      </div>
                    </div>
                    <div>
                      <div className="prev-party-label">Destinataire</div>
                      <div className="prev-party-name">{clientName || 'Nom du client'}</div>
                      <div className="prev-party-info">{clientEmail || '—'}</div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="prev-dates-row">
                    <div className="prev-date-chip">
                      <div className="prev-date-chip-label">Date d&apos;émission</div>
                      <div className="prev-date-chip-val">{dateEmission ? new Date(dateEmission + 'T12:00:00').toLocaleDateString('fr-FR') : '—'}</div>
                    </div>
                    <div className="prev-date-chip">
                      <div className="prev-date-chip-label">{docType === 'DEVIS' ? 'Validité' : 'Échéance'}</div>
                      <div className="prev-date-chip-val">{dateValidity ? new Date(dateValidity + 'T12:00:00').toLocaleDateString('fr-FR') : '—'}</div>
                    </div>
                    {ref && (
                      <div className="prev-date-chip">
                        <div className="prev-date-chip-label">Référence</div>
                        <div className="prev-date-chip-val">{ref}</div>
                      </div>
                    )}
                  </div>

                  {/* Items table */}
                  <table className="prev-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qté</th>
                        <th>P.U. HT</th>
                        <th>Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.filter((l) => l.desc).map((l, i) => (
                        <tr key={i}>
                          <td>{l.desc}</td>
                          <td>{l.qty}</td>
                          <td>{parseFloat(l.price || '0').toFixed(2)} €</td>
                          <td>{((parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0)).toFixed(2)} €</td>
                        </tr>
                      ))}
                      {lines.filter((l) => l.desc).length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#b8c0cc', padding: 24 }}>Aucune prestation</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="prev-totals-block">
                    <div className="prev-totals-inner">
                      <div className="prev-total-line"><span>Sous-total HT</span><span>{fmtE(totalHT)}</span></div>
                      <div className="prev-total-line"><span>TVA 20%</span><span>{fmtE(tva)}</span></div>
                      <div className="prev-total-line big"><span>Total TTC</span><span>{fmtE(ttc)}</span></div>
                    </div>
                  </div>

                  {/* Notes */}
                  {notes && (
                    <div className="prev-notes-block">
                      <div className="prev-notes-label">Notes & Conditions</div>
                      <div className="prev-notes-text">{notes}</div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="prev-footer-bar">
                    <div className="prev-footer-legal">Notifcar SAS — SIRET : 000 000 000 00000 — TVA : FR00000000000</div>
                    <div className={`prev-stamp ${docType === 'DEVIS' ? 'devis' : 'facture'}`}>{docType}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>}>
      <InvoicesPageInner />
    </Suspense>
  )
}
