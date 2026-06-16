'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CRMDeal, CRMContact } from '@/lib/types'
import GlobalSearch from '@/components/GlobalSearch'

type Stage = 'lead' | 'prospect' | 'negocie' | 'gagne' | 'perdu'

const STAGES: { key: Stage; label: string; color: string; bar: string }[] = [
  { key: 'lead',     label: 'Lead',        color: 'var(--violet)',  bar: 'bar-purple' },
  { key: 'prospect', label: 'Prospect',    color: 'var(--cobalt)',  bar: 'bar-blue' },
  { key: 'negocie',  label: 'Négociation', color: 'var(--gold)',    bar: 'bar-orange' },
  { key: 'gagne',    label: 'Gagné',       color: 'var(--emerald)', bar: 'bar-green' },
  { key: 'perdu',    label: 'Perdu',       color: 'var(--crimson)', bar: 'bar-red' },
]

interface Toast { msg: string; ok: boolean }

const EMPTY_DEAL = { title: '', contact_id: '', amount_monthly: '', stage: 'lead' as Stage, notes: '', expected_close: '' }

function PipelineInner() {
  const searchParams = useSearchParams()
  const contactFilterParam = searchParams.get('contact')

  const [deals, setDeals] = useState<CRMDeal[]>([])
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newDeal, setNewDeal] = useState({ ...EMPTY_DEAL, contact_id: contactFilterParam ?? '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [contactFilter, setContactFilter] = useState<string>(contactFilterParam ?? '')
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/deals')
    const data = await res.json()
    setDeals(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const fetchContacts = useCallback(async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { fetchDeals(); fetchContacts() }, [fetchDeals, fetchContacts])

  const filteredDeals = contactFilter
    ? deals.filter((d) => d.contact?.id === contactFilter)
    : deals

  // Contacts sans deal associé (à afficher dans le pipeline selon leur stage)
  const contactsInDeals = new Set(deals.map((d) => d.contact?.id).filter(Boolean))
  const orphanContacts = contacts.filter((c) => !contactsInDeals.has(c.id))
  const filteredOrphanContacts = contactFilter
    ? orphanContacts.filter((c) => c.id === contactFilter)
    : orphanContacts

  const totalPipeline = filteredDeals
    .filter((d) => d.stage !== 'perdu')
    .reduce((acc, d) => acc + (d.amount_monthly ?? 0), 0)

  const dealsByStage = (stage: Stage) => filteredDeals.filter((d) => d.stage === stage)
  const contactsByStage = (stage: Stage) => filteredOrphanContacts.filter((c) => c.stage === stage)
  const totalByStage = (stage: Stage) => dealsByStage(stage).length + contactsByStage(stage).length

  const contactFilterObj = contacts.find((c) => c.id === contactFilter)

  const moveContactStage = async (contactId: string, stage: Stage) => {
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, stage } : c))
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (!res.ok) {
      showToast('Erreur', false)
      fetchContacts()
    }
  }

  const promoteContactToDeal = (contact: CRMContact) => {
    setNewDeal({
      title: `Deal — ${contact.company || contact.name}`,
      contact_id: contact.id,
      amount_monthly: '',
      stage: contact.stage,
      notes: '',
      expected_close: '',
    })
    setShowAdd(true)
  }

  const moveStage = async (id: string, stage: Stage) => {
    // Optimistic update
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, stage } : d))
    const res = await fetch(`/api/deals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (!res.ok) {
      showToast('Erreur lors du déplacement', false)
      fetchDeals()
    }
  }

  const addDeal = async () => {
    if (!newDeal.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: newDeal.title.trim(),
        contact_id: newDeal.contact_id || null,
        amount_monthly: newDeal.amount_monthly ? parseFloat(newDeal.amount_monthly) : null,
        stage: newDeal.stage,
        notes: newDeal.notes.trim() || null,
        expected_close: newDeal.expected_close || null,
        days_in_stage: 0,
      }
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Deal créé')
      setNewDeal(EMPTY_DEAL)
      setShowAdd(false)
      fetchDeals()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setSaving(false)
    }
  }

  const deleteDeal = async (id: string) => {
    if (!confirm('Supprimer ce deal ?')) return
    const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeals((prev) => prev.filter((d) => d.id !== id))
      showToast('Deal supprimé')
    } else {
      showToast('Erreur lors de la suppression', false)
    }
  }

  const fmtAmount = (amount: number | null | undefined) => {
    if (!amount) return 'Sur devis'
    return amount.toLocaleString('fr-FR') + ' €/mois'
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
        }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="topbar">
        <div className="page-title">Pipeline Entreprise</div>
        <GlobalSearch />
        <button className="btn btn-gold btn-sm" onClick={() => setShowAdd(true)}>+ Nouveau deal</button>
      </div>

      <div className="content">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement du pipeline…</div>
        ) : (
          <>
            {contactFilter && contactFilterObj && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', marginBottom: 16,
                background: 'var(--cobalt-lt)', border: '1px solid var(--cobalt)',
                borderRadius: 6, fontSize: 12,
              }}>
                <div>
                  Filtre actif : <b>{contactFilterObj.name}</b>
                  {contactFilterObj.company && ` — ${contactFilterObj.company}`}
                </div>
                <button
                  onClick={() => setContactFilter('')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--cobalt)', fontSize: 11, fontWeight: 600,
                  }}
                >✕ Retirer le filtre</button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 5 }}>
                  Valeur totale pipeline
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--navy)', letterSpacing: '-0.03em' }}>
                  {totalPipeline.toLocaleString('fr-FR')} €/mois
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {filteredDeals.filter((d) => d.stage !== 'perdu').length} deals actifs
              </div>
            </div>

            <div className="pipeline-cols">
              {STAGES.map((s) => (
                <div
                  key={s.key}
                  className="pipeline-col"
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const data = e.dataTransfer.getData('text/plain')
                    if (!data) return
                    const [kind, dragId] = data.split(':')
                    if (kind === 'deal' && deals.find((d) => d.id === dragId)?.stage !== s.key) {
                      moveStage(dragId, s.key)
                    } else if (kind === 'contact' && contacts.find((c) => c.id === dragId)?.stage !== s.key) {
                      moveContactStage(dragId, s.key)
                    }
                    setDraggedDeal(null)
                  }}
                  style={{
                    background: draggedDeal ? 'var(--stone)' : undefined,
                    transition: 'background 0.15s',
                  }}
                >
                  <div className="col-header">
                    <div className="col-title" style={{ color: s.color }}>{s.label}</div>
                    <div className="col-count">{totalByStage(s.key)}</div>
                  </div>
                  <div className={`col-bar ${s.bar}`} />

                  {/* Deals */}
                  {dealsByStage(s.key).map((d) => (
                    <div
                      key={d.id}
                      className="pipe-card"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', `deal:${d.id}`)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggedDeal(`deal:${d.id}`)
                      }}
                      onDragEnd={() => setDraggedDeal(null)}
                      style={{
                        cursor: 'grab',
                        opacity: draggedDeal === `deal:${d.id}` ? 0.4 : 1,
                        borderLeft: '3px solid var(--gold)',
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold-dk)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                        💼 Deal
                      </div>
                      <div className="pipe-card-name">{d.title}</div>
                      {d.contact ? (
                        <Link
                          href={`/contacts/${d.contact.id}`}
                          className="pipe-card-co"
                          style={{ color: 'var(--cobalt)', textDecoration: 'none', fontWeight: 500 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          👤 {d.contact.name}{d.contact.company ? ' — ' + d.contact.company : ''}
                        </Link>
                      ) : (
                        <div className="pipe-card-co" style={{ fontStyle: 'italic', color: 'var(--ink4)' }}>Sans contact</div>
                      )}
                      <div className="pipe-card-footer">
                        <div className="pipe-amount">{fmtAmount(d.amount_monthly)}</div>
                        <div className="pipe-days">J+{d.days_in_stage}</div>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => deleteDeal(d.id)}
                          style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 3, border: 'none',
                            background: 'var(--crimson-lt)', color: 'var(--crimson)', cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Contacts sans deal (cliquable + drag) */}
                  {contactsByStage(s.key).map((c) => (
                    <div
                      key={`contact-${c.id}`}
                      className="pipe-card"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', `contact:${c.id}`)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggedDeal(`contact:${c.id}`)
                      }}
                      onDragEnd={() => setDraggedDeal(null)}
                      style={{
                        cursor: 'grab',
                        opacity: draggedDeal === `contact:${c.id}` ? 0.4 : 1,
                        borderLeft: '3px solid var(--cobalt)',
                        background: 'var(--cobalt-lt)',
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--cobalt)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                        👤 Contact
                      </div>
                      <Link
                        href={`/contacts/${c.id}`}
                        className="pipe-card-name"
                        style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                      <div className="pipe-card-co" style={{ color: 'var(--ink3)' }}>
                        {c.company ?? c.email}
                      </div>
                      {c.estimated_value && (
                        <div className="pipe-card-footer">
                          <div className="pipe-amount">{c.estimated_value}</div>
                          <div className={`priority ${c.priority}`}>
                            <span /><span /><span />
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => promoteContactToDeal(c)}
                          style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 3, border: 'none',
                            background: 'var(--gold)', color: '#fff', cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          + Créer deal
                        </button>
                      </div>
                    </div>
                  ))}

                  {totalByStage(s.key) === 0 && (
                    <div style={{
                      padding: '20px 12px', fontSize: 11, color: 'var(--ink4)',
                      textAlign: 'center', fontStyle: 'italic',
                    }}>
                      Glissez un deal ou contact ici
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11, color: 'var(--ink3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: 'var(--gold)', borderRadius: 2 }} />
                💼 Deals ({filteredDeals.length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: 'var(--cobalt)', borderRadius: 2 }} />
                👤 Contacts sans deal ({filteredOrphanContacts.length})
              </div>
            </div>
          </>
        )}

        {/* Add deal modal */}
        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: 'var(--white)', borderRadius: 12, padding: 28, width: 460, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em' }}>Nouveau deal</div>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 18 }}>✕</button>
              </div>

              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">Titre du deal *</label>
                <input
                  className="form-input"
                  placeholder="ex: Abonnement Entreprise — AutoFleet"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">Contact lié</label>
                <select
                  className="form-input"
                  value={newDeal.contact_id}
                  onChange={(e) => setNewDeal((p) => ({ ...p, contact_id: e.target.value }))}
                >
                  <option value="">— Aucun contact —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-field">
                  <label className="form-label">Montant mensuel (€)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="1200"
                    value={newDeal.amount_monthly}
                    onChange={(e) => setNewDeal((p) => ({ ...p, amount_monthly: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Étape</label>
                  <select
                    className="form-input"
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal((p) => ({ ...p, stage: e.target.value as Stage }))}
                  >
                    {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-field">
                  <label className="form-label">Clôture prévue</label>
                  <input
                    className="form-input"
                    type="date"
                    value={newDeal.expected_close}
                    onChange={(e) => setNewDeal((p) => ({ ...p, expected_close: e.target.value }))}
                  />
                </div>
                <div className="form-field" />
              </div>

              <div className="form-field" style={{ marginBottom: 20 }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Informations complémentaires…"
                  value={newDeal.notes}
                  onChange={(e) => setNewDeal((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Annuler</button>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={addDeal}
                  disabled={saving || !newDeal.title.trim()}
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Création…' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement du pipeline…</div>}>
      <PipelineInner />
    </Suspense>
  )
}
