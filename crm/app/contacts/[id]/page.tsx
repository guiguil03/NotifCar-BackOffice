'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CRMContact, CRMDeal, CRMNote, CRMInvoice } from '@/lib/types'

/* ── Helpers ── */
const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead', prospect: 'Prospect', negocie: 'Négociation', gagne: 'Gagné', perdu: 'Perdu',
}
const NOTE_TYPE_LABEL: Record<string, string> = {
  note: 'Note', call: 'Appel', email: 'Email', rdv: 'RDV',
}
const NOTE_TYPE_ICON: Record<string, string> = {
  note: '📝', call: '📞', email: '✉️', rdv: '📅',
}
const NOTE_TYPE_COLOR: Record<string, string> = {
  note: 'var(--ink3)', call: 'var(--cobalt)', email: 'var(--violet)', rdv: 'var(--gold)',
}
const STATUS_CSS: Record<string, string> = {
  paid: 'active', sent: 'prospect', draft: 'basic', overdue: 'past-due', cancelled: 'cancelled'
}
const STATUS_LABEL: Record<string, string> = {
  paid: 'Payée', sent: 'Envoyée', draft: 'Brouillon', overdue: 'En retard', cancelled: 'Annulée'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtE(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' }

const STAGES: { key: CRMContact['stage']; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'prospect', label: 'Prospect' },
  { key: 'negocie', label: 'Négociation' },
  { key: 'gagne', label: 'Gagné' },
  { key: 'perdu', label: 'Perdu' },
]

interface Toast { msg: string; ok: boolean }

const EMPTY_FORM = {
  name: '', email: '', phone: '', company: '', role: '',
  stage: 'lead' as CRMContact['stage'],
  priority: 'moyenne' as CRMContact['priority'],
  estimated_value: '', notes: '', tags: '',
}

const EMPTY_DEAL = {
  title: '', amount_monthly: '',
  stage: 'lead' as CRMDeal['stage'],
  expected_close: '', notes: '',
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<CRMContact & { deals?: CRMDeal[]; activity?: CRMNote[] } | null>(null)
  const [invoices, setInvoices] = useState<CRMInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Note form
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState<CRMNote['type']>('note')
  const [addingNote, setAddingNote] = useState(false)

  // Deal modal
  const [dealOpen, setDealOpen] = useState(false)
  const [dealForm, setDealForm] = useState(EMPTY_DEAL)
  const [savingDeal, setSavingDeal] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchContact = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/contacts/${id}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setContact(data)
    setLoading(false)
  }, [id])

  const fetchInvoices = useCallback(async () => {
    const res = await fetch('/api/invoices')
    const data = await res.json()
    if (Array.isArray(data)) {
      setInvoices(data.filter((inv: CRMInvoice) => inv.contact_id === id))
    }
  }, [id])

  useEffect(() => {
    fetchContact()
    fetchInvoices()
  }, [fetchContact, fetchInvoices])

  const openEdit = () => {
    if (!contact) return
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone ?? '',
      company: contact.company ?? '',
      role: contact.role ?? '',
      stage: contact.stage,
      priority: contact.priority,
      estimated_value: contact.estimated_value ?? '',
      notes: typeof contact.notes === 'string' ? contact.notes : '',
      tags: (contact.tags ?? []).join(', '),
    })
    setEditOpen(true)
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
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Contact mis à jour')
      setEditOpen(false)
      fetchContact()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setSaving(false)
    }
  }

  const createDeal = async () => {
    if (!dealForm.title.trim()) return
    setSavingDeal(true)
    try {
      const payload = {
        title: dealForm.title.trim(),
        contact_id: id,
        amount_monthly: dealForm.amount_monthly ? parseFloat(dealForm.amount_monthly) : null,
        stage: dealForm.stage,
        expected_close: dealForm.expected_close || null,
        notes: dealForm.notes.trim() || null,
        days_in_stage: 0,
      }
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Deal créé')
      setDealOpen(false)
      setDealForm(EMPTY_DEAL)
      fetchContact()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setSavingDeal(false)
    }
  }

  const deleteDeal = async (dealId: string) => {
    if (!confirm('Supprimer ce deal ?')) return
    const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Deal supprimé')
      fetchContact()
    } else {
      showToast('Erreur', false)
    }
  }

  const moveDealStage = async (dealId: string, newStage: CRMDeal['stage']) => {
    const res = await fetch(`/api/deals/${dealId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    if (res.ok) {
      showToast('Étape du deal mise à jour')
      fetchContact()
    }
  }

  const addNote = async () => {
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/contacts/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent.trim(), type: noteType }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Note ajoutée')
      setNoteContent('')
      setNoteType('note')
      fetchContact()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setAddingNote(false)
    }
  }

  const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2)

  if (loading) {
    return (
      <>
        <div className="topbar">
          <div className="page-title">Contact</div>
        </div>
        <div className="content">
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
        </div>
      </>
    )
  }

  if (!contact) {
    return (
      <>
        <div className="topbar">
          <div className="page-title">Contact introuvable</div>
        </div>
        <div className="content">
          <div style={{ padding: 40 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/clients')}>← Retour aux contacts</button>
          </div>
        </div>
      </>
    )
  }

  const notes: CRMNote[] = (contact.activity as unknown as CRMNote[]) ?? []
  const deals: CRMDeal[] = (contact.deals as unknown as CRMDeal[]) ?? []

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

      {/* Topbar */}
      <div className="topbar">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push('/clients')}
          style={{ marginRight: 8 }}
        >
          ← Retour
        </button>
        <div className="page-title" style={{ flex: 1 }}>{contact.name}</div>
        <button className="btn btn-ghost btn-sm" onClick={openEdit}>Modifier</button>
      </div>

      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 22, alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Contact header card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--navy)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-serif)', fontSize: 20, color: '#fff', fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {initials(contact.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>
                      {contact.name}
                    </div>
                    <span className={`status-pill ${contact.stage}`}>{STAGE_LABEL[contact.stage]}</span>
                  </div>
                  {contact.company && (
                    <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 2 }}>{contact.company}</div>
                  )}
                  {contact.role && (
                    <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{contact.role}</div>
                  )}
                  {contact.tags && contact.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {contact.tags.map((tag, i) => (
                        <span key={i} style={{
                          background: 'var(--cobalt-lt)', color: 'var(--cobalt)', fontSize: 10,
                          fontWeight: 700, padding: '2px 8px', borderRadius: 3, letterSpacing: '0.04em',
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Valeur estimée</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--navy)', fontWeight: 700 }}>
                    {contact.estimated_value ?? '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="card">
              <div className="card-title">Informations</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Email', value: contact.email, mono: false },
                  { label: 'Téléphone', value: contact.phone ?? '—', mono: false },
                  { label: 'Source', value: contact.source ?? '—', mono: false },
                  { label: 'Assigné à', value: contact.assigned_to ?? '—', mono: false },
                  { label: 'Priorité', value: contact.priority, mono: false },
                  { label: 'Dernier contact', value: fmtDate(contact.last_contact_at ?? null), mono: false },
                  { label: 'Créé le', value: fmtDate(contact.created_at), mono: false },
                  { label: 'Mis à jour', value: fmtDate(contact.updated_at), mono: false },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--ink4)', marginBottom: 3 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: item.mono ? 'monospace' : undefined }}>
                      {item.value || '—'}
                    </div>
                  </div>
                ))}
              </div>
              {typeof contact.notes === 'string' && contact.notes && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--ivory)', borderRadius: 6, borderLeft: '3px solid var(--navy)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--ink4)', marginBottom: 5 }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--ink2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{contact.notes}</div>
                </div>
              )}
            </div>

            {/* Timeline / Notes */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="section-title">
                Activité & Notes
                <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{(notes as CRMNote[]).length} entrée{(notes as CRMNote[]).length !== 1 ? 's' : ''}</span>
              </div>

              {/* Add note form */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--stone2)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {(['note', 'call', 'email', 'rdv'] as CRMNote['type'][]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNoteType(t)}
                      style={{
                        padding: '5px 12px', borderRadius: 5, border: '1px solid',
                        borderColor: noteType === t ? 'var(--navy)' : 'var(--stone2)',
                        background: noteType === t ? 'var(--navy)' : 'transparent',
                        color: noteType === t ? '#fff' : 'var(--ink3)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {NOTE_TYPE_ICON[t]} {NOTE_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder={`Ajouter une ${NOTE_TYPE_LABEL[noteType].toLowerCase()}…`}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={addNote}
                  disabled={addingNote || !noteContent.trim()}
                  style={{ opacity: addingNote ? 0.6 : 1 }}
                >
                  {addingNote ? 'Ajout…' : '+ Ajouter'}
                </button>
              </div>

              {/* Timeline */}
              {(notes as CRMNote[]).length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink4)' }}>
                  Aucune activité enregistrée
                </div>
              ) : (
                <div className="timeline">
                  {(notes as CRMNote[]).map((note) => (
                    <div key={note.id} className="tl-item">
                      <div className="tl-dot" style={{ borderColor: NOTE_TYPE_COLOR[note.type] }}>
                        <span style={{ fontSize: 10 }}>{NOTE_TYPE_ICON[note.type]}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span className="tl-title">{NOTE_TYPE_LABEL[note.type]}</span>
                          <span style={{ fontSize: 10, color: 'var(--ink4)' }}>{note.author}</span>
                          <span style={{ fontSize: 10, color: 'var(--ink4)', marginLeft: 'auto' }}>{fmtDateTime(note.created_at)}</span>
                        </div>
                        <div className="tl-desc" style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Deals */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Deals associés
                  <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{deals.length}</span>
                </span>
                <button
                  onClick={() => { setDealForm(EMPTY_DEAL); setDealOpen(true) }}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 4, border: 'none',
                    background: 'var(--gold)', color: '#fff', cursor: 'pointer', fontWeight: 600,
                  }}
                >+ Deal</button>
              </div>
              {deals.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 12 }}>
                  Aucun deal associé
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => { setDealForm(EMPTY_DEAL); setDealOpen(true) }}
                      style={{
                        fontSize: 11, padding: '6px 12px', borderRadius: 4, border: '1px solid var(--gold)',
                        background: 'var(--white)', color: 'var(--gold-dk)', cursor: 'pointer', fontWeight: 600,
                      }}
                    >+ Créer un deal</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deals.map((deal) => (
                    <div key={deal.id} className="pipe-card" style={{ cursor: 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div className="pipe-card-name" style={{ flex: 1 }}>{deal.title}</div>
                        <button
                          onClick={() => deleteDeal(deal.id)}
                          title="Supprimer"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--ink4)', fontSize: 14, padding: 0, lineHeight: 1,
                          }}
                        >✕</button>
                      </div>
                      <div className="pipe-card-footer" style={{ marginTop: 8 }}>
                        <select
                          value={deal.stage}
                          onChange={(e) => moveDealStage(deal.id, e.target.value as CRMDeal['stage'])}
                          className={`status-pill ${deal.stage}`}
                          style={{
                            fontSize: 10, border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', fontWeight: 700,
                          }}
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                        <div className="pipe-amount">
                          {deal.amount_monthly ? deal.amount_monthly.toLocaleString('fr-FR') + ' €/mois' : 'Sur devis'}
                        </div>
                      </div>
                      {deal.expected_close && (
                        <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 4 }}>
                          Clôture prévue : {fmtDate(deal.expected_close)}
                        </div>
                      )}
                    </div>
                  ))}
                  <a
                    href={`/pipeline?contact=${id}`}
                    style={{
                      fontSize: 11, color: 'var(--gold-dk)', fontWeight: 600,
                      textAlign: 'center', textDecoration: 'none', padding: 6,
                    }}
                  >Voir dans le pipeline →</a>
                </div>
              )}
            </div>

            {/* Invoices */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Factures & Devis
                  <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{invoices.length}</span>
                </span>
                <a
                  href={`/invoices?contact=${id}`}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 4,
                    background: 'var(--gold)', color: '#fff', textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >+ Devis/Facture</a>
              </div>
              {invoices.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 12 }}>
                  Aucun document associé
                </div>
              ) : (
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {invoices.map((inv) => (
                    <div key={inv.id} style={{
                      padding: '10px 12px', border: '1px solid var(--stone2)', borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{inv.number}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>{fmtDate(inv.emission_date)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>{fmtE(inv.total_ttc)}</div>
                        <span className={`status-pill ${STATUS_CSS[inv.status]}`} style={{ fontSize: 9, marginTop: 3 }}>
                          {STATUS_LABEL[inv.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage quick-change */}
            <div className="card">
              <div className="card-title">Changer l&apos;étape</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STAGES.map((s) => (
                  <button
                    key={s.key}
                    onClick={async () => {
                      const res = await fetch(`/api/contacts/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stage: s.key }),
                      })
                      if (res.ok) {
                        showToast(`Étape mise à jour : ${s.label}`)
                        setContact((prev) => prev ? { ...prev, stage: s.key } : prev)
                      }
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: 6, border: '1px solid',
                      borderColor: contact.stage === s.key ? 'var(--navy)' : 'var(--stone2)',
                      background: contact.stage === s.key ? 'var(--navy)' : 'transparent',
                      color: contact.stage === s.key ? '#fff' : 'var(--ink2)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.13s',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span className={`status-dot`} style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: contact.stage === s.key ? '#fff' :
                        s.key === 'lead' ? 'var(--violet)' :
                        s.key === 'prospect' ? 'var(--cobalt)' :
                        s.key === 'negocie' ? 'var(--gold)' :
                        s.key === 'gagne' ? 'var(--emerald)' : 'var(--crimson)',
                    }} />
                    {s.label}
                    {contact.stage === s.key && (
                      <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓ Actuel</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editOpen && (
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
                Modifier le contact
              </div>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 18 }}>✕</button>
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
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
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

            <div className="form-field" style={{ marginBottom: 20 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditOpen(false)}>Annuler</button>
              <button
                className="btn btn-gold btn-sm"
                onClick={saveContact}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Enregistrement…' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEAL MODAL ── */}
      {dealOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 20,
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: 12, padding: 32,
            width: 460, boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em' }}>
                Nouveau deal pour {contact.name}
              </div>
              <button onClick={() => setDealOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--ivory)', borderRadius: 6, fontSize: 11, color: 'var(--ink3)' }}>
              👤 Lié automatiquement à <b>{contact.name}</b>
              {contact.company && ` · ${contact.company}`}
            </div>

            <div className="form-field" style={{ marginBottom: 12 }}>
              <label className="form-label">Titre du deal *</label>
              <input
                className="form-input"
                placeholder="ex: Abonnement Entreprise"
                value={dealForm.title}
                onChange={(e) => setDealForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-field">
                <label className="form-label">Montant mensuel (€)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="1200"
                  value={dealForm.amount_monthly}
                  onChange={(e) => setDealForm((p) => ({ ...p, amount_monthly: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Étape</label>
                <select
                  className="form-input"
                  value={dealForm.stage}
                  onChange={(e) => setDealForm((p) => ({ ...p, stage: e.target.value as CRMDeal['stage'] }))}
                >
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 12 }}>
              <label className="form-label">Clôture prévue</label>
              <input
                className="form-input"
                type="date"
                value={dealForm.expected_close}
                onChange={(e) => setDealForm((p) => ({ ...p, expected_close: e.target.value }))}
              />
            </div>

            <div className="form-field" style={{ marginBottom: 20 }}>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={2}
                value={dealForm.notes}
                onChange={(e) => setDealForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDealOpen(false)}>Annuler</button>
              <button
                className="btn btn-gold btn-sm"
                onClick={createDeal}
                disabled={savingDeal || !dealForm.title.trim()}
                style={{ opacity: savingDeal ? 0.6 : 1 }}
              >
                {savingDeal ? 'Création…' : 'Créer le deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
