import { AlertTriangle } from 'lucide-react'

export default function SignalizationsTable({ signalizations }: { signalizations: any[] }) {
  return (
    <div className="signalizations">
      <div className="page-title">
        <AlertTriangle size={20} color="#EF4444" />
        <h2>Gestion des Signalisations</h2>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Véhicule</th>
              <th>Signaleur</th>
              <th>Urgence</th>
              <th>Date</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {signalizations.length > 0 ? signalizations.map((s: any, index: number) => (
              <tr key={index}>
                <td style={{ fontWeight: 500 }}>{s.type || '—'}</td>
                <td>{s.vehiclePlate || '—'}</td>
                <td style={{ color: '#64748B', fontSize: '0.85rem' }}>{s.reporterEmail || 'Anonyme'}</td>
                <td>
                  <span className={`status ${s.urgency || 'normal'}`}>
                    {s.urgency === 'urgent' ? 'Urgent' : 'Normal'}
                  </span>
                </td>
                <td style={{ color: '#64748B', fontSize: '0.82rem' }}>
                  {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  <span className={`status ${s.status || 'pending'}`}>
                    {s.status === 'resolved' ? 'Résolu' : s.status === 'pending' ? 'En attente' : s.status || 'En attente'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8', padding: '60px', fontSize: '0.9rem' }}>
                  Aucune signalisation trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
