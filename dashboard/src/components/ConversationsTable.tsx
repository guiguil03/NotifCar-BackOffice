import { CheckCircle, Clock, MessageSquare, XCircle } from 'lucide-react'
import React from 'react'

interface Conversation {
  id: string
  vehicle_id: string | null
  reporter_id: string | null
  owner_id: string | null
  status: 'active' | 'resolved' | 'archived' | string
  created_at: string
  vehicle_name?: string
  reporter_name?: string
  owner_name?: string
}

interface ConversationsTableProps {
  conversations: Conversation[]
}

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = {
    active:   { label: 'Active',    bg: 'rgba(40,90,255,0.08)',   color: '#285AFF', icon: <MessageSquare size={11} /> },
    resolved: { label: 'Résolue',   bg: 'rgba(16,185,129,0.08)',  color: '#10B981', icon: <CheckCircle size={11} /> },
    archived: { label: 'Archivée',  bg: 'rgba(100,116,139,0.08)', color: '#64748B', icon: <XCircle size={11} /> },
  }[status] ?? { label: status, bg: 'rgba(148,163,184,0.1)', color: '#94A3B8', icon: <Clock size={11} /> }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, fontSize: '0.73rem', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

const ConversationsTable: React.FC<ConversationsTableProps> = ({ conversations }) => {
  const active   = conversations.filter(c => c.status === 'active').length
  const resolved = conversations.filter(c => c.status === 'resolved').length
  const archived = conversations.filter(c => c.status === 'archived').length

  return (
    <div className="conversations">
      <div className="page-title">
        <MessageSquare size={20} color="#285AFF" />
        <h2>Gestion des Conversations</h2>
      </div>

      {/* Stats rapides */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: conversations.length, color: '#64748B' },
          { label: 'Actives', value: active, color: '#285AFF' },
          { label: 'Résolues', value: resolved, color: '#10B981' },
          { label: 'Archivées', value: archived, color: '#94A3B8' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="table-container">
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8', fontSize: '0.9rem' }}>Aucune conversation trouvée</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Signaleur</th>
                <th>Propriétaire</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map(c => (
                <tr key={c.id}>
                  <td>{c.vehicle_name || '—'}</td>
                  <td>{c.reporter_name || '—'}</td>
                  <td>{c.owner_name || '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ color: '#64748B', fontSize: '0.82rem' }}>
                    {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ConversationsTable
