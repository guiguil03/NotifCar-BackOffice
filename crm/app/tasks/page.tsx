'use client'
import { useEffect, useState, useCallback } from 'react'
import { CRMTask, CRMContact } from '@/lib/types'

const PRIORITY_LABEL: Record<string, string> = {
  urgente: 'Urgente', normale: 'Normale', basse: 'Basse',
}
const PRIORITY_COLOR: Record<string, { bg: string; fg: string }> = {
  urgente: { bg: 'var(--crimson-lt)', fg: 'var(--crimson)' },
  normale: { bg: 'var(--cobalt-lt)', fg: 'var(--cobalt)' },
  basse: { bg: 'var(--stone)', fg: 'var(--ink3)' },
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(due: string | null | undefined): boolean {
  if (!due) return false
  return new Date(due) < new Date(new Date().toDateString())
}

interface Toast { msg: string; ok: boolean }

const EMPTY_TASK = {
  title: '',
  description: '',
  due_date: '',
  priority: 'normale' as CRMTask['priority'],
  contact_id: '',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<CRMTask[]>([])
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done' | 'overdue'>('pending')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_TASK)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const fetchContacts = useCallback(async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { fetchTasks(); fetchContacts() }, [fetchTasks, fetchContacts])

  const toggleDone = async (task: CRMTask) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      showToast('Erreur', false)
      fetchTasks()
    }
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id))
      showToast('Tâche supprimée')
    }
  }

  const addTask = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        priority: form.priority,
        contact_id: form.contact_id || null,
      }
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Tâche créée')
      setForm(EMPTY_TASK)
      setShowAdd(false)
      fetchTasks()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setSaving(false)
    }
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'done') return t.status === 'done'
    if (filter === 'overdue') return t.status === 'pending' && isOverdue(t.due_date)
    return true
  })

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    done: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter((t) => t.status === 'pending' && isOverdue(t.due_date)).length,
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
        <div className="page-title">Tâches & Relances</div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-gold btn-sm" onClick={() => setShowAdd(true)}>+ Nouvelle tâche</button>
      </div>

      <div className="content">
        <div className="tabs" style={{ marginBottom: 20 }}>
          {([
            { k: 'pending', label: `À faire (${counts.pending})` },
            { k: 'overdue', label: `En retard (${counts.overdue})` },
            { k: 'done', label: `Terminées (${counts.done})` },
            { k: 'all', label: `Toutes (${counts.all})` },
          ] as const).map((f) => (
            <div
              key={f.k}
              className={`tab${filter === f.k ? ' active' : ''}`}
              onClick={() => setFilter(f.k)}
            >
              {f.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>
                {filter === 'pending' && 'Aucune tâche en cours — créez-en une nouvelle'}
                {filter === 'overdue' && 'Aucune tâche en retard 🎉'}
                {filter === 'done' && 'Aucune tâche terminée'}
                {filter === 'all' && 'Aucune tâche'}
              </div>
            ) : (
              <div>
                {filtered.map((t, i) => {
                  const overdue = t.status === 'pending' && isOverdue(t.due_date)
                  const priColor = PRIORITY_COLOR[t.priority]
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px',
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--stone)' : 'none',
                        background: t.status === 'done' ? 'var(--ivory)' : 'transparent',
                        opacity: t.status === 'done' ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={t.status === 'done'}
                        onChange={() => toggleDone(t)}
                        style={{ accentColor: 'var(--navy)', width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          textDecoration: t.status === 'done' ? 'line-through' : 'none',
                          color: t.status === 'done' ? 'var(--ink4)' : 'var(--ink)',
                        }}>
                          {t.title}
                        </div>
                        {t.description && (
                          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                            {t.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                          {t.due_date && (
                            <span style={{
                              fontSize: 11,
                              color: overdue ? 'var(--crimson)' : 'var(--ink4)',
                              fontWeight: overdue ? 700 : 500,
                            }}>
                              {overdue ? '⚠ Retard : ' : '📅 '}
                              {fmtDate(t.due_date)}
                            </span>
                          )}
                          {t.contact && (
                            <a
                              href={`/contacts/${t.contact.id}`}
                              style={{ fontSize: 11, color: 'var(--cobalt)', fontWeight: 600, textDecoration: 'none' }}
                            >
                              👤 {t.contact.name}{t.contact.company ? ` — ${t.contact.company}` : ''}
                            </a>
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 3,
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: priColor.bg, color: priColor.fg, flexShrink: 0,
                      }}>
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 3, border: 'none',
                          background: 'transparent', color: 'var(--ink4)', cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--white)', borderRadius: 12, padding: 32, width: 480,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em' }}>
                Nouvelle tâche
              </div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)', fontSize: 18 }}>✕</button>
            </div>

            <div className="form-field" style={{ marginBottom: 12 }}>
              <label className="form-label">Titre *</label>
              <input
                className="form-input"
                placeholder="ex: Relancer AutoFleet par téléphone"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="form-field" style={{ marginBottom: 12 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Détails…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-field">
                <label className="form-label">Échéance</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Priorité</label>
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as CRMTask['priority'] }))}
                >
                  <option value="urgente">Urgente</option>
                  <option value="normale">Normale</option>
                  <option value="basse">Basse</option>
                </select>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 20 }}>
              <label className="form-label">Contact lié</label>
              <select
                className="form-input"
                value={form.contact_id}
                onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))}
              >
                <option value="">— Aucun contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Annuler</button>
              <button
                className="btn btn-gold btn-sm"
                onClick={addTask}
                disabled={saving || !form.title.trim()}
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
