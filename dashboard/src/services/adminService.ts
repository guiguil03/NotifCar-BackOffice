import { supabase } from '../lib/supabase';

// Types définis localement
type Vehicle = {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  color?: string;
  notes?: string;
  owner_id: string;
  qr_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type User = {
  id: string;
  email: string;
  created_at: string;
  email_verified: boolean;
}

export class AdminService {
  // Récupérer toutes les statistiques du dashboard
  static async getDashboardStats() {
    try {
      const [
        vehiclesResult, 
        usersResult, 
        conversationsResult, 
        messagesResult
      ] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('user_profiles').select('*'),
        supabase.from('conversations').select('*'),
        supabase.from('messages').select('*')
      ])

      // Requêtes optionnelles avec gestion d'erreur (ne stocke que les compteurs)
      let totalSignalizations = 0
      let totalNotificationTokens = 0
      let totalQRCodes = 0

      try {
        const { data } = await supabase.from('signalizations').select('id')
        totalSignalizations = data?.length || 0
      } catch (error) {
        console.log('Table signalizations non trouvée')
      }

      try {
        const { data } = await supabase.from('notification_tokens').select('id')
        totalNotificationTokens = data?.length || 0
      } catch (error) {
        console.log('Table notification_tokens non trouvée')
      }

      try {
        const { data } = await supabase.from('qr_codes').select('id')
        totalQRCodes = data?.length || 0
      } catch (error) {
        console.log('Table qr_codes non trouvée')
      }

      // Calculer les statistiques avancées
      const today = new Date()
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const newVehiclesThisWeek = vehiclesResult.data?.filter(v => 
        new Date(v.created_at) > lastWeek
      ).length || 0

      const newUsersThisMonth = usersResult.data?.filter(u => 
        new Date(u.created_at) > lastMonth
      ).length || 0

      const activeConversations = conversationsResult.data?.filter(c => c.status === 'active').length || 0
      const resolvedConversations = conversationsResult.data?.filter(c => c.status === 'resolved').length || 0

      const conversationsCount = conversationsResult.data?.length ?? 0
      return {
        totalVehicles: vehiclesResult.data?.length || 0,
        totalUsers: usersResult.data?.length || 0,
        totalConversations: conversationsCount,
        totalMessages: messagesResult.data?.length || 0,
        totalSignalizations: totalSignalizations,
        totalNotificationTokens: totalNotificationTokens,
        totalQRCodes: totalQRCodes,
        activeConversations,
        resolvedConversations,
        newVehiclesThisWeek,
        newUsersThisMonth,
        avgMessagesPerConversation: conversationsCount > 0 
          ? Math.round((messagesResult.data?.length || 0) / conversationsCount) 
          : 0
      }
    } catch (error) {
      console.error('Erreur récupération stats:', error)
      throw error
    }
  }

  // Récupérer tous les véhicules
  static async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur récupération véhicules:', error)
      throw error
    }
  }

  // Récupérer tous les utilisateurs
  static async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error)
      throw error
    }
  }

  // Récupérer toutes les conversations (sans jointures pour compatibilité schéma)
  static async getAllConversations() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur récupération conversations:', error)
      return []
    }
  }

  // Récupérer les conversations enrichies avec emails utilisateurs et plaque
  static async getAllConversationsWithNames() {
    try {
      const conversations = await this.getAllConversations()
      if (!conversations || conversations.length === 0) return []

      // Collecter les IDs uniques
      const userIds = Array.from(new Set(
        conversations.flatMap((c: any) => [c.reporter_id, c.owner_id]).filter(Boolean)
      )) as string[]

      const vehicleIds = Array.from(new Set(
        conversations.map((c: any) => c.vehicle_id).filter(Boolean)
      )) as string[]

      // Récupérer profils — reporter_id/owner_id sont des auth UUIDs → jointure sur user_id
      const [usersRes, vehiclesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('user_profiles').select('user_id,email,first_name,last_name').in('user_id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        vehicleIds.length > 0
          ? supabase.from('vehicles').select('id,license_plate,brand,model').in('id', vehicleIds)
          : Promise.resolve({ data: [] as any[] })
      ])

      const users = (usersRes as any).data || []
      const vehicles = (vehiclesRes as any).data || []

      const userById = new Map<string, string>()
      users.forEach((u: any) => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
        userById.set(u.user_id, name)
      })

      const vehicleById = new Map<string, string>()
      vehicles.forEach((v: any) => vehicleById.set(v.id, v.license_plate || `${v.brand} ${v.model}`))

      // Mapper conversations enrichies
      return conversations.map((c: any) => ({
        ...c,
        reporter_name: c.reporter_id ? (userById.get(c.reporter_id) || null) : null,
        owner_name: c.owner_id ? (userById.get(c.owner_id) || null) : null,
        vehicle_name: c.vehicle_id ? (vehicleById.get(c.vehicle_id) || null) : null,
      }))
    } catch (error) {
      console.error('Erreur enrichissement conversations:', error)
      return []
    }
  }

  // Récupérer les messages d'une conversation
  static async getConversationMessages(conversationId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur récupération messages:', error)
      throw error
    }
  }

  // Supprimer un véhicule
  static async deleteVehicle(vehicleId: string) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur suppression véhicule:', error)
      throw error
    }
  }

  // Désactiver/Activer un véhicule
  static async toggleVehicleStatus(vehicleId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: isActive })
        .eq('id', vehicleId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur mise à jour statut véhicule:', error)
      throw error
    }
  }

  // Archiver une conversation
  static async archiveConversation(conversationId: string) {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'archived' })
        .eq('id', conversationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur archivage conversation:', error)
      throw error
    }
  }

  // Récupérer les signalisations (liste simple, on joindra côté UI si besoin)
  static async getSignalizations() {
    try {
      const { data, error } = await supabase
        .from('signalizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur récupération signalisations:', error)
      return []
    }
  }

  // Signalisations enrichies: emails et plaque
  static async getSignalizationsWithNames() {
    try {
      const signals = await this.getSignalizations()
      if (!signals || signals.length === 0) return []

      const userIds = Array.from(new Set(
        signals.map((s: any) => s.reporter_id).filter(Boolean)
      )) as string[]

      const vehicleIds = Array.from(new Set(
        signals.map((s: any) => s.vehicle_id).filter(Boolean)
      )) as string[]

      let users: any[] = []
      let vehicles: any[] = []
      try {
        if (userIds.length > 0) {
          // reporter_id est un auth UUID → jointure sur user_id
          const { data } = await supabase.from('user_profiles').select('user_id,email,first_name,last_name').in('user_id', userIds)
          users = data || []
        }
      } catch (e) {
        console.warn('Lecture user_profiles refusée par RLS')
      }
      try {
        if (vehicleIds.length > 0) {
          const { data } = await supabase.from('vehicles').select('id,license_plate,brand,model').in('id', vehicleIds)
          vehicles = data || []
        }
      } catch (e) {
        console.warn('Lecture vehicles refusée par RLS')
      }

      const userById = new Map<string, string>()
      users.forEach((u: any) => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
        userById.set(u.user_id, name)
      })

      const vehicleById = new Map<string, string>()
      vehicles.forEach((v: any) => vehicleById.set(v.id, v.license_plate || `${v.brand} ${v.model}`))

      return signals.map((s: any) => ({
        ...s,
        reporterEmail: s.reporter_id ? (userById.get(s.reporter_id) || null) : null,
        vehiclePlate: s.vehicle_id ? (vehicleById.get(s.vehicle_id) || null) : null,
      }))
    } catch (error) {
      console.error('Erreur enrichissement signalisations:', error)
      return []
    }
  }

  // Récupérer les tokens de notification
  static async getNotificationTokens() {
    try {
      const { data, error } = await supabase
        .from('notification_tokens')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur récupération tokens:', error)
      return []
    }
  }

  // Récupérer les statistiques par période
  static async getPeriodStats(days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      
      const [vehiclesResult, usersResult, conversationsResult, messagesResult] = await Promise.all([
        supabase.from('vehicles').select('created_at').gte('created_at', startDate),
        supabase.from('user_profiles').select('created_at').gte('created_at', startDate),
        supabase.from('conversations').select('created_at').gte('created_at', startDate),
        supabase.from('messages').select('created_at').gte('created_at', startDate)
      ])

      // Grouper par jour
      const statsByDay: Record<string, { date: string; vehicles: number; users: number; conversations: number; messages: number }> = {}
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        statsByDay[dateStr] = {
          date: dateStr,
          vehicles: 0,
          users: 0,
          conversations: 0,
          messages: 0
        }
      }

      // Compter les données par jour
      vehiclesResult.data?.forEach((v: { created_at: string }) => {
        const date = v.created_at.split('T')[0]
        if (statsByDay[date]) statsByDay[date].vehicles++
      })

      usersResult.data?.forEach((u: { created_at: string }) => {
        const date = u.created_at.split('T')[0]
        if (statsByDay[date]) statsByDay[date].users++
      })

      conversationsResult.data?.forEach((c: { created_at: string }) => {
        const date = c.created_at.split('T')[0]
        if (statsByDay[date]) statsByDay[date].conversations++
      })

      messagesResult.data?.forEach((m: { created_at: string }) => {
        const date = m.created_at.split('T')[0]
        if (statsByDay[date]) statsByDay[date].messages++
      })

      return Object.values(statsByDay).reverse()
    } catch (error) {
      console.error('Erreur récupération stats période:', error)
      throw error
    }
  }

  // Récupérer les marques de véhicules les plus populaires
  static async getPopularBrands() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('brand')

      if (error) {
        console.error('Erreur récupération marques populaires:', error)
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      const brandCounts: Record<string, number> = {}
      data.forEach((vehicle: { brand: string | null }) => {
        const brand = vehicle.brand || 'Non spécifiée'
        brandCounts[brand] = (brandCounts[brand] || 0) + 1
      })

      return (Object.entries(brandCounts)
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => (Number(b.count) - Number(a.count)))
        .slice(0, 10)
      )
    } catch (error) {
      console.error('Erreur récupération marques populaires:', error)
      return []
    }
  }

  // Récupérer les signalisations des derniers jours
  static async getSignalizationsByDay(days: number = 7) {
    try {
      const { data, error } = await supabase
        .from('signalizations')
        .select('created_at, type, urgency')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        console.log('Table signalizations non trouvée')
        return []
      }

      // Grouper par jour
      const dailyStats: Record<string, { date: string; dayName: string; total: number; urgent: number; normal: number; types: Record<string, number> }> = {}
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' })
        dailyStats[dateStr] = {
          date: dateStr,
          dayName,
          total: 0,
          urgent: 0,
          normal: 0,
          types: {}
        }
      }

      // Compter les signalisations par jour
      data?.forEach((signal: { created_at: string; urgency?: string | null; type?: string | null }) => {
        const date = signal.created_at.split('T')[0]
        if (dailyStats[date]) {
          dailyStats[date].total++
          if (signal.urgency === 'urgent') {
            dailyStats[date].urgent++
          } else {
            dailyStats[date].normal++
          }
          
          // Compter par type
          const type = signal.type || 'autre'
          dailyStats[date].types[type] = (dailyStats[date].types[type] || 0) + 1
        }
      })

      return Object.values(dailyStats).reverse()
    } catch (error) {
      console.error('Erreur récupération signalisations par jour:', error)
      return []
    }
  }

  // Récupérer les statistiques d'engagement par heure
  static async getEngagementByHour(days: number = 7) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      // Grouper par heure
      const hourlyStats: Record<number, { hour: string; messages: number }> = {}
      for (let hour = 0; hour < 24; hour++) {
        hourlyStats[hour] = {
          hour: `${hour}:00`,
          messages: 0
        }
      }

      // Compter les messages par heure
      data?.forEach((message: { created_at: string }) => {
        const hour = new Date(message.created_at).getHours()
        if (hourlyStats[hour]) {
          hourlyStats[hour].messages++
        }
      })

      return Object.values(hourlyStats)
    } catch (error) {
      console.error('Erreur récupération engagement par heure:', error)
      return []
    }
  }

  // Récupérer les types de signalisations les plus fréquents
  static async getSignalizationTypes() {
    try {
      const { data, error } = await supabase
        .from('signalizations')
        .select('type, urgency')

      if (error) {
        console.log('Table signalizations non trouvée')
        return []
      }

      const typeCounts: Record<string, { total: number; urgent: number; normal: number }> = {}
      data?.forEach((signal: { type?: string | null; urgency?: string | null }) => {
        const type = signal.type || 'non_specifie'
        if (!typeCounts[type]) {
          typeCounts[type] = { total: 0, urgent: 0, normal: 0 }
        }
        typeCounts[type].total++
        if (signal.urgency === 'urgent') {
          typeCounts[type].urgent++
        } else {
          typeCounts[type].normal++
        }
      })

      return Object.entries(typeCounts)
        .map(([type, counts]) => ({
          type,
          ...counts,
          percentage: data.length > 0 ? Math.round((counts.total / data.length) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total)
    } catch (error) {
      console.error('Erreur récupération types signalisations:', error)
      return []
    }
  }

  // Récupérer les statistiques de croissance
  static async getGrowthStats() {
    try {
      const today = new Date()
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      const twoMonthsAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)

      const [vehiclesThisWeek, vehiclesLastWeek, vehiclesThisMonth, vehiclesLastMonth] = await Promise.all([
        supabase.from('vehicles').select('id', { count: 'exact' }).gte('created_at', lastWeek.toISOString()),
        supabase.from('vehicles').select('id', { count: 'exact' }).gte('created_at', lastMonth.toISOString()).lt('created_at', lastWeek.toISOString()),
        supabase.from('vehicles').select('id', { count: 'exact' }).gte('created_at', lastMonth.toISOString()),
        supabase.from('vehicles').select('id', { count: 'exact' }).gte('created_at', twoMonthsAgo.toISOString()).lt('created_at', lastMonth.toISOString())
      ])

      const weeklyGrowth = (vehiclesLastWeek.count ?? 0) > 0 ? 
        Math.round((((vehiclesThisWeek.count ?? 0) - (vehiclesLastWeek.count ?? 0)) / (vehiclesLastWeek.count ?? 1)) * 100) : 0

      const monthlyGrowth = (vehiclesLastMonth.count ?? 0) > 0 ? 
        Math.round((((vehiclesThisMonth.count ?? 0) - (vehiclesLastMonth.count ?? 0)) / (vehiclesLastMonth.count ?? 1)) * 100) : 0

      return {
        weeklyGrowth,
        monthlyGrowth,
        vehiclesThisWeek: vehiclesThisWeek.count || 0,
        vehiclesThisMonth: vehiclesThisMonth.count || 0
      }
    } catch (error) {
      console.error('Erreur récupération stats croissance:', error)
      return { weeklyGrowth: 0, monthlyGrowth: 0, vehiclesThisWeek: 0, vehiclesThisMonth: 0 }
    }
  }

  // Récupérer les logs de sécurité
  static async getSecurityLogs() {
    try {
      const [scanAttempts, abuseReports, consents] = await Promise.all([
        supabase.from('scan_attempts').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('abuse_reports').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('user_consents').select('*').order('consent_date', { ascending: false }).limit(100)
      ])

      return {
        scanAttempts: scanAttempts.data || [],
        abuseReports: abuseReports.data || [],
        consents: consents.data || []
      }
    } catch (error) {
      console.error('Erreur récupération logs sécurité:', error)
      return { scanAttempts: [], abuseReports: [], consents: [] }
    }
  }

  // Récupérer les signalements d'abus pour modération
  static async getAbuseReports() {
    try {
      const { data, error } = await supabase
        .from('abuse_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erreur récupération signalements:', error)
      return []
    }
  }

  // Mettre à jour le statut d'un signalement
  static async updateAbuseReportStatus(reportId: string, status: string, reviewedBy: string) {
    try {
      const { error } = await supabase
        .from('abuse_reports')
        .update({ 
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy
        })
        .eq('id', reportId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erreur mise à jour signalement:', error)
      throw error
    }
  }

  // Récupérer les abonnements (enrichis avec plan + profil utilisateur)
  static async getAllSubscriptions() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return []

      const { data, error } = await supabase.functions.invoke('admin-subscriptions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) {
        console.error('[AdminService] Erreur admin-subscriptions:', error)
        return []
      }

      // La fonction retourne déjà le format attendu par le composant
      return (data || []).map((item: any) => ({
        id:                     item.user_id,
        user_id:                item.user_id,
        plan_id:                item.plan_id,
        status:                 item.status,
        stripe_customer_id:     item.stripe_customer_id,
        stripe_subscription_id: item.stripe_subscription_id,
        current_period_start:   item.current_period_start,
        current_period_end:     item.current_period_end,
        cancel_at_period_end:   item.cancel_at_period_end,
        last_invoice_status:    item.last_invoice_status,
        last_payment_error:     item.last_payment_error,
        created_at:             null,
        plan:                   item.plan,
        user: {
          email:      item.email,
          first_name: item.first_name,
          last_name:  item.last_name,
        },
      }))
    } catch (error) {
      console.error('[AdminService] Erreur récupération abonnements:', error)
      return []
    }
  }

  // Récupérer les utilisateurs pour la création d'abonnements Enterprise
  static async getUsersForEnterprise() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, id, email, first_name, last_name')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((p: any) => ({
      userId: p.user_id || p.id,
      email: p.email || '',
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '',
    })).filter((u: any) => u.userId)
  }

  // Créer un abonnement Enterprise personnalisé via Stripe
  static async createEnterpriseSubscription(
    userId: string,
    amountCents: number,
    currency: string,
    interval: 'month' | 'year',
    description?: string
  ) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout : la fonction met trop de temps à répondre (>30s). Vérifiez que la fonction est bien déployée : supabase functions deploy enterprise-subscription')), 30000)
    )

    const invoke = supabase.functions.invoke('enterprise-subscription', {
      body: { userId, amountCents, currency, interval, description },
    })

    const { data, error } = await Promise.race([invoke, timeout]) as Awaited<typeof invoke>

    if (error) throw new Error(error.message || 'Erreur lors de la création de l\'abonnement Enterprise')
    if (data?.error) throw new Error(data.error)

    return data
  }

  // Récupérer les QR codes avec statistiques
  static async getQRCodesStats() {
    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, qr_code, is_active, created_at, brand, model, license_plate')

      if (error) throw error

      // Récupérer les stats de réputation
      const { data: reputation } = await supabase
        .from('qr_reputation')
        .select('*')

      // Récupérer les stats de scans
      const { data: scans } = await supabase
        .from('scan_attempts')
        .select('vehicle_id, success, created_at')

      return {
        vehicles: vehicles || [],
        reputation: reputation || [],
        scans: scans || []
      }
    } catch (error) {
      console.error('Erreur récupération stats QR codes:', error)
      return { vehicles: [], reputation: [], scans: [] }
    }
  }

  // Récupérer la date du dernier événement pour chaque type d'activité
  static async getRecentActivity() {
    const [vehicle, signal, user, conversation, token] = await Promise.allSettled([
      supabase.from('vehicles').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('signalizations').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('user_profiles').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('conversations').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('notification_tokens').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
    ])

    const ts = (r: PromiseSettledResult<any>): string | null =>
      r.status === 'fulfilled' && r.value.data ? (r.value.data.created_at as string) : null

    return {
      lastVehicle: ts(vehicle),
      lastSignalization: ts(signal),
      lastUser: ts(user),
      lastConversation: ts(conversation),
      lastToken: ts(token),
    }
  }

  // ─── Méthodes filtrées par utilisateur (vue non-admin) ───────────────────

  static async getUserVehicles(authUserId: string) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', authUserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  static async getUserConversations(authUserId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`reporter_id.eq.${authUserId},owner_id.eq.${authUserId}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  static async getUserSignalizations(authUserId: string) {
    const { data, error } = await supabase
      .from('signalizations')
      .select('*')
      .eq('reporter_id', authUserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  static async getUserStats(authUserId: string) {
    const [vehiclesRes, convsRes, signalsRes] = await Promise.all([
      supabase.from('vehicles').select('id, is_active, created_at').eq('owner_id', authUserId),
      supabase.from('conversations').select('id, status, created_at').or(`reporter_id.eq.${authUserId},owner_id.eq.${authUserId}`),
      supabase.from('signalizations').select('id, urgency, created_at').eq('reporter_id', authUserId),
    ])

    const vehicles = vehiclesRes.data || []
    const convs = convsRes.data || []
    const signals = signalsRes.data || []

    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    return {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v: any) => v.is_active).length,
      totalConversations: convs.length,
      activeConversations: convs.filter((c: any) => c.status === 'active').length,
      resolvedConversations: convs.filter((c: any) => c.status === 'resolved').length,
      totalSignalizations: signals.length,
      urgentSignalizations: signals.filter((s: any) => s.urgency === 'urgent').length,
      newVehiclesThisMonth: vehicles.filter((v: any) => new Date(v.created_at) > lastMonth).length,
    }
  }
}
