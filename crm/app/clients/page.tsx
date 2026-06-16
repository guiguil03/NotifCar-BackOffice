'use client'
import { useEffect, useState, useCallback } from 'react'
import { CRMContact } from '@/lib/types'
import { toCSV, downloadCSV } from '@/lib/csv'

/* ── Supabase subscribers types ── */
interface SubRecord {
  user_id: string
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  last_invoice_status: string | null
  created_at: string
  updated_at: string
  plan: { slug: string; name: string } | null
}

/* ── Helpers ── */
const STATUS_LABEL: Record<string, string> = {
  active: 'Actif', cancelled: 'Annulé', incomplete: 'Incomplet',
  incomplete_expired: 'Expiré', past_due: 'Retard', trialing: 'Essai',
}
const STATUS_CSS: Record<string, string> = {
  active: 'active', cancelled: 'cancelled', incomplete: 'incomplete',
  incomplete_expired: 'cancelled', past_due: 'past-due', trialing: 'active',
}
const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', prospect: 'Prospect', negocie: 'Négociation', gagne: 'Gagné', perdu: 'Perdu',
}
const PRIORITY_LABEL: Record<string, string> = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' }

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Empty contact for form ── */
const EMPTY_CONTACT = {
  name: '', email: '', phone: '', company: '', role: '',
  stage: 'lead' as CRMContact['stage'],
  priority: 'moyenne' as CRMContact['priority'],
  estimated_value: '', notes: '', tags: '',
}

/* ── Toast ── */
interface Toast { msg: string; ok: boolean }

