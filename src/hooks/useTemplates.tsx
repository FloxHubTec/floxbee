import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Template = Tables<'message_templates'>;
export type TemplateInsert = TablesInsert<'message_templates'>;
export type TemplateUpdate = TablesUpdate<'message_templates'>;

// Extract variables from template content (e.g., {{nome}}, {{matricula}})
export const extractVariables = (content: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
};

// Preview template with sample data
export const previewTemplate = (content: string, sampleData: Record<string, string>): string => {
  return content.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return sampleData[variable] || match;
  });
};

export const useTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<TemplateInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const variables = extractVariables(template.conteudo);
      const { data, error } = await supabase
        .from('message_templates')
        .insert({ ...template, variaveis: variables })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...template }: TemplateUpdate & { id: string }) => {
      const updateData: TemplateUpdate = { ...template };
      
      if (template.conteudo) {
        updateData.variaveis = extractVariables(template.conteudo);
      }

      const { data, error } = await supabase
        .from('message_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const toggleTemplateStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('message_templates')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateStatus,
  };
};

// Categories for templates
export const TEMPLATE_CATEGORIES = [
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'campanha', label: 'Campanha' },
  { value: 'notificacao', label: 'Notificação' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'boas-vindas', label: 'Boas-vindas' },
  { value: 'outro', label: 'Outro' },
];

// Sample variables for preview
export const SAMPLE_VARIABLES: Record<string, string> = {
  nome: 'João Silva',
  matricula: '12345',
  cargo: 'Analista',
  secretaria: 'Secretaria de Administração',
  email: 'joao@email.com',
  whatsapp: '(11) 99999-9999',
  data: new Date().toLocaleDateString('pt-BR'),
  hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
};
