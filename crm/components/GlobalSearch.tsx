'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CRMContact, CRMDeal, CRMInvoice } from '@/lib/types'

interface SearchResults {
  contacts: CRMContact[]
  deals: CRMDeal[]
  invoices: CRMInvoice[]
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<SearchResults>({ contacts: [], deals: [], invoices: [] })
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loaded && query.length > 0) {
      Promise.all([
        fetch('/api/contacts').then((r) => r.json()),
        fetch('/api/deals').then((r) => r.json()),
        fetch('/api/invoices').then((r) => r.json()),
      ]).then(([contacts, deals, invoices]) => {
        setData({
          contacts: Array.isArray(contacts) ? contacts : [],
          deals: Array.isArray(deals) ? deals : [],
          invoices: Array.isArray(invoices) ? invoices : [],
        })
        setLoaded(true)
      })
    }
  }, [query, loaded])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const q = query.toLowerCase().trim()
  const matches: SearchResults = q.length < 2 ? { contacts: [], deals: [], invoices: [] } : {
    contacts: data.contacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q)
    ).slice(0, 5),
    deals: data.deals.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      (d.contact?.name ?? '').toLowerCase().includes(q) ||
      (d.contact?.company ?? '').toLowerCase().includes(q)
    ).slice(0, 5),
    invoices: data.invoices.filter((inv) =>
      inv.number.toLowerCase().includes(q) ||
      inv.client_name.toLowerCase().includes(q) ||
      (inv.reference ?? '').toLowerCase().includes(q)
    ).slice(0, 5),
  }

  const total = matches.contacts.length + matches.deals.length + matches.invoices.length

  const go = (path: string) => {
    setOpen(false)
    setQuery('')
    router.push(path)
  }

  return (
    <div ref={containerRef} className="search-wrap" style={{ position: 'relative' }}>
      <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        className="search-bar"
        placeholder="Rechercher contact, deal, facture…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && q.length >= 2 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--white)', border: '1px solid var(--stone2)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 60,
          maxHeight: 480, overflowY: 'auto',
        }}>
          {total === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
              Aucun résultat
            </div>
          ) : (
            <>
              {matches.contacts.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)', background: 'var(--ivory)' }}>
                    Contacts ({matches.contacts.length})
                  </div>
                  {matches.contacts.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => go(`/contacts/${c.id}`)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--stone)', fontSize: 13 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ivory)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                        {c.email}{c.company ? ` · ${c.company}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {matches.deals.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)', background: 'var(--ivory)' }}>
                    Deals ({matches.deals.length})
                  </div>
                  {matches.deals.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => go('/pipeline')}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--stone)', fontSize: 13 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ivory)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600 }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                        {d.contact ? `${d.contact.name}${d.contact.company ? ' · ' + d.contact.company : ''}` : 'Sans contact'}
                        {d.amount_monthly ? ` · ${d.amount_monthly.toLocaleString('fr-FR')} €/mois` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {matches.invoices.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink4)', background: 'var(--ivory)' }}>
                    Factures / Devis ({matches.invoices.length})
                  </div>
                  {matches.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => go('/invoices')}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ivory)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600 }}>{inv.number} — {inv.client_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                        {inv.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € · {inv.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