export default function ClientsPage() {
  const [mainTab, setMainTab] = useState<'abonnes' | 'crm'>('abonnes')

  /* ── Subscribers tab ── */
  const [subs, setSubs] = useState<SubRecord[]>([])
  const [loadingSubs, setLoadingSubs] = useState(true)
  const [subFilter, setSubFilter] = useState('all')
  const [subSearch, setSubSearch] = useState('')

  /* ── CRM tab ── */
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [crmSearch, setCrmSearch] = useState('')

  /* ── Modal ── */
  const [modalOpen, setModalOpen] = useState(false)
  const [editContact, setEditContact] = useState<CRMContact | null>(null)
  const [form, setForm] = useState(EMPTY_CONTACT)
  const [saving, setSaving] = useState(false)

  /* ── Delete confirm ── */
  const [deleteId, setDeleteId] = useState<string | null>(null)

  /* ── Toast ── */
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Fetch subscribers via API (admin client server-side) ── */
  useEffect(() => {
    fetch('/api/subscribers')
      .then((r) => r.json())
      .then((data) => {
        setSubs(Array.isArray(data) ? data : [])
        setLoadingSubs(false)
      })
      .catch(() => setLoadingSubs(false))
  }, [])

  /* ── Fetch CRM contacts ── */
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true)
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
    setLoadingContacts(false)
  }, [])

  useEffect(() => {
    if (mainTab === 'crm') fetchContacts()
  }, [mainTab, fetchContacts])

  /* ── Sub filters ── */
  const filteredSubs = subs.filter((s) => {
    const slug = (s.plan as SubRecord['plan'])?.slug ?? ''
    if (subFilter === 'premium' && slug !== 'premium') return false
    if (subFilter === 'basic' && slug !== 'basic') return false
    if (subFilter === 'cancelled' && s.status !== 'cancelled') return false
    if (subSearch && !s.user_id.toLowerCase().includes(subSearch.toLowerCase()) &&
      !(s.stripe_customer_id ?? '').toLowerCase().includes(subSearch.toLowerCase())) return false
    return true
  })

  const subCounts = {
    all: subs.length,
    premium: subs.filter((s) => (s.plan as SubRecord['plan'])?.slug === 'premium').length,
    basic: subs.filter((s) => (s.plan as SubRecord['plan'])?.slug === 'basic').length,
    cancelled: subs.filter((s) => s.status === 'cancelled').length,
  }

  /* ── CRM filters ── */
  const filteredContacts = contacts.filter((c) => {
    if (!crmSearch) return true
    const q = crmSearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q)
    )
  })

  /* ── Open modal ── */
  const openAdd = () => {
    setEditContact(null)
    setForm(EMPTY_CONTACT)
    setModalOpen(true)
  }

  const openEdit = (c: CRMContact) => {
    setEditContact(c)
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone ?? '',
      company: c.company ?? '',
      role: c.role ?? '',
      stage: c.stage,
      priority: c.priority,
      estimated_value: c.estimated_value ?? '',
      notes: typeof c.notes === 'string' ? c.notes : '',
      tags: (c.tags ?? []).join(', '),
    })
    setModalOpen(true)
  }

  /* ── Save contact ── */
  const saveContact = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        role: form.role.trim() || null,
        stage: form.stage,
        priority: form.priority,
        estimated_value: form.estimated_value.trim() || null,
        notes: form.notes.trim() || null,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }

      if (editContact) {
        const res = await fetch(`/api/contacts/${editContact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        showToast('Contact mis à jour')
      } else {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        showToast('Contact créé')
      }
      setModalOpen(false)
      fetchContacts()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete contact ── */
  const confirmDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/contacts/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Contact supprimé')
      setContacts((prev) => prev.filter((c) => c.id !== deleteId))
    } else {
      showToast('Erreur lors de la suppression', false)
    }
    setDeleteId(null)
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 100,
          background: toast.ok ? 'var(--emerald)' : 'var(--crimson)',
          color: '#fff', padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div className="topbar">
        <div className="page-title">Clients & Abonnés</div>
        <div className="search-wrap">
          <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="search-bar"
            placeholder={mainTab === 'abonnes' ? 'Rechercher par user ID ou Stripe…' : 'Rechercher un contact…'}
            value={mainTab === 'abonnes' ? subSearch : crmSearch}
            onChange={(e) => mainTab === 'abonnes' ? setSubSearch(e.target.value) : setCrmSearch(e.target.value)}
          />
        </div>
        {mainTab === 'crm' && (
          <button className="btn btn-gold btn-sm" onClick={openAdd}>+ Nouveau contact</button>
        )}
        {mainTab === 'abonnes' && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const rows = filteredSubs.map((s) => ({
                user_id: s.user_id,
                plan: s.plan?.name ?? '',
                statut: STATUS_LABEL[s.status] ?? s.status,
                stripe_customer: s.stripe_customer_id ?? '',
                derniere_facture: s.last_invoice_status ?? '',
                fin_periode: s.current_period_end ?? '',
                inscrit_le: s.created_at,
              }))
              if (rows.length === 0) { showToast('Aucune donnée à exporter', false); return }
              downloadCSV(`abonnes-${new Date().toISOString().split('T')[0]}.csv`, toCSV(rows))
              showToast(`${rows.length} abonné${rows.length > 1 ? 's' : ''} exporté${rows.length > 1 ? 's' : ''}`)
            }}
          >Exporter CSV</button>
        )}
        {mainTab === 'crm' && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const rows = filteredContacts.map((c) => ({
                nom: c.name,
                email: c.email,
                telephone: c.phone ?? '',
                entreprise: c.company ?? '',
                poste: c.role ?? '',
                etape: STAGE_LABEL[c.stage],
                priorite: PRIORITY_LABEL[c.priority],
                valeur_estimee: c.estimated_value ?? '',
                tags: (c.tags ?? []).join(' | '),
                dernier_contact: c.last_contact_at ?? '',
                cree_le: c.created_at,
              }))
              if (rows.length === 0) { showToast('Aucun contact à exporter', false); return }
              downloadCSV(`contacts-${new Date().toISOString().split('T')[0]}.csv`, toCSV(rows))
              showToast(`${rows.length} contact${rows.length > 1 ? 's' : ''} exporté${rows.length > 1 ? 's' : ''}`)
            }}
            style={{ marginLeft: 8 }}
          >Exporter CSV</button>
        )}
      </div>

      <div className="content">
        {/* Main tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <div
            className={`tab${mainTab === 'abonnes' ? ' active' : ''}`}
            onClick={() => setMainTab('abonnes')}
          >
            Abonnés app {loadingSubs ? '' : `(${subs.length})`}
          </div>
          <div
            className={`tab${mainTab === 'crm' ? ' active' : ''}`}
            onClick={() => setMainTab('crm')}
          >
            Contacts CRM {!loadingContacts && mainTab === 'crm' ? `(${contacts.length})` : ''}
          </div>
        </div>

        {/* ── ABONNÉS TAB ── */}
        {mainTab === 'abonnes' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div className="tabs" style={{ marginBottom: 0 }}>
                {(['all', 'premium', 'basic', 'cancelled'] as const).map((f) => (
                  <div
                    key={f}
                    className={`tab${subFilter === f ? ' active' : ''}`}
                    onClick={() => setSubFilter(f)}
                  >
                    {f === 'all' ? `Tous (${subCounts.all})` :
                      f === 'premium' ? `Premium (${subCounts.premium})` :
                        f === 'basic' ? `Basic (${subCounts.basic})` :
                          `Annulés (${subCounts.cancelled})`}
                  </div>
                ))}
              </div>
            </div>

            <div className="card table-wrap">
              {loadingSubs ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Plan</th>
                      <th>Statut</th>
                      <th>Stripe Customer</th>
                      <th>Dernière facture</th>
                      <th>Fin de période</th>
                      <th>Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink4)', padding: 32 }}>Aucun résultat</td></tr>
                    ) : (
                      filteredSubs.map((s, i) => (
                        <tr key={i} style={{ cursor: 'default' }}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ink2)' }}>
                              {s.user_id.substring(0, 16)}…
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${(s.plan as SubRecord['plan'])?.slug === 'premium' ? 'premium' : 'basic'}`}>
                              {(s.plan as SubRecord['plan'])?.name ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${STATUS_CSS[s.status] ?? 'basic'}`}>
                              {STATUS_LABEL[s.status] ?? s.status}
                            </span>
                          </td>
                          <td>
                            {s.stripe_customer_id ? (
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--cobalt)' }}>
                                {s.stripe_customer_id}
                              </span>
                            ) : <span style={{ color: 'var(--ink4)' }}>—</span>}
                          </td>
                          <td>
                            {s.last_invoice_status ? (
                              <span className={`status-pill ${s.last_invoice_status === 'paid' ? 'active' : 'past-due'}`}>
                                {s.last_invoice_status}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ color: 'var(--ink3)' }}>{fmtDate(s.current_period_end)}</td>
                          <td style={{ color: 'var(--ink3)' }}>{fmtDate(s.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── CRM CONTACTS TAB ── */}
        {mainTab === 'crm' && (
          <div className="card table-wrap">
            {loadingContacts ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Entreprise</th>
                    <th>Étape</th>
                    <th>Priorité</th>
                    <th>Valeur estimée</th>
                    <th>Deals</th>
                    <th>Dernier contact</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--ink4)', padding: 40 }}>
                        {crmSearch ? 'Aucun résultat' : 'Aucun contact CRM — cliquez sur « + Nouveau contact »'}
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((c) => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.email}</div>
                          {c.tags && c.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {c.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} style={{
                                  background: 'var(--cobalt-lt)', color: 'var(--cobalt)',
                                  fontSize: 9, fontWeight: 700, padding: '1px 6px',
                                  borderRadius: 3, letterSpacing: '0.04em',
                                }}>{tag}</span>
                              ))}
                              {c.tags.length > 3 && (
                                <span style={{ fontSize: 9, color: 'var(--ink4)' }}>+{c.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{c.company ?? '—'}</div>
                          {c.role && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{c.role}</div>}
                        </td>
                        <td>
                          <span className={`status-pill ${c.stage}`}>{STAGE_LABEL[c.stage]}</span>
                        </td>
                        <td>
                          <div className={`priority ${c.priority}`}>
                            <span /><span /><span />
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 3 }}>{PRIORITY_LABEL[c.priority]}</div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                          {c.estimated_value ?? '—'}
                        </td>
                        <td style={{ color: 'var(--ink3)' }}>
                          {(c.deals?.[0] as { count: number } | undefined)?.count ?? 0}
                        </td>
                        <td style={{ color: 'var(--ink3)' }}>{fmtDate(c.last_contact_at ?? null)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(c)}
                              title="Modifier"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--crimson-lt)', color: 'var(--crimson)', border: '1px solid #fecaca' }}
                              onClick={() => setDeleteId(c.id)}
                              title="Supprimer"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 20,
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: 12, padding: 32,
            width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-lg)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                {editContact ? 'Modifier le contact' : 'Nouveau contact CRM'}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 18, lineHeight: 1, padding: 4 }}
              >✕</button>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Nom *</label>
                <input
                  className="form-input"
                  placeholder="Jean Dupont"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Email *</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="jean@entreprise.fr"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Téléphone</label>
                <input
                  className="form-input"
                  placeholder="+33 6 00 00 00 00"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Entreprise</label>
                <input
                  className="form-input"
                  placeholder="AutoFleet SAS"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Poste</label>
                <input
                  className="form-input"
                  placeholder="Directeur des achats"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Valeur estimée</label>
                <input
                  className="form-input"
                  placeholder="1 200 €/mois"
                  value={form.estimated_value}
                  onChange={(e) => setForm((p) => ({ ...p, estimated_value: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Étape</label>
                <select
                  className="form-input"
                  value={form.stage}
                  onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as CRMContact['stage'] }))}
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="negocie">Négociation</option>
                  <option value="gagne">Gagné</option>
                  <option value="perdu">Perdu</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Priorité</label>
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as CRMContact['priority'] }))}
                >
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 14 }}>
              <label className="form-label">Tags (séparés par virgule)</label>
              <input
                className="form-input"
                placeholder="VIP, Lyon, flotte 50+"
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>

            <div className="form-field" style={{ marginBottom: 14 }}>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Informations complémentaires…"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {(!form.name.trim() || !form.email.trim()) && (
              <div style={{ fontSize: 11, color: 'var(--crimson)', marginBottom: 12 }}>
                Le nom et l&apos;email sont requis.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Annuler</button>
              <button
                className="btn btn-gold btn-sm"
                onClick={saveContact}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Enregistrement…' : (editContact ? 'Mettre à jour' : 'Créer le contact')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: 12, padding: 28, width: 380,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              Supprimer ce contact ?
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 22 }}>
              Cette action est irréversible. Tous les notes et deals associés seront également supprimés.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn btn-danger btn-sm" onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
