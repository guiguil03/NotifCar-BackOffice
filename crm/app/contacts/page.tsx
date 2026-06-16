'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { CRMContact } from '@/lib/types'
import { toCSV, downloadCSV } from '@/lib/csv'
import GlobalSearch from '@/components/GlobalSearch'

const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', prospect: 'Prospect', negocie: 'Négociation', gagne: 'Gagné', perdu: 'Perdu',
}
const PRIORITY_LABEL: Record<string, string> = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' }

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Toast { msg: string; ok: boolean }

const EMPTY_CONTACT = {
  name: '', email: '', phone: '', company: '', role: '',
  stage: 'lead' as CRMContact['stage'],
  priority: 'moyenne' as CRMContact['priority'],
  estimated_value: '', notes: '', tags: '',
}

type StageFilter = 'all' | CRMContact['stage']
type PriorityFilter = 'all' | CRMContact['priority']

export default function ContactsPage() {
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [tagFilter, setTagFilter] = useState<string>('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editContact, setEditContact] = useState<CRMContact | null>(null)
  const [form, setForm] = useState(EMPTY_CONTACT)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags ?? []))).sort()

  const filtered = contacts.filter((c) => {
    if (stageFilter !== 'all' && c.stage !== stageFilter) return false
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false
    if (tagFilter && !(c.tags ?? []).includes(tagFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.email.toLowerCase().includes(q) &&
        !(c.company ?? '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const stageCount = (s: StageFilter) => s === 'all' ? contacts.length : contacts.filter((c) => c.stage === s).length

  const openAdd = () => {
    setEditContact(null)
    setForm(EMPTY_CONTACT)
    setModalOpen(true)
  }

  const openEdit = (c: CRMContact) => {
    setEditContact(c)
    setForm({
      name: c.name, email: c.email, phone: c.phone ?? '',
      company: c.company ?? '', role: c.role ?? '',
      stage: c.stage, priority: c.priority,
      estimated_value: c.estimated_value ?? '',
      notes: typeof c.notes === 'string' ? c.notes : '', tags: (c.tags ?? []).join(', '),
    })
    setModalOpen(true)
  }

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
      const url = editContact ? `/api/contacts/${editContact.id}` : '/api/contacts'
      const method = editContact ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(editContact ? 'Contact mis à jour' : 'Contact créé')
      setModalOpen(false)
      fetchContacts()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/contacts/${deleteId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Contact supprimé')
      setContacts((prev) => prev.filter((c) => c.id !== deleteId))
    }
    setDeleteId(null)
  }

  const exportCSV = () => {
    const rows = filtered.map((c) => ({
      nom: c.name, email: c.email, telephone: c.phone ?? '',
      entreprise: c.company ?? '', poste: c.role ?? '',
      etape: STAGE_LABEL[c.stage], priorite: PRIORITY_LABEL[c.priority],
      valeur_estimee: c.estimated_value ?? '',
      tags: (c.tags ?? []).join(' | '),
      dernier_contact: c.last_contact_at ?? '',
      cree_le: c.created_at,
    }))
    if (rows.length === 0) { showToast('Aucun contact à exporter', false); return }
    downloadCSV(`contacts-${new Date().toISOString().split('T')[0]}.csv`, toCSV(rows))
    showToast(`${rows.length} contact${rows.length > 1 ? 's' : ''} exporté${rows.length > 1 ? 's' : ''}`)
  }

  return (
    <>
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
        <div className="page-title">Contacts CRM</div>
        <GlobalSearch />
        <button className="btn btn-ghost btn-sm" onClick={exportCSV} style={{ marginRight: 8 }}>Exporter CSV</button>
        <button className="btn btn-gold btn-sm" onClick={openAdd}>+ Nouveau contact</button>
      </div>

      <div className="content">
        <div className="tabs" style={{ marginBottom: 16 }}>
          {([
            { k: 'all', label: 'Tous' },
            { k: 'lead', label: 'Leads' },
            { k: 'prospect', label: 'Prospects' },
            { k: 'negocie', label: 'Négociation' },
            { k: 'gagne', label: 'Gagnés' },
            { k: 'perdu', label: 'Perdus' },
          ] as const).map((f) => (
            <div
              key={f.k}
              className={`tab${stageFilter === f.k ? ' active' : ''}`}
              onClick={() => setStageFilter(f.k)}
            >
              {f.label} ({stageCount(f.k)})
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="Rechercher (nom, email, entreprise)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            style={{ maxWidth: 160 }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          >
            <option value="all">Toutes priorités</option>
            <option value="haute">Haute</option>
            <option value="moyenne">Moyenne</option>
            <option value="basse">Basse</option>
          </select>
          {allTags.length > 0 && (
            <select
              className="form-input"
              style={{ maxWidth: 160 }}
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">Tous tags</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Entreprise</th>
                  <th>Étape</th>
                  <th>Priorité</th>
                  <th>Valeur estimée</th>
                  <th>Dernier contact</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink4)', padding: 40 }}>
                      Aucun contact
                    </td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <Link href={`/contacts/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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
                            {c.tags.length > 3 && <span style={{ fontSize: 9, color: 'var(--ink4)' }}>+{c.tags.length - 3}</span>}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td>
                      <div>{c.company ?? '—'}</div>
                      {c.role && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{c.role}</div>}
                    </td>
                    <td><span className={`status-pill ${c.stage}`}>{STAGE_LABEL[c.stage]}</span></td>
                    <td>
                      <div className={`priority ${c.priority}`}>
                        <span /><span /><span />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 3 }}>{PRIORITY_LABEL[c.priority]}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{c.estimated_value ?? '—'}</td>
                    <td style={{ color: 'var(--ink3)' }}>{fmtDate(c.last_contact_at ?? null)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} title="Modifier">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'var(--crimson-lt)', color: 'var(--crimson)', border: '1px solid #fecaca' }}
                          onClick={() => setDeleteId(c.id)} title="Supprimer"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        )}
      </div>

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
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em' }}>
                {editContact ? 'Modifier le contact' : 'Nouveau contact'}
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 18 }}>✕</button>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Nom *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Téléphone</label>
                <input className="form-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Entreprise</label>
                <input className="form-input" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Poste</label>
                <input className="form-input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Valeur estimée</label>
                <input className="form-input" placeholder="1 200 €/mois" value={form.estimated_value} onChange={(e) => setForm((p) => ({ ...p, estimated_value: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Étape</label>
                <select className="form-input" value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as CRMContact['stage'] }))}>
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="negocie">Négociation</option>
                  <option value="gagne">Gagné</option>
                  <option value="perdu">Perdu</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Priorité</label>
                <select className="form-input" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as CRMContact['priority'] }))}>
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: 14 }}>
              <label className="form-label">Tags (séparés par virgule)</label>
              <input className="form-input" placeholder="VIP, Lyon, flotte 50+" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
            </div>
            <div className="form-field" style={{ marginBottom: 14 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Annuler</button>
              <button
                className="btn btn-gold btn-sm"
                onClick={saveContact}
                disabled={saving || !form.name.trim() || !form.email.trim()}
              >
                {saving ? 'Enregistrement…' : (editContact ? 'Mettre à jour' : 'Créer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: 28, width: 380, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              Supprimer ce contact ?
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 22 }}>
              Cette action est irréversible. Toutes les notes et deals associés seront également supprimés.
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
