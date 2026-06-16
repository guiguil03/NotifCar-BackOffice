import { useEffect, useState } from 'react'
import { AdminService } from '../services/adminService'
import { supabase } from '../lib/supabase'

type AbuseReport = {
  id: string
  vehicle_id?: string
  signalization_id?: string
  reporter_id?: string
  reported_by_user_id?: string
  reason: string
  description?: string
  status: string
  severity: string
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
}

export default function ModerationTool() {
  const [reports, setReports] = useState<AbuseReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('all')
  const [currentUser, setCurrentUser] = useState<string>('')

  useEffect(() => {
    loadReports()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setCurrentUser(data.session.user.id)
      }
    })
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const data = await AdminService.getAbuseReports()
      setReports(data)
    } catch (error) {
      console.error('Erreur chargement signalements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    if (!currentUser) {
      alert('Erreur: Utilisateur non identifié')
      return
    }

    try {
      await AdminService.updateAbuseReportStatus(reportId, newStatus, currentUser)
      await loadReports()
      alert(`Signalement ${newStatus === 'resolved' ? 'résolu' : newStatus === 'dismissed' ? 'rejeté' : 'révisé'} avec succès`)
    } catch (error: any) {
      alert('Erreur: ' + (error.message || 'Impossible de mettre à jour le statut'))
    }
  }

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return '#10B981'
      case 'dismissed': return '#6B7280'
      case 'reviewed': return '#3B82F6'
      case 'pending': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  return (
    <div className="moderation-tool">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🛡️ Outil de Modération</h2>
        <button onClick={loadReports} style={{ padding: '8px 16px', backgroundColor: '#285AFF', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          🔄 Actualiser
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'all' ? '#2633E1' : 'white', color: filter === 'all' ? 'white' : '#374151' }}
        >
          Tous ({reports.length})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'pending' ? '#2633E1' : 'white', color: filter === 'pending' ? 'white' : '#374151' }}
        >
          En attente ({reports.filter(r => r.status === 'pending').length})
        </button>
        <button 
          onClick={() => setFilter('reviewed')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'reviewed' ? '#2633E1' : 'white', color: filter === 'reviewed' ? 'white' : '#374151' }}
        >
          Révisés ({reports.filter(r => r.status === 'reviewed').length})
        </button>
        <button 
          onClick={() => setFilter('resolved')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'resolved' ? '#2633E1' : 'white', color: filter === 'resolved' ? 'white' : '#374151' }}
        >
          Résolus ({reports.filter(r => r.status === 'resolved').length})
        </button>
        <button 
          onClick={() => setFilter('dismissed')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'dismissed' ? '#2633E1' : 'white', color: filter === 'dismissed' ? 'white' : '#374151' }}
        >
          Rejetés ({reports.filter(r => r.status === 'dismissed').length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Chargement...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Raison</th>
                <th>Description</th>
                <th>Sévérité</th>
                <th>Statut</th>
                <th>Signalé par</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>{new Date(report.created_at).toLocaleString('fr-FR')}</td>
                  <td>{report.reason}</td>
                  <td style={{ maxWidth: '300px', wordBreak: 'break-word' }}>
                    {report.description || 'Aucune description'}
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      backgroundColor: getSeverityColor(report.severity) + '20',
                      color: getSeverityColor(report.severity),
                      fontWeight: '600'
                    }}>
                      {report.severity}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      backgroundColor: getStatusColor(report.status) + '20',
                      color: getStatusColor(report.status)
                    }}>
                      {report.status === 'pending' ? 'En attente' : 
                       report.status === 'reviewed' ? 'Révisé' :
                       report.status === 'resolved' ? 'Résolu' : 'Rejeté'}
                    </span>
                  </td>
                  <td>{report.reported_by_user_id ? report.reported_by_user_id.substring(0, 8) + '...' : 'Anonyme'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {report.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                            style={{ padding: '4px 8px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Réviser
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'resolved')}
                            style={{ padding: '4px 8px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Résoudre
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                            style={{ padding: '4px 8px', backgroundColor: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      {report.status === 'reviewed' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'resolved')}
                            style={{ padding: '4px 8px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Résoudre
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                            style={{ padding: '4px 8px', backgroundColor: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                    Aucun signalement trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

