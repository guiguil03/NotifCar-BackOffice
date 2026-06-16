'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { CRMTask, CRMInvoice } from '@/lib/types'
import GlobalSearch from '@/components/GlobalSearch'

interface CalendarEvent {
  id: string
  type: 'task' | 'invoice_due'
  title: string
  date: string
  meta?: string
  priority?: string
  contact_id?: string | null
  link: string
  status?: string
}

const FRENCH_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const FRENCH_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [tasksRes, invoicesRes] = await Promise.all([
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/invoices').then((r) => r.json()),
    ])

    const evts: CalendarEvent[] = []

    if (Array.isArray(tasksRes)) {
      tasksRes.forEach((t: CRMTask) => {
        if (t.due_date) {
          evts.push({
            id: `task-${t.id}`,
            type: 'task',
            title: t.title,
            date: t.due_date.split('T')[0],
            meta: t.contact?.name,
            priority: t.priority,
            contact_id: t.contact?.id ?? null,
            link: '/tasks',
            status: t.status,
          })
        }
      })
    }

    if (Array.isArray(invoicesRes)) {
      invoicesRes.forEach((inv: CRMInvoice) => {
        if (inv.validity_date && (inv.status === 'sent' || inv.status === 'draft' || inv.status === 'overdue')) {
          evts.push({
            id: `inv-${inv.id}`,
            type: 'invoice_due',
            title: `${inv.type} ${inv.number}`,
            date: inv.validity_date,
            meta: `${inv.client_name} · ${inv.total_ttc.toLocaleString('fr-FR')} €`,
            link: `/invoices/${inv.id}/print`,
            status: inv.status,
          })
        }
      })
    }

    setEvents(evts)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = lastDay.getDate()

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const cells: { date: Date | null; isToday: boolean; events: CalendarEvent[] }[] = []
  const todayStr = new Date().toISOString().split('T')[0]

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1
    if (i < startOffset || dayNum > daysInMonth) {
      cells.push({ date: null, isToday: false, events: [] })
    } else {
      const date = new Date(year, month, dayNum)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      const dayEvents = events.filter((e) => e.date.startsWith(dateStr))
      cells.push({ date, isToday: dateStr === todayStr, events: dayEvents })
    }
  }

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1))
  const goToday = () => setCurrent(new Date())

  return (
    <>
      <div className="topbar">
        <div className="page-title">Calendrier</div>
        <GlobalSearch />
        <button className="btn btn-ghost btn-sm" onClick={goToday}>Aujourd&apos;hui</button>
      </div>

      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={prevMonth}
              style={{
                width: 32, height: 32, borderRadius: 6, border: '1px solid var(--stone2)',
                background: 'var(--white)', cursor: 'pointer', fontSize: 16,
              }}
            >‹</button>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', minWidth: 200, textAlign: 'center' }}>
              {FRENCH_MONTHS[month]} {year}
            </div>
            <button
              onClick={nextMonth}
              style={{
                width: 32, height: 32, borderRadius: 6, border: '1px solid var(--stone2)',
                background: 'var(--white)', cursor: 'pointer', fontSize: 16,
              }}
            >›</button>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--ink3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cobalt)' }} />
              Tâches
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--gold)' }} />
              Échéances factures
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--crimson)' }} />
              Urgent / Retard
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              background: 'var(--ivory)', borderBottom: '1px solid var(--stone2)',
            }}>
              {FRENCH_DAYS.map((d) => (
                <div key={d} style={{
                  padding: '10px 12px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)',
                }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map((cell, i) => (
                <div
                  key={i}
                  style={{
                    minHeight: 110, padding: 6,
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--stone)' : 'none',
                    borderBottom: i < cells.length - 7 ? '1px solid var(--stone)' : 'none',
                    background: cell.isToday ? 'var(--gold-lt)' : cell.date ? 'var(--white)' : 'var(--ivory)',
                    opacity: cell.date ? 1 : 0.4,
                  }}
                >
                  {cell.date && (
                    <>
                      <div style={{
                        fontSize: 13, fontWeight: cell.isToday ? 700 : 600,
                        color: cell.isToday ? 'var(--gold-dk)' : 'var(--ink2)',
                        marginBottom: 4, padding: '2px 4px',
                      }}>
                        {cell.date.getDate()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {cell.events.slice(0, 3).map((evt) => {
                          const isOverdue = evt.type === 'task' && evt.status === 'pending' && new Date(evt.date) < new Date(todayStr)
                          const color = isOverdue || evt.priority === 'urgente' ? 'var(--crimson)' :
                            evt.type === 'invoice_due' ? 'var(--gold)' : 'var(--cobalt)'
                          const bg = isOverdue || evt.priority === 'urgente' ? 'var(--crimson-lt)' :
                            evt.type === 'invoice_due' ? 'var(--gold-lt)' : 'var(--cobalt-lt)'
                          return (
                            <Link
                              key={evt.id}
                              href={evt.link}
                              style={{
                                display: 'block',
                                padding: '3px 6px', borderRadius: 3,
                                background: bg, color: color,
                                fontSize: 10, fontWeight: 600,
                                textDecoration: 'none',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                opacity: evt.status === 'done' ? 0.5 : 1,
                                textDecorationLine: evt.status === 'done' ? 'line-through' : 'none',
                              }}
                              title={`${evt.title}${evt.meta ? ' · ' + evt.meta : ''}`}
                            >
                              {evt.type === 'invoice_due' ? '💰 ' : isOverdue ? '⚠ ' : '✓ '}
                              {evt.title}
                            </Link>
                          )
                        })}
                        {cell.events.length > 3 && (
                          <div style={{ fontSize: 9, color: 'var(--ink4)', padding: '0 6px', fontWeight: 600 }}>
                            +{cell.events.length - 3} de plus
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
