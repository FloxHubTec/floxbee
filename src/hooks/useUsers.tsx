import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'superadmin' | 'admin' | 'supervisor' | 'agente';

export interface UserWithRole {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
  ativo: boolean | null;
  created_at: string;
  created_by: string | null;
  role: AppRole; // Agora vem direto do profile
  permissions: Record<string, boolean>; // Agora vem direto do profile
}

// Roles visíveis para usuários normais
export const VISIBLE_ROLES: AppRole[] = ['admin', 'supervisor', 'agente'];

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agente: 'Agente',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  superadmin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  supervisor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  agente: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['users-list'], // Chave atualizada
    queryFn: async () => {
      // Busca simplificada: Tudo vem da tabela profiles agora
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
      }

      return data as UserWithRole[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Update direto na tabela profiles
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      // Também invalidamos o cache do usuário atual para refletir mudanças imediatas se eu editar a mim mesmo
      queryClient.invalidateQueries({ queryKey: ['current-user-role'] });
      toast.success('Função atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar função. Verifique suas permissões.');
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('Status do usuário atualizado!');
    },
    onError: (error: any) => {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao atualizar status do usuário.');
    },
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin' || u.role === 'superadmin').length,
    supervisors: users.filter((u) => u.role === 'supervisor').length,
    agents: users.filter((u) => u.role === 'agente').length,
    active: users.filter((u) => u.ativo).length,
    inactive: users.filter((u) => !u.ativo).length,
  };

  return {
    users,
    isLoading,
    error,
    updateRole,
    toggleUserStatus,
    stats,
    refetch
  };
}

// Hook auxiliar atualizado para olhar apenas profiles
export function useCurrentUserRole() {
  return useQuery({
    queryKey: ['current-user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      return data?.role || 'agente';
    },
  });
}