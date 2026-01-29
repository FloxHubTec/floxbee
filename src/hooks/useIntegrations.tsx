import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface IntegrationConfig {
    id?: string;
    integration_type: 'whatsapp' | 'openai' | 'smtp' | 'webhook';
    config: Record<string, any>;
    is_active: boolean;
    last_tested_at?: string;
    test_status?: 'success' | 'failed' | 'pending';
    test_error?: string;
}

export function useIntegrations(targetOwnerId?: string) {
    const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useAuth();

    // O ID alvo será o passado por parâmetro (pelo Superadmin) 
    // ou o do próprio perfil (ou seu criador se for agente)
    const effectiveOwnerId = targetOwnerId || (profile?.created_by || profile?.id);

    useEffect(() => {
        if (effectiveOwnerId) {
            loadIntegrations();
        }
    }, [effectiveOwnerId]);

    async function loadIntegrations() {
        if (!effectiveOwnerId) return;

        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('integrations')
                .select('*')
                .eq('owner_id', effectiveOwnerId);

            if (error) throw error;

            setIntegrations(data || []);
        } catch (error) {
            console.error('Erro ao carregar integrações:', error);
            toast.error('Erro ao carregar integrações');
        } finally {
            setLoading(false);
        }
    }

    async function saveIntegration(integration: IntegrationConfig) {
        if (!effectiveOwnerId) return;

        try {
            const { error } = await supabase
                .from('integrations')
                .upsert({
                    owner_id: effectiveOwnerId,
                    integration_type: integration.integration_type,
                    config: integration.config,
                    is_active: integration.is_active,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'owner_id,integration_type' });

            if (error) throw error;

            toast.success('Integração salva com sucesso!');
            await loadIntegrations();
        } catch (error) {
            console.error('Erro ao salvar integração:', error);
            toast.error('Erro ao salvar integração');
            throw error;
        }
    }

    async function testIntegration(type: IntegrationConfig['integration_type']) {
        if (!effectiveOwnerId) return;

        try {
            // Atualizar status para pending
            await supabase
                .from('integrations')
                .update({ test_status: 'pending' })
                .eq('owner_id', effectiveOwnerId)
                .eq('integration_type', type);

            // Simular teste (Pode ser substituído por chamada de API real)
            await new Promise(resolve => setTimeout(resolve, 1000));

            await supabase
                .from('integrations')
                .update({
                    test_status: 'success',
                    last_tested_at: new Date().toISOString(),
                    test_error: null
                })
                .eq('owner_id', effectiveOwnerId)
                .eq('integration_type', type);

            toast.success('Teste realizado com sucesso!');
            await loadIntegrations();
        } catch (error) {
            console.error('Erro ao testar integração:', error);

            await supabase
                .from('integrations')
                .update({
                    test_status: 'failed',
                    test_error: error instanceof Error ? error.message : 'Erro desconhecido'
                })
                .eq('owner_id', effectiveOwnerId)
                .eq('integration_type', type);

            toast.error('Erro ao testar integração');
            await loadIntegrations();
        }
    }

    function getIntegration(type: IntegrationConfig['integration_type']) {
        return integrations.find(i => i.integration_type === type);
    }

    return {
        integrations,
        loading,
        saveIntegration,
        testIntegration,
        getIntegration,
        refreshIntegrations: loadIntegrations,
        effectiveOwnerId
    };
}
