import { useState } from 'react';
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
  role: AppRole;
  permissions: Record<string, boolean>;
}

export const VISIBLE_ROLES: AppRole[] = ['admin', 'supervisor', 'agente'];

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agente: 'Agente',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  superadmin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  supervisor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  agente: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

export function useUsers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: usersData = { items: [] as UserWithRole[], total: 0 }, isLoading, error, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('nome');

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
      }

      return {
        items: data as UserWithRole[],
        total: data.length
      };
    },
  });

  const users = usersData.items;

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
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
    refetch,
    page,
    setPage,
    pageSize,
    setPageSize
  };
}

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