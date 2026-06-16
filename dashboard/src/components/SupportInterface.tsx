import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type SupportTicket = {
  id: string
  user_id: string
  user_email?: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
}

export default function SupportInterface() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyMessage, setReplyMessage] = useState('')

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      // Pour l'instant, on simule avec les conversations comme tickets de support
      // Dans une vraie implémentation, il faudrait une table support_tickets
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Récupérer les emails des utilisateurs
      const ticketsWithEmails: SupportTicket[] = await Promise.all(
        (conversations || []).map(async (conv: any) => {
          let userEmail = 'Inconnu'
          if (conv.owner_id) {
            try {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', conv.owner_id)
                .single()
              if (profile) userEmail = profile.email || 'Inconnu'
            } catch {}
          }

          return {
            id: conv.id,
            user_id: conv.owner_id || conv.reporter_id || '',
            user_email: userEmail,
            subject: `Conversation ${conv.status}`,
            message: `Conversation ID: ${conv.id}`,
            status: conv.status === 'active' ? 'open' : conv.status === 'resolved' ? 'resolved' : 'closed' as any,
            priority: 'medium' as any,
            created_at: conv.created_at,
            updated_at: conv.updated_at || conv.created_at
          }
        })
      )

      setTickets(ticketsWithEmails)
    } catch (error) {
      console.error('Erreur chargement tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      // Mettre à jour la conversation correspondante
      await supabase
        .from('conversations')
        .update({ 
          status: newStatus === 'resolved' ? 'resolved' : newStatus === 'closed' ? 'archived' : 'active'
        })
        .eq('id', ticketId)

      await loadTickets()
      alert('Statut mis à jour avec succès')
    } catch (error: any) {
      alert('Erreur: ' + (error.message || 'Impossible de mettre à jour le statut'))
    }
  }

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filter)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444'
      case 'high': return '#F59E0B'
      case 'medium': return '#3B82F6'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#F59E0B'
      case 'in_progress': return '#3B82F6'
      case 'resolved': return '#10B981'
      case 'closed': return '#6B7280'
      default: return '#6B7280'
    }
  }

  return (
    <div className="support-interface">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>💬 Interface Support Client</h2>
        <button onClick={loadTickets} style={{ padding: '8px 16px', backgroundColor: '#285AFF', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          🔄 Actualiser
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'all' ? '#2633E1' : 'white', color: filter === 'all' ? 'white' : '#374151' }}
        >
          Tous ({tickets.length})
        </button>
        <button 
          onClick={() => setFilter('open')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'open' ? '#2633E1' : 'white', color: filter === 'open' ? 'white' : '#374151' }}
        >
          Ouverts ({tickets.filter(t => t.status === 'open').length})
        </button>
        <button 
          onClick={() => setFilter('in_progress')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'in_progress' ? '#2633E1' : 'white', color: filter === 'in_progress' ? 'white' : '#374151' }}
        >
          En cours ({tickets.filter(t => t.status === 'in_progress').length})
        </button>
        <button 
          onClick={() => setFilter('resolved')}
          style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', backgroundColor: filter === 'resolved' ? '#2633E1' : 'white', color: filter === 'resolved' ? 'white' : '#374151' }}
        >
          Résolus ({tickets.filter(t => t.status === 'resolved').length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Chargement...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 400px' : '1fr', gap: '20px' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Sujet</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    style={{ cursor: 'pointer', backgroundColor: selectedTicket?.id === ticket.id ? '#F3F4F6' : 'white' }}
                  >
                    <td>{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>{ticket.user_email || ticket.user_id.substring(0, 8) + '...'}</td>
                    <td>{ticket.subject}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        backgroundColor: getPriorityColor(ticket.priority) + '20',
                        color: getPriorityColor(ticket.priority)
                      }}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        backgroundColor: getStatusColor(ticket.status) + '20',
                        color: getStatusColor(ticket.status)
                      }}>
                        {ticket.status === 'open' ? 'Ouvert' : 
                         ticket.status === 'in_progress' ? 'En cours' :
                         ticket.status === 'resolved' ? 'Résolu' : 'Fermé'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {ticket.status === 'open' && (
                          <button 
                            onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}
                            style={{ padding: '4px 8px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Prendre en charge
                          </button>
                        )}
                        {ticket.status === 'in_progress' && (
                          <button 
                            onClick={() => handleUpdateStatus(ticket.id, 'resolved')}
                            style={{ padding: '4px 8px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Résoudre
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                      Aucun ticket trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedTicket && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <h3 style={{ marginTop: 0 }}>Détails du ticket</h3>
              <div style={{ marginBottom: '16px' }}>
                <strong>Utilisateur:</strong> {selectedTicket.user_email || selectedTicket.user_id}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Sujet:</strong> {selectedTicket.subject}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Message:</strong>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px', marginTop: '8px' }}>
                  {selectedTicket.message}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Date:</strong> {new Date(selectedTicket.created_at).toLocaleString('fr-FR')}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Réponse:</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  style={{ width: '100%', minHeight: '100px', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                  placeholder="Tapez votre réponse..."
                />
              </div>
              <button 
                onClick={() => {
                  alert('Fonctionnalité de réponse à implémenter (envoi email)')
                  setReplyMessage('')
                }}
                style={{ width: '100%', padding: '10px', backgroundColor: '#285AFF', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Envoyer la réponse
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

