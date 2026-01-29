import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_TENANT, TenantConfig } from '@/config/tenant';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface TenantContextType {
  config: TenantConfig;
  updateConfig: (newConfig: Partial<TenantConfig>) => Promise<void>;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(CURRENT_TENANT);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth(); // Precisamos do profile.id

  useEffect(() => {
    if (profile?.id) {
      loadTenantConfig();
    }
  }, [profile?.id]);

  // Aplicar cores dinâmicas
  useEffect(() => {
    if (config?.branding?.colors) {
      const root = document.documentElement;
      const { primary, accent } = config.branding.colors;

      root.style.setProperty('--primary', primary);
      root.style.setProperty('--ring', primary);
      root.style.setProperty('--sidebar-primary', primary);
      root.style.setProperty('--accent', accent);
      
      // Se houver logo customizado, podemos atualizar o favicon também (opcional)
      if (config.branding.faviconUrl) {
         let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
         if (!link) {
           link = document.createElement('link');
           link.rel = 'icon';
           document.getElementsByTagName('head')[0].appendChild(link);
         }
         link.href = config.branding.faviconUrl;
      }
    }
  }, [config.branding]);

  async function loadTenantConfig() {
    try {
      setLoading(true);

      // Lógica:
      // 1. Se sou Admin, busco MINHA config.
      // 2. Se sou Agente, busco a config do meu CHEFE (profile.created_by).

      let targetOwnerId = profile?.id;

      if (profile?.created_by) {
        // Se eu fui criado por alguém, esse alguém é meu admin/gestor
        targetOwnerId = profile.created_by;
      }

      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'tenant_config')
        .eq('owner_id', targetOwnerId) // Busca específica pelo dono
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig((prev) => ({
          ...prev,
          ...data.value,
          entity: { ...prev.entity, ...(data.value.entity || {}) },
          features: { ...prev.features, ...(data.value.features || {}) },
          ai: { ...prev.ai, ...(data.value.ai || {}) },
        }));
      } else {
        // Se não existe configuração para este usuário, usa o padrão local
        // Não criamos automaticamente no Load para não sujar o banco, criamos no Save.
        console.log("Usando configuração padrão (nenhuma salva no banco).");
      }
    } catch (error) {
      console.error('Erro ao carregar tenant:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateConfig(newConfig: Partial<TenantConfig>) {
    if (!profile?.id) return;

    const updatedFullConfig = { ...config, ...newConfig };
    setConfig(updatedFullConfig);

    try {
      // Ao salvar, SEMPRE salvamos com o ID de quem está logado (Admin)
      // Agentes não devem ter permissão de chamar essa função (bloqueado na UI)
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'tenant_config',
          value: updatedFullConfig,
          owner_id: profile.id, // Vínculo crucial
          updated_at: new Date().toISOString()
        }, { onConflict: 'key,owner_id' }); // Usa a constraint única criada

      if (error) throw error;
      toast.success("Configurações salvas!");

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  }

  return (
    <TenantContext.Provider value={{ config, updateConfig, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
}