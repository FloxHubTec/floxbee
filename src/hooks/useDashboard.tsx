import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format, subHours, startOfHour } from 'date-fns';

// Main dashboard metrics
export const useDashboardMetrics = (filters?: { startDate?: string; endDate?: string; agentId?: string }) => {
  return useQuery({
    queryKey: ['dashboard-metrics', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('owner_id, id')
        .eq('user_id', user?.id)
        .single();

      const ownerId = profile?.owner_id || profile?.id;

      const startDate = filters?.startDate || startOfDay(new Date()).toISOString();
      const endDate = filters?.endDate || endOfDay(new Date()).toISOString();
      const agentId = filters?.agentId;

      const yesterday = subDays(new Date(startDate), 1);
      const startOfYesterday = startOfDay(yesterday).toISOString();
      const endOfYesterday = endOfDay(yesterday).toISOString();

      // Base query setup
      let baseContacts = supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('owner_id', ownerId);
      let baseConvPeriod = supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).gte('created_at', startDate).lte('created_at', endDate);
      let baseConvPrev = supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).gte('created_at', startOfYesterday).lte('created_at', endOfYesterday);
      let baseMessages = supabase.from('messages').select('id, conversations!inner(owner_id)', { count: 'exact', head: true }).eq('conversations.owner_id', ownerId).gte('created_at', startDate).lte('created_at', endDate);
      let baseTicketsOpen = supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).in('status', ['aberto_ia', 'em_analise', 'pendente']);
      // Tickets Resolved (Contar por resolved_at no período)
      let baseTicketsResolvedPeriod = supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).gte('resolved_at', startDate).lte('resolved_at', endDate);
      let baseTicketsResolvedPrev = supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).gte('resolved_at', startOfYesterday).lte('resolved_at', endOfYesterday);

      // Conversations Resolved (Contar por resolved_at no período)
      let baseConvsResolvedPeriod = supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).gte('resolved_at', startDate).lte('resolved_at', endDate);
      let baseConvsResolvedPrev = supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).gte('resolved_at', startOfYesterday).lte('resolved_at', endOfYesterday);

      if (agentId) {
        baseConvPeriod = baseConvPeriod.eq('assigned_to', agentId);
        baseConvPrev = baseConvPrev.eq('assigned_to', agentId);
        baseTicketsOpen = baseTicketsOpen.eq('assigned_to', agentId);
        baseTicketsResolvedPeriod = baseTicketsResolvedPeriod.eq('assigned_to', agentId);
        baseTicketsResolvedPrev = baseTicketsResolvedPrev.eq('assigned_to', agentId);
        baseConvsResolvedPeriod = baseConvsResolvedPeriod.eq('assigned_to', agentId);
        baseConvsResolvedPrev = baseConvsResolvedPrev.eq('assigned_to', agentId);
        // Messages and contacts might not have direct agent_id in some schemas, skipping for now unless confirmed
      }

      const [
        contactsResult,
        conversationsPeriod,
        conversationsPrev,
        messagesResult,
        ticketsResult,
        resolvedTicketsPeriod,
        resolvedTicketsPrev,
        resolvedConvsPeriod,
        resolvedConvsPrev,
      ] = await Promise.all([
        baseContacts,
        baseConvPeriod,
        baseConvPrev,
        baseMessages,
        baseTicketsOpen,
        baseTicketsResolvedPeriod,
        baseTicketsResolvedPrev,
        baseConvsResolvedPeriod,
        baseConvsResolvedPrev,
      ]);

      const convCount = conversationsPeriod.count || 0;
      const convPrevCount = conversationsPrev.count || 1;
      const conversationsChange = Math.round(((convCount - convPrevCount) / convPrevCount) * 100);

      const totalResolvedCount = (resolvedTicketsPeriod.count || 0) + (resolvedConvsPeriod.count || 0);
      const totalResolvedPrevCount = (resolvedTicketsPrev.count || 0) + (resolvedConvsPrev.count || 0) || 1;
      const resolvedChange = Math.round(((totalResolvedCount - totalResolvedPrevCount) / totalResolvedPrevCount) * 100);

      return {
        totalContacts: contactsResult.count || 0,
        conversationsToday: convCount, // named today for compatibility with existing UI
        conversationsChange,
        messagesToday: messagesResult.count || 0,
        openTickets: ticketsResult.count || 0,
        resolvedToday: totalResolvedCount,
        resolvedChange,
      };
    },
    refetchInterval: 30000,
  });
};

// Tickets by status for pie/bar chart
export const useTicketsByStatus = (filters?: { startDate?: string; endDate?: string; agentId?: string }) => {
  return useQuery({
    queryKey: ['tickets-by-status', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('owner_id, id').eq('user_id', user?.id).single();
      const ownerId = profile?.owner_id || profile?.id;

      let query = supabase
        .from('tickets')
        .select('status')
        .eq('owner_id', ownerId);

      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);
      if (filters?.agentId) query = query.eq('assigned_to', filters.agentId);

      const { data, error } = await query;

      if (error) throw error;

      const statusCounts: Record<string, number> = {
        aberto_ia: 0,
        em_analise: 0,
        pendente: 0,
        concluido: 0,
      };

      data?.forEach((ticket) => {
        if (ticket.status in statusCounts) {
          statusCounts[ticket.status]++;
        }
      });

      return [
        { name: 'IA', value: statusCounts.aberto_ia, color: 'hsl(var(--primary))' },
        { name: 'Em Análise', value: statusCounts.em_analise, color: 'hsl(45, 93%, 47%)' },
        { name: 'Pendente', value: statusCounts.pendente, color: 'hsl(0, 84%, 60%)' },
        { name: 'Concluído', value: statusCounts.concluido, color: 'hsl(142, 71%, 45%)' },
      ];
    },
    refetchInterval: 30000,
  });
};

// Messages over time
export const useMessagesOverTime = (filters?: { startDate?: string; endDate?: string; agentId?: string }) => {
  return useQuery({
    queryKey: ['messages-over-time', filters],
    queryFn: async () => {
      const now = new Date();
      const hours: { hour: string; messages: number }[] = [];
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('owner_id, id').eq('user_id', user?.id).single();
      const ownerId = profile?.owner_id || profile?.id;

      const twentyFourHoursAgo = subHours(now, 24);

      const { data: messages, error } = await supabase
        .from('messages')
        .select('created_at, conversations!inner(owner_id)')
        .eq('conversations.owner_id', ownerId)
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by hour in memory
      for (let i = 23; i >= 0; i--) {
        const hourStart = startOfHour(subHours(now, i));
        const hourLabel = format(hourStart, 'HH:mm');

        const count = messages?.filter(m => {
          const msgDate = new Date(m.created_at);
          return msgDate >= hourStart && msgDate < startOfHour(subHours(now, i - 1));
        }).length || 0;

        hours.push({
          hour: hourLabel,
          messages: count,
        });
      }

      return hours;
    },
    refetchInterval: 60000,
  });
};

// Campaigns summary
export const useCampaignsSummary = (filters?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['campaigns-summary', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('owner_id, id').eq('user_id', user?.id).single();
      const ownerId = profile?.owner_id || profile?.id;

      let query = supabase
        .from('campaigns')
        .select('status, enviados, entregues, falhas, lidos, respondidos')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error } = await query.limit(20);

      if (error) throw error;

      const summary = {
        total: data?.length || 0,
        concluidas: data?.filter(c => c.status === 'concluida').length || 0,
        agendadas: data?.filter(c => c.status === 'agendada').length || 0,
        totalEnviados: data?.reduce((acc, c) => acc + (c.enviados || 0), 0) || 0,
        totalEntregues: data?.reduce((acc, c) => acc + (c.entregues || 0), 0) || 0,
        totalLidos: data?.reduce((acc, c) => acc + (c.lidos || 0), 0) || 0,
        totalRespondidos: data?.reduce((acc, c) => acc + (c.respondidos || 0), 0) || 0,
        totalFalhas: data?.reduce((acc, c) => acc + (c.falhas || 0), 0) || 0,
      };

      const deliveryRate = summary.totalEnviados > 0 ? Math.round((summary.totalEntregues / summary.totalEnviados) * 100) : 0;
      const readRate = summary.totalEntregues > 0 ? Math.round((summary.totalLidos / summary.totalEntregues) * 100) : 0;
      const responseRate = summary.totalEntregues > 0 ? Math.round((summary.totalRespondidos / summary.totalEntregues) * 100) : 0;

      return { ...summary, deliveryRate, readRate, responseRate };
    },
    refetchInterval: 30000,
  });
};

// Recent activity
export const useRecentActivity = (filters?: { agentId?: string }) => {
  return useQuery({
    queryKey: ['recent-activity', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('owner_id, id').eq('user_id', user?.id).single();
      const ownerId = profile?.owner_id || profile?.id;

      let ticketQuery = supabase.from('tickets').select('id, numero, titulo, status, created_at, resolved_at, assigned_to, profiles:assigned_to(nome)').eq('owner_id', ownerId);
      let convQuery = supabase.from('conversations').select('id, status, created_at, resolved_at, assigned_to, contacts:contact_id(nome)').eq('owner_id', ownerId);

      if (filters?.agentId) {
        ticketQuery = ticketQuery.eq('assigned_to', filters.agentId);
        convQuery = convQuery.eq('assigned_to', filters.agentId);
      }

      const [ticketsRes, convsRes] = await Promise.all([
        ticketQuery.order('updated_at', { ascending: false }).limit(10),
        convQuery.order('updated_at', { ascending: false }).limit(10)
      ]);

      const activities: any[] = [];
      ticketsRes.data?.forEach((t: any) => {
        activities.push({
          id: `t-${t.id}`,
          type: t.status === 'concluido' ? 'ticket_resolved' : 'ticket_created',
          title: `${t.status === 'concluido' ? 'Resolvido: ' : 'Novo: '} #${t.numero}`,
          subtitle: t.titulo,
          timestamp: t.status === 'concluido' ? t.resolved_at : t.created_at,
        });
      });
      convsRes.data?.forEach((c: any) => {
        activities.push({
          id: `c-${c.id}`,
          type: c.status === 'concluido' ? 'conversation_resolved' : 'conversation_started',
          title: c.status === 'concluido' ? 'Encerrada' : 'Iniciada',
          subtitle: c.contacts?.nome || 'Contato',
          timestamp: c.status === 'concluido' ? c.resolved_at : c.created_at,
        });
      });

      return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },
    refetchInterval: 15000,
  });
};

// Active agents
export const useActiveAgents = () => {
  return useQuery({
    queryKey: ['active-agents'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('owner_id, id').eq('user_id', user?.id).single();
      const ownerId = profile?.owner_id || profile?.id;

      const { data: conversations } = await supabase
        .from('conversations')
        .select('assigned_to, profiles:assigned_to(id, nome, ativo)')
        .eq('owner_id', ownerId)
        .eq('status', 'ativo')
        .not('assigned_to', 'is', null);

      const agentCounts: Record<string, { nome: string; count: number }> = {};
      conversations?.forEach((conv: any) => {
        const p = conv.profiles;
        if (p && p.id) {
          if (!agentCounts[p.id]) agentCounts[p.id] = { nome: p.nome, count: 0 };
          agentCounts[p.id].count++;
        }
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, role')
        .eq('owner_id', ownerId)
        .eq('ativo', true)
        .in('role', ['supervisor', 'agente']);

      return profiles?.map(p => ({
        id: p.id,
        nome: p.nome,
        status: agentCounts[p.id] ? 'online' : 'away',
        activeChats: agentCounts[p.id]?.count || 0
      })) || [];
    },
    refetchInterval: 30000,
  });
};
