import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Campaign = Tables<'campaigns'>;
export type CampaignInsert = TablesInsert<'campaigns'>;
export type CampaignUpdate = TablesUpdate<'campaigns'>;
export type CampaignRecipient = Tables<'campaign_recipients'>;

// --- 1. LISTAR CAMPANHAS ---
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

// --- 2. OBTER UMA CAMPANHA (COM DESTINATÁRIOS) ---
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
            contacts:contact_id(id, nome, whatsapp, email)
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

// --- 3. CRIAR CAMPANHA ---
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Omit<CampaignInsert, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      // Pega usuário atual
      const { data: { user } } = await supabase.auth.getUser();

      // Pega profile ID (necessário para created_by)
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
          // owner_id será preenchido pelo Trigger do banco
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Rascunho de campanha criado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar campanha: ' + error.message);
    }
  });
};

// --- 4. ATUALIZAR CAMPANHA ---
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
      toast.success('Campanha atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });
};

// --- 5. EXCLUIR CAMPANHA ---
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Remove destinatários primeiro (embora o banco deva ter CASCADE)
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
      toast.success('Campanha excluída.');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });
};

// --- 6. ADICIONAR DESTINATÁRIOS (POPULAR LISTA) ---
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
      if (contactIds.length === 0) return;

      const recipients = contactIds.map(contactId => ({
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'pendente',
      }));

      // Insert (Upsert para evitar duplicados se rodar 2x)
      const { data, error } = await supabase
        .from('campaign_recipients')
        .upsert(recipients, { onConflict: 'campaign_id,contact_id' as any }) // Ajuste conforme sua constraint unique
        .select();

      if (error) throw error;

      // Atualiza contador total na campanha
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

// --- 7. DISPARAR/ENVIAR CAMPANHA (ATUALIZADO) ---
export const useSendCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      scheduledAt,
      frequencyLimitHours = 24,
      bypassFrequencyCheck = false,
      templateName, // <--- NOVO
      useTemplateApi = false, // <--- NOVO
    }: {
      campaignId: string;
      scheduledAt?: Date;
      frequencyLimitHours?: number;
      bypassFrequencyCheck?: boolean;
      templateName?: string;
      useTemplateApi?: boolean;
    }) => {
      // 1. Busca dados da campanha
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

      // 2. Agendamento
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

      // 3. Atualiza status para 'enviando'
      await supabase
        .from('campaigns')
        .update({
          status: 'enviando',
          iniciado_em: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // 4. Prepara lista de envio
      const recipients = campaign.campaign_recipients?.map((r: any) => ({
        whatsapp: r.contacts?.whatsapp,
        nome: r.contacts?.nome,
        matricula: r.contacts?.matricula,
        secretaria: r.contacts?.secretaria,
        email: r.contacts?.email,
        contact_id: r.contact_id,
      })).filter((r: any) => r.whatsapp) || [];

      // 5. Chama a Edge Function com os novos parâmetros
      const { data, error } = await supabase.functions.invoke('campaign-send', {
        body: {
          campaign_id: campaignId,
          name: campaign.nome,
          message_template: campaign.mensagem,
          // Envia os dados do template SE estiver usando
          template_name: useTemplateApi ? templateName : undefined,
          use_template_api: useTemplateApi,

          recipients,
          frequency_limit_hours: frequencyLimitHours,
          bypass_frequency_check: bypassFrequencyCheck,
        },
      });

      if (error) throw error;

      // 6. Processa retorno e atualiza banco
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

      // Atualiza status individual dos recipients (Lote seria melhor, mas mantendo lógica original)
      if (data.results) {
        const updates = data.results.map(async (result: any) => {
          const recipient = recipients.find((r: any) => r.whatsapp === result.recipient);
          if (recipient) {
            return supabase
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
        });
        await Promise.all(updates);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      if (data.scheduled) {
        toast.success(`Agendado para ${new Date(data.scheduledAt).toLocaleString()}`);
      } else {
        toast.success(`Disparo concluído! ${data.summary?.sent || 0} enviados.`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro no envio: ' + error.message);
    }
  });
};

// --- 8. HELPERS DE FILTROS ---

// Busca Departamentos (antigo Secretarias) para o select de filtro
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

// Busca Tags únicas
export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      // Flatten e Unique
      const allTags = data.flatMap(c => c.tags || []);
      const unique = [...new Set(allTags)];
      return unique as string[];
    },
  });
};

// Conta contatos baseado no filtro (Prévia de Público)
export const useContactsCount = (filter: { secretaria?: string; tags?: string[] }) => {
  return useQuery({
    queryKey: ['contacts-count', filter],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('ativo', true)
        .not('whatsapp', 'is', null);

      // Correção: filtro por department_id
      if (filter.secretaria && filter.secretaria !== 'all') {
        query = query.eq('department_id', filter.secretaria);
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

// Busca contatos reais baseado no filtro (Para popular a campanha)
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
        query = query.eq('department_id', filter.secretaria);
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

// --- 9. DUPLICAR CAMPANHA ---
export const useDuplicateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      // 1. Busca dados da campanha original
      const { data: original, error: fetchError } = await supabase
        .from("campaigns")
        .select("*, campaign_recipients(contact_id)")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Cria nova campanha (rascunho)
      const { data: copy, error: createError } = await supabase
        .from("campaigns")
        .insert({
          nome: `${original.nome} (Cópia)`,
          descricao: original.descricao,
          mensagem: original.mensagem,
          template_id: original.template_id,
          filtro_secretaria: original.filtro_secretaria,
          filtro_tags: original.filtro_tags,
          total_destinatarios: original.total_destinatarios,
          status: "rascunho",
          created_by: original.created_by,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 3. Copia destinatários
      if (original.campaign_recipients && original.campaign_recipients.length > 0) {
        const recipients = original.campaign_recipients.map((r: any) => ({
          campaign_id: copy.id,
          contact_id: r.contact_id,
          status: "pendente",
        }));

        const { error: recipientError } = await supabase
          .from("campaign_recipients")
          .insert(recipients);

        if (recipientError) throw recipientError;
      }

      return copy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha duplicada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao duplicar campanha: " + error.message);
    }
  });
};

// --- 10. ATUALIZAR STATUS (PAUSAR/RETOMAR) ---
export const useUpdateCampaignStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      const statusLabel = variables.status === "pausada" ? "pausada" :
        variables.status === "rascunho" ? "movida para rascunhos" :
          variables.status === "agendada" ? "agendada" : "atualizada";
      toast.success(`Campanha ${statusLabel}!`);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  });
};