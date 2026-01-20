import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Campaign = Tables<'campaigns'>;
export type CampaignInsert = TablesInsert<'campaigns'>;
export type CampaignUpdate = TablesUpdate<'campaigns'>;
export type CampaignRecipient = Tables<'campaign_recipients'>;

// Fetch all campaigns
export const useCampaigns = () => {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
};

// Fetch single campaign with recipients
export const useCampaign = (campaignId: string | null) => {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_recipients(
            *,
            contacts:contact_id(id, nome, whatsapp)
          )
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
};

// Create new campaign
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Omit<CampaignInsert, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get profile ID from auth user ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

// Update campaign
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CampaignUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

// Delete campaign
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete recipients
      await supabase
        .from('campaign_recipients')
        .delete()
        .eq('campaign_id', id);

      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

// Add recipients to campaign
export const useAddCampaignRecipients = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      contactIds
    }: {
      campaignId: string;
      contactIds: string[];
    }) => {
      const recipients = contactIds.map(contactId => ({
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'pendente',
      }));

      const { data, error } = await supabase
        .from('campaign_recipients')
        .insert(recipients)
        .select();

      if (error) throw error;

      // Update total recipients count
      await supabase
        .from('campaigns')
        .update({ total_destinatarios: contactIds.length })
        .eq('id', campaignId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

// Send campaign
export const useSendCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      scheduledAt,
      frequencyLimitHours = 24,
      bypassFrequencyCheck = false,
    }: {
      campaignId: string;
      scheduledAt?: Date;
      frequencyLimitHours?: number;
      bypassFrequencyCheck?: boolean;
    }) => {
      // Get campaign data
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_recipients(
            contact_id,
            contacts:contact_id(*)
          )
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // If scheduling for later
      if (scheduledAt && scheduledAt > new Date()) {
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            status: 'agendada',
            agendado_para: scheduledAt.toISOString(),
          })
          .eq('id', campaignId);

        if (updateError) throw updateError;
        return { success: true, scheduled: true, scheduledAt };
      }

      // Update status to sending
      await supabase
        .from('campaigns')
        .update({
          status: 'enviando',
          iniciado_em: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // Prepare recipients for the edge function
      const recipients = campaign.campaign_recipients?.map((r: any) => ({
        whatsapp: r.contacts?.whatsapp,
        nome: r.contacts?.nome,
        matricula: r.contacts?.matricula,
        secretaria: r.contacts?.secretaria,
        email: r.contacts?.email,
        contact_id: r.contact_id,
      })).filter((r: any) => r.whatsapp) || [];

      // Call edge function to send with frequency limit
      const { data, error } = await supabase.functions.invoke('campaign-send', {
        body: {
          campaign_id: campaignId,
          name: campaign.nome,
          message_template: campaign.mensagem,
          recipients,
          frequency_limit_hours: frequencyLimitHours,
          bypass_frequency_check: bypassFrequencyCheck,
        },
      });

      if (error) throw error;

      // Update campaign with results
      const sent = data.summary?.sent || 0;
      const failed = data.summary?.failed || 0;
      const blockedByFrequency = data.summary?.blocked_by_frequency || 0;

      await supabase
        .from('campaigns')
        .update({
          status: 'concluida',
          enviados: sent,
          falhas: failed + blockedByFrequency,
          concluido_em: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // Update individual recipient status
      if (data.results) {
        for (const result of data.results) {
          const recipient = recipients.find((r: any) => r.whatsapp === result.recipient);
          if (recipient) {
            await supabase
              .from('campaign_recipients')
              .update({
                status: result.status === 'sent' ? 'enviado' : result.status,
                enviado_em: result.status === 'sent' ? new Date().toISOString() : null,
                erro: result.error || null,
                whatsapp_message_id: result.message_id || null,
              })
              .eq('campaign_id', campaignId)
              .eq('contact_id', recipient.contact_id);
          }
        }
      }

      // Mark blocked contacts
      if (data.blocked_contacts && data.blocked_contacts.length > 0) {
        for (const blockedWhatsapp of data.blocked_contacts) {
          const recipient = recipients.find((r: any) => r.whatsapp === blockedWhatsapp);
          if (recipient) {
            await supabase
              .from('campaign_recipients')
              .update({
                status: 'bloqueado_frequencia',
                erro: `Bloqueado: mensagem enviada nas últimas ${frequencyLimitHours}h`,
              })
              .eq('campaign_id', campaignId)
              .eq('contact_id', recipient.contact_id);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

// Get departments for filter (replacing old useSecretarias)
export const useSecretarias = () => {
  return useQuery({
    queryKey: ['departments-for-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;

      return data || [];
    },
  });
};

// Get unique tags for filter
export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('tags');

      if (error) throw error;

      // Flatten and get unique tags
      const allTags = data.flatMap(c => c.tags || []);
      const unique = [...new Set(allTags)];
      return unique as string[];
    },
  });
};

// Get contacts count by filter
export const useContactsCount = (filter: { secretaria?: string; tags?: string[] }) => {
  return useQuery({
    queryKey: ['contacts-count', filter],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true)
        .not('whatsapp', 'is', null);

      if (filter.secretaria && filter.secretaria !== 'all') {
        query = query.eq('department_id', filter.secretaria); // Now using department_id
      }

      if (filter.tags && filter.tags.length > 0) {
        query = query.overlaps('tags', filter.tags);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: true,
  });
};

// Get contacts by filter
export const useContactsByFilter = (filter: { secretaria?: string; tags?: string[] }) => {
  return useQuery({
    queryKey: ['contacts-by-filter', filter],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id, nome, whatsapp, matricula, secretaria, email, tags')
        .eq('ativo', true)
        .not('whatsapp', 'is', null);

      if (filter.secretaria && filter.secretaria !== 'all') {
        query = query.eq('department_id', filter.secretaria); // Now using department_id
      }

      if (filter.tags && filter.tags.length > 0) {
        query = query.overlaps('tags', filter.tags);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};
