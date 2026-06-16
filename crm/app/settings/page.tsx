'use client'
import { useEffect, useState } from 'react'
import { CRMSettings } from '@/lib/types'

interface Toast { msg: string; ok: boolean }

const EMPTY: CRMSettings = {
  id: 1,
  company_name: '',
  company_address: '',
  company_zip: '',
  company_city: '',
  company_country: 'France',
  company_email: '',
  company_phone: '',
  company_website: '',
  siret: '',
  tva_number: '',
  tva_rate: 20,
  iban: '',
  bic: '',
  invoice_footer: '',
  logo_emoji: '🚗',
  created_at: '',
  updated_at: '',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CRMSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => { setSettings({ ...EMPTY, ...data }); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const update = <K extends keyof CRMSettings>(field: K, value: CRMSettings[K]) =>
    setSettings((p) => ({ ...p, [field]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('Paramètres enregistrés')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', false)
    } finally {
      setSaving(false)
    }
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
        <div className="page-title">Paramètres entreprise</div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-gold btn-sm" onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <div className="content">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink4)' }}>Chargement…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <div className="card">
              <div className="card-title">Informations société</div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">Nom de la société *</label>
                <input className="form-input" value={settings.company_name} onChange={(e) => update('company_name', e.target.value)} />
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">Adresse</label>
                <input className="form-input" placeholder="123 rue de l'Innovation" value={settings.company_address} onChange={(e) => update('company_address', e.target.value)} />
              </div>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-field">
                  <label className="form-label">Code postal</label>
                  <input className="form-input" value={settings.company_zip} onChange={(e) => update('company_zip', e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Ville</label>
                  <input className="form-input" value={settings.company_city} onChange={(e) => update('company_city', e.target.value)} />
                </div>
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">Pays</label>
                <input className="form-input" value={settings.company_country} onChange={(e) => update('company_country', e.target.value)} />
              </div>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-field">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={settings.company_email} onChange={(e) => update('company_email', e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" value={settings.company_phone} onChange={(e) => update('company_phone', e.target.value)} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Site web</label>
                <input className="form-input" placeholder="notifcar.app" value={settings.company_website} onChange={(e) => update('company_website', e.target.value)} />
              </div>
            </div>

            <div className="card">
              <div className="card-title">Identification fiscale</div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">SIRET</label>
                <input className="form-input" placeholder="000 000 000 00000" value={settings.siret} onChange={(e) => update('siret', e.target.value)} />
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">N° TVA intracommunautaire</label>
                <input className="form-input" placeholder="FR00000000000" value={settings.tva_number} onChange={(e) => update('tva_number', e.target.value)} />
              </div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">Taux de TVA (%)</label>
                <input className="form-input" type="number" step="0.1" value={settings.tva_rate} onChange={(e) => update('tva_rate', parseFloat(e.target.value) || 0)} />
              </div>

              <div className="card-title" style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--stone2)' }}>Coordonnées bancaires</div>
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label">IBAN</label>
                <input className="form-input" placeholder="FR76 0000 0000 0000 0000 0000 000" value={settings.iban} onChange={(e) => update('iban', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">BIC</label>
                <input className="form-input" placeholder="BNPAFRPPXXX" value={settings.bic} onChange={(e) => update('bic', e.target.value)} />
              </div>
            </div>

            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-title">Apparence facture</div>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-field" style={{ maxWidth: 120 }}>
                  <label className="form-label">Logo emoji</label>
                  <input className="form-input" maxLength={4} style={{ fontSize: 22, textAlign: 'center' }} value={settings.logo_emoji} onChange={(e) => update('logo_emoji', e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Pied de page facture</label>
                  <textarea className="form-input" rows={2} value={settings.invoice_footer} onChange={(e) => update('invoice_footer', e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
