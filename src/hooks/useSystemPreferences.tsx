import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Definir a interface das preferências
export interface SystemPreferences {
  businessDays: number[];
  businessHoursEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  aiAutoResponse: boolean;
  aiAutoTransferAfterAttempts: number;
  aiModel: string;
  aiFeedbackCollection: boolean;
  aiLearningMode: boolean; // Novo campo
  notifyNewConversations: boolean;
  notifyPriorityTickets: boolean;
  dailyEmailSummary: boolean; // Novo campo
  soundEnabled: boolean; // Novo campo
  slaEnabled: boolean;
  slaLowPriority: number;
  slaMediumPriority: number;
  slaHighPriority: number;
  slaUrgentPriority: number;
  frequencyLimitEnabled: boolean;
  frequencyLimitHours: number;
}

const DEFAULT_PREFERENCES: SystemPreferences = {
  businessDays: [1, 2, 3, 4, 5],
  businessHoursEnabled: false,
  businessHoursStart: '08:00',
  businessHoursEnd: '18:00',
  aiAutoResponse: true,
  aiAutoTransferAfterAttempts: 3,
  aiModel: 'gpt-4o-mini',
  aiFeedbackCollection: false,
  aiLearningMode: false,
  notifyNewConversations: true,
  notifyPriorityTickets: true,
  dailyEmailSummary: false,
  soundEnabled: true,
  slaEnabled: true,
  slaLowPriority: 72,
  slaMediumPriority: 24,
  slaHighPriority: 8,
  slaUrgentPriority: 4,
  frequencyLimitEnabled: true,
  frequencyLimitHours: 24,
};

export function useSystemPreferences() {
  const [preferences, setPreferences] = useState<SystemPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      loadPreferences();
    }
  }, [profile?.id]);

  async function loadPreferences() {
    try {
      setLoading(true);

      // Mesma lógica: Se sou agente, carrego as prefs do meu criador
      let targetOwnerId = profile?.id;
      if (profile?.created_by) {
        targetOwnerId = profile.created_by;
      }

      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_preferences')
        .eq('owner_id', targetOwnerId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.value });
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference<K extends keyof SystemPreferences>(
    key: K,
    value: SystemPreferences[K]
  ) {
    if (!profile?.id) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'system_preferences',
          value: newPreferences,
          owner_id: profile.id, // Salva para o usuário atual
          updated_at: new Date().toISOString()
        }, { onConflict: 'key,owner_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar preferência:', error);
      toast.error('Falha ao salvar alteração');
      setPreferences(preferences); // Reverte
    }
  }

  async function resetToDefaults() {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      await supabase
        .from('system_settings')
        .upsert({
          key: 'system_preferences',
          value: DEFAULT_PREFERENCES,
          updated_at: new Date().toISOString(),
          owner_id: profile.id
        }, { onConflict: 'key,owner_id' });
      toast.success('Padrões restaurados');
    } catch (error) {
      toast.error('Erro ao restaurar padrões');
    }
  }

  return {
    preferences,
    updatePreference,
    resetToDefaults,
    isLoaded: !loading
  };
}