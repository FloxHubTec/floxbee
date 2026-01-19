import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TicketNotificationSetting = {
  id: string;
  owner_id: string | null;
  evento: string;
  status_origem: string | null;
  status_destino: string | null;
  notificar_criador: boolean;
  notificar_responsavel: boolean;
  notificar_custom: any[];
  mensagem_template: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type TicketNotificationLog = {
  id: string;
  ticket_id: string;
  setting_id: string | null;
  destinatario_id: string | null;
  evento: string;
  mensagem: string;
  status: string;
  erro: string | null;
  enviado_em: string;
};

// Fetch all notification settings
export const useTicketNotificationSettings = () => {
  return useQuery({
    queryKey: ['ticket-notification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_notification_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TicketNotificationSetting[];
    },
  });
};

// Fetch single notification setting
export const useTicketNotificationSetting = (settingId: string | null) => {
  return useQuery({
    queryKey: ['ticket-notification-setting', settingId],
    queryFn: async () => {
      if (!settingId) return null;

      const { data, error } = await supabase
        .from('ticket_notification_settings')
        .select('*')
        .eq('id', settingId)
        .single();

      if (error) throw error;
      return data as TicketNotificationSetting;
    },
    enabled: !!settingId,
  });
};

// Create notification setting
export const useCreateTicketNotificationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setting: Omit<TicketNotificationSetting, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('ticket_notification_settings')
        .insert({
          ...setting,
          owner_id: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-notification-settings'] });
    },
  });
};

// Update notification setting
export const useUpdateTicketNotificationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TicketNotificationSetting> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_notification_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-notification-settings'] });
    },
  });
};

// Delete notification setting
export const useDeleteTicketNotificationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_notification_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-notification-settings'] });
    },
  });
};

// Fetch notification logs for a ticket
export const useTicketNotificationLogs = (ticketId: string | null) => {
  return useQuery({
    queryKey: ['ticket-notification-logs', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from('ticket_notification_log')
        .select(`
          *,
          destinatario:destinatario_id(id, nome, email)
        `)
        .eq('ticket_id', ticketId)
        .order('enviado_em', { ascending: false });

      if (error) throw error;
      return data as TicketNotificationLog[];
    },
    enabled: !!ticketId,
  });
};

// Get all notification logs (for admin)
export const useAllTicketNotificationLogs = () => {
  return useQuery({
    queryKey: ['all-ticket-notification-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_notification_log')
        .select(`
          *,
          ticket:ticket_id(numero, titulo),
          destinatario:destinatario_id(nome, email)
        `)
        .order('enviado_em', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });
};
