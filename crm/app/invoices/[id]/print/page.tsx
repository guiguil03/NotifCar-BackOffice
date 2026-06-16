'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CRMInvoice, CRMSettings } from '@/lib/types'

function fmt(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtE(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function InvoicePrintPage() {
  const params = useParams()
  const id = params.id as string
  const [invoice, setInvoice] = useState<CRMInvoice | null>(null)
  const [settings, setSettings] = useState<CRMSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([inv, set]) => {
      setInvoice(inv)
      setSettings(set)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'system-ui' }}>Chargement…</div>
  }

  if (!invoice || !settings) {
    return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'system-ui' }}>Document introuvable</div>
  }

  const totalHT = invoice.total_ht
  const tva = invoice.total_tva
  const ttc = invoice.total_ttc
  const tvaRate = settings.tva_rate ?? 20

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 14mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-doc { box-shadow: none !important; border: none !important; }
        }
        body { background: #f3f4f6; }
        .print-doc { background: white; max-width: 21cm; margin: 24px auto; padding: 36px 42px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border-radius: 4px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1c2532; }
      `}</style>

      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '12px 24px', background: '#0f1c2e', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'system-ui',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {invoice.type} {invoice.number} — Aperçu impression
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)',
              background: 'transparent', color: 'white', cursor: 'pointer', fontSize: 13,
            }}
          >← Retour</button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none',
              background: '#c8912a', color: 'white', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >🖨️ Imprimer / Enregistrer PDF</button>
        </div>
      </div>

      <div className="print-doc">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 36 }}>{settings.logo_emoji}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{settings.company_name}</div>
              {settings.company_website && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{settings.company_website}</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              {invoice.type}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>{invoice.number}</div>
            <div style={{
              display: 'inline-block', marginTop: 8, padding: '4px 10px',
              borderRadius: 4, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: invoice.status === 'paid' ? '#d1fae5' :
                invoice.status === 'overdue' ? '#fee2e2' :
                  invoice.status === 'sent' ? '#dbeafe' : '#f3f4f6',
              color: invoice.status === 'paid' ? '#047857' :
                invoice.status === 'overdue' ? '#dc2626' :
                  invoice.status === 'sent' ? '#1d4ed8' : '#6b7280',
            }}>
              {invoice.status === 'paid' ? 'Payée' :
                invoice.status === 'overdue' ? 'En retard' :
                  invoice.status === 'sent' ? 'Envoyée' :
                    invoice.status === 'draft' ? 'Brouillon' : 'Annulée'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 6 }}>Émetteur</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{settings.company_name}</div>
            <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>
              {settings.company_address && <div>{settings.company_address}</div>}
              {(settings.company_zip || settings.company_city) && (
                <div>{settings.company_zip} {settings.company_city}</div>
              )}
              {settings.company_country && <div>{settings.company_country}</div>}
              {settings.company_email && <div>{settings.company_email}</div>}
              {settings.company_phone && <div>{settings.company_phone}</div>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 6 }}>Destinataire</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{invoice.client_name}</div>
            {invoice.client_email && (
              <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>{invoice.client_email}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 28, padding: '12px 16px', background: '#f9fafb', borderRadius: 6 }}>
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Date d&apos;émission</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{fmt(invoice.emission_date)}</div>
          </div>
          {invoice.validity_date && (
            <div>
              <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                {invoice.type === 'DEVIS' ? 'Validité' : 'Échéance'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{fmt(invoice.validity_date)}</div>
            </div>
          )}
          {invoice.reference && (
            <div>
              <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Référence</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{invoice.reference}</div>
            </div>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#0f1c2e', color: 'white' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>Qté</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>P.U. HT</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines ?? []).map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>{l.description}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right' }}>{l.quantity}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right' }}>{fmtE(l.unit_price)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>
                  {fmtE(l.quantity * l.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>Sous-total HT</span>
              <span style={{ fontWeight: 600 }}>{fmtE(totalHT)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>TVA {tvaRate}%</span>
              <span style={{ fontWeight: 600 }}>{fmtE(tva)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 0',
              borderTop: '2px solid #0f1c2e', marginTop: 6,
              fontSize: 16, fontWeight: 700,
            }}>
              <span>Total TTC</span>
              <span>{fmtE(ttc)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div style={{ padding: '12px 16px', background: '#f9fafb', borderLeft: '3px solid #c8912a', marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 4 }}>Notes & conditions</div>
            <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{invoice.notes}</div>
          </div>
        )}

        {(settings.iban || settings.bic) && invoice.type === 'FACTURE' && (
          <div style={{ padding: '12px 16px', background: '#f9fafb', marginBottom: 20, borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 6 }}>Coordonnées bancaires</div>
            {settings.iban && <div style={{ fontSize: 11, fontFamily: 'monospace' }}>IBAN : {settings.iban}</div>}
            {settings.bic && <div style={{ fontSize: 11, fontFamily: 'monospace' }}>BIC : {settings.bic}</div>}
          </div>
        )}

        <div style={{
          paddingTop: 16, marginTop: 24, borderTop: '1px solid #e5e7eb',
          fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5,
        }}>
          {settings.company_name}
          {settings.siret && ` — SIRET : ${settings.siret}`}
          {settings.tva_number && ` — TVA : ${settings.tva_number}`}
          {settings.invoice_footer && (
            <div style={{ marginTop: 8 }}>{settings.invoice_footer}</div>
          )}
        </div>
      </div>
    </>
  )
}
