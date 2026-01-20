import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TriggerConfig {
  type: string;
  value?: string;
  time?: string;
  days?: number[];
  keywords?: string[];
}

export interface AutomationRule {
  id: string;
  nome: string;
  tipo: string;
  config: TriggerConfig; // JSONB no banco - campo real do schema
  ativo: boolean;
  created_at: string;
  created_by?: string | null;
}

export interface AutomationRuleWithTemplate extends AutomationRule {
  message_templates?: {
    nome: string;
    conteudo: string;
  } | null;
}

export const TRIGGER_TYPES = [
  { value: "keyword", label: "Palavra-chave" },
  { value: "new_contact", label: "Novo Contato" },
  { value: "no_response", label: "Sem Resposta (Tempo)" },
  { value: "schedule", label: "Agendamento" },
  { value: "ticket_status", label: "Mudança de Status Ticket" },
];

export function useAutomations() {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar regras:", error);
        throw error;
      }

      // Parse manual do JSON se necessário, embora o Supabase JS client já faça isso geralmente
      return data.map(rule => ({
        ...rule,
        config: typeof rule.config === 'string'
          ? JSON.parse(rule.config)
          : rule.config
      })) as AutomationRule[];
    },
  });

  const createRule = useMutation({
    mutationFn: async (newRule: Partial<AutomationRule>) => {
      // Garantir que trigger_config seja um objeto válido para o JSONB
      const ruleToSave = {
        ...newRule,
        // Se created_by vier undefined, removemos para não enviar 'undefined'
        created_by: newRule.created_by || undefined
      };

      const { data, error } = await supabase
        .from("automation_rules")
        .insert(ruleToSave)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar regra de automação");
    }
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao atualizar regra");
    }
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao excluir regra");
    }
  });

  const toggleRuleStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("automation_rules")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Status atualizado");
    },
  });

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRuleStatus,
  };
}

// ============================================
// BIRTHDAY AUTOMATION HOOKS
// ============================================

// Fetch automation logs
export const useAutomationLogs = (ruleId?: string | null, limit: number = 100) => {
  return useQuery({
    queryKey: ['automation-logs', ruleId, limit],
    queryFn: async () => {
      let query = supabase
        .from('automation_logs')
        .select(`
          *,
          contact:contact_id(id, nome, whatsapp),
          rule:rule_id(id, nome, tipo)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

// Get today's birthdays
export const useTodaysBirthdays = () => {
  return useQuery({
    queryKey: ['todays-birthdays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_todays_birthdays');

      if (error) {
        console.warn('RPC get_todays_birthdays not found, using fallback');
        // Fallback: query manually
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('id, nome, whatsapp, data_nascimento')
          .eq('ativo', true)
          .not('data_nascimento', 'is', null);

        if (contactsError) throw contactsError;

        return contacts?.filter(c => {
          if (!c.data_nascimento) return false;
          const birthDate = new Date(c.data_nascimento);
          return birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
        }) || [];
      }

      return data;
    },
  });
};

// Get upcoming birthdays
export const useUpcomingBirthdays = (daysAhead: number = 7) => {
  return useQuery({
    queryKey: ['upcoming-birthdays', daysAhead],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_upcoming_birthdays', { days_ahead: daysAhead });

      if (error) {
        console.warn('RPC get_upcoming_birthdays not found');
        return [];
      }

      return data;
    },
  });
};

// Trigger automation manually
export const useTriggerBirthdayAutomation = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('birthday-automation', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const summary = data?.summary || {};
      toast.success(`Automação executada! ${summary.sent || 0} mensagens enviadas.`);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao executar automação');
    },
  });
};

// Test welcome automation
export const useTriggerWelcomeAutomation = () => {
  return useMutation({
    mutationFn: async (params: { contact_id: string; trigger_type: 'new_contact' | 'first_message' }) => {
      const { data, error } = await supabase.functions.invoke('welcome-automation', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Mensagem de boas-vindas enviada!');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao enviar boas-vindas');
    },
  });
};

// Get automation stats
export const useAutomationStats = () => {
  return useQuery({
    queryKey: ['automation-stats'],
    queryFn: async () => {
      // Get total rules
      const { count: totalRules } = await supabase
        .from('automation_rules')
        .select('*', { count: 'exact', head: true });

      // Get active rules
      const { count: activeRules } = await supabase
        .from('automation_rules')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);

      // Get logs from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentLogs } = await supabase
        .from('automation_logs')
        .select('status')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const sent = recentLogs?.filter(l => l.status === 'enviado' || l.status === 'sucesso').length || 0;
      const failed = recentLogs?.filter(l => l.status === 'erro').length || 0;

      // Get today's birthdays count
      const { data: birthdays } = await supabase.rpc('get_todays_birthdays').catch(() => ({ data: [] }));

      return {
        totalRules: totalRules || 0,
        activeRules: activeRules || 0,
        sentLast30Days: sent,
        failedLast30Days: failed,
        birthdaysToday: Array.isArray(birthdays) ? birthdays.length : 0,
      };
    },
  });
};