import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format, subHours, startOfHour } from 'date-fns';

// Main dashboard metrics
export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();
      const yesterday = subDays(today, 1);
      const startOfYesterday = startOfDay(yesterday).toISOString();
      const endOfYesterday = endOfDay(yesterday).toISOString();

      // Parallel queries for better performance
      const [
        contactsResult,
        conversationsToday,
        conversationsYesterday,
        messagesResult,
        ticketsResult,
        resolvedTicketsToday,
        resolvedTicketsYesterday,
      ] = await Promise.all([
        // Total contacts
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('ativo', true),
        
        // Conversations today
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfToday)
          .lte('created_at', endOfToday),
        
        // Conversations yesterday
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfYesterday)
          .lte('created_at', endOfYesterday),
        
        // Total messages today
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startOfToday),
        
        // Open tickets
        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['aberto_ia', 'em_analise', 'pendente']),
        
        // Resolved tickets today (status = concluido)
        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'concluido')
          .gte('resolved_at', startOfToday),
        
        // Resolved tickets yesterday
        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'concluido')
          .gte('resolved_at', startOfYesterday)
          .lte('resolved_at', endOfYesterday),
      ]);

      // Calculate changes
      const conversationsTodayCount = conversationsToday.count || 0;
      const conversationsYesterdayCount = conversationsYesterday.count || 1; // Avoid division by zero
      const conversationsChange = Math.round(
        ((conversationsTodayCount - conversationsYesterdayCount) / conversationsYesterdayCount) * 100
      );

      const resolvedTodayCount = resolvedTicketsToday.count || 0;
      const resolvedYesterdayCount = resolvedTicketsYesterday.count || 1;
      const resolvedChange = Math.round(
        ((resolvedTodayCount - resolvedYesterdayCount) / resolvedYesterdayCount) * 100
      );

      return {
        totalContacts: contactsResult.count || 0,
        conversationsToday: conversationsTodayCount,
        conversationsChange,
        messagesToday: messagesResult.count || 0,
        openTickets: ticketsResult.count || 0,
        resolvedToday: resolvedTodayCount,
        resolvedChange,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Tickets by status for pie/bar chart
export const useTicketsByStatus = () => {
  return useQuery({
    queryKey: ['tickets-by-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('status');

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

// Messages over time (last 24 hours)
export const useMessagesOverTime = () => {
  return useQuery({
    queryKey: ['messages-over-time'],
    queryFn: async () => {
      const now = new Date();
      const hours: { hour: string; messages: number }[] = [];

      // Get messages from last 12 hours
      for (let i = 11; i >= 0; i--) {
        const hourStart = startOfHour(subHours(now, i));
        const hourEnd = startOfHour(subHours(now, i - 1));

        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', hourStart.toISOString())
          .lt('created_at', hourEnd.toISOString());

        hours.push({
          hour: format(hourStart, 'HH:mm'),
          messages: count || 0,
        });
      }

      return hours;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

// Campaigns summary with detailed metrics
export const useCampaignsSummary = () => {
  return useQuery({
    queryKey: ['campaigns-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('status, enviados, entregues, falhas, lidos, respondidos')
        .order('created_at', { ascending: false })
        .limit(10);

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

      // Calculate rates
      const deliveryRate = summary.totalEnviados > 0 
        ? Math.round((summary.totalEntregues / summary.totalEnviados) * 100) 
        : 0;
      const readRate = summary.totalEntregues > 0 
        ? Math.round((summary.totalLidos / summary.totalEntregues) * 100) 
        : 0;
      const responseRate = summary.totalEntregues > 0 
        ? Math.round((summary.totalRespondidos / summary.totalEntregues) * 100) 
        : 0;

      return {
        ...summary,
        deliveryRate,
        readRate,
        responseRate,
      };
    },
    refetchInterval: 30000,
  });
};

// Recent activity (tickets, conversations, etc.)
export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      // Get recent tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select(`
          id,
          numero,
          titulo,
          status,
          created_at,
          resolved_at,
          assigned_to,
          profiles:assigned_to(nome)
        `)
        .order('updated_at', { ascending: false })
        .limit(5);

      // Get recent conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          id,
          status,
          created_at,
          resolved_at,
          contacts:contact_id(nome)
        `)
        .order('updated_at', { ascending: false })
        .limit(5);

      // Combine and sort by date
      const activities: Array<{
        id: string;
        type: 'ticket_created' | 'ticket_resolved' | 'conversation_started' | 'conversation_resolved';
        title: string;
        subtitle: string;
        timestamp: string;
      }> = [];

      tickets?.forEach((ticket) => {
        if (ticket.status === 'concluido' && ticket.resolved_at) {
          activities.push({
            id: `ticket-resolved-${ticket.id}`,
            type: 'ticket_resolved',
            title: `Ticket #${ticket.numero} resolvido`,
            subtitle: ticket.titulo,
            timestamp: ticket.resolved_at,
          });
        } else {
          activities.push({
            id: `ticket-${ticket.id}`,
            type: 'ticket_created',
            title: `Novo ticket #${ticket.numero}`,
            subtitle: ticket.titulo,
            timestamp: ticket.created_at,
          });
        }
      });

      conversations?.forEach((conv) => {
        const contactName = (conv.contacts as any)?.nome || 'Contato';
        if (conv.status === 'resolvido' && conv.resolved_at) {
          activities.push({
            id: `conv-resolved-${conv.id}`,
            type: 'conversation_resolved',
            title: 'Conversa encerrada',
            subtitle: contactName,
            timestamp: conv.resolved_at,
          });
        } else {
          activities.push({
            id: `conv-${conv.id}`,
            type: 'conversation_started',
            title: 'Nova conversa iniciada',
            subtitle: contactName,
            timestamp: conv.created_at,
          });
        }
      });

      // Sort by timestamp and take top 6
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6);
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });
};

// Active agents (profiles with recent activity)
export const useActiveAgents = () => {
  return useQuery({
    queryKey: ['active-agents'],
    queryFn: async () => {
      // Get profiles that are assigned to active conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          assigned_to,
          profiles:assigned_to(id, nome, ativo)
        `)
        .eq('status', 'ativo')
        .not('assigned_to', 'is', null);

      // Count conversations per agent
      const agentCounts: Record<string, { nome: string; count: number }> = {};

      conversations?.forEach((conv) => {
        const profile = conv.profiles as any;
        if (profile && profile.id) {
          if (!agentCounts[profile.id]) {
            agentCounts[profile.id] = { nome: profile.nome, count: 0 };
          }
          agentCounts[profile.id].count++;
        }
      });

      // Also get all active profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('ativo', true)
        .limit(6);

      const agents = profiles?.map((profile) => ({
        id: profile.id,
        nome: profile.nome,
        status: agentCounts[profile.id] ? 'online' : 'away',
        activeChats: agentCounts[profile.id]?.count || 0,
      })) || [];

      return agents;
    },
    refetchInterval: 30000,
  });
};
