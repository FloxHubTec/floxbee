import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Department = Database['public']['Tables']['departments']['Row'];
// Adicionamos a tipagem manual caso o typegen do Supabase ainda não tenha atualizado
type DepartmentRow = Department & { auto_assign_to?: string | null };

export interface DepartmentWithStats extends DepartmentRow {
    contacts_count?: number;
    agents_ids?: string[];
    agents_names?: string[];
}

// Fetch all departments
export const useDepartments = () => {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            if (error) throw error;
            return data as DepartmentRow[];
        },
    });
};

// Fetch active departments only
export const useActiveDepartments = () => {
    return useQuery({
        queryKey: ['departments', 'active'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('active', true)
                .order('name');

            if (error) throw error;
            return data as DepartmentRow[];
        },
    });
};

// Fetch single department
export const useDepartment = (id: string | null) => {
    return useQuery({
        queryKey: ['department', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as DepartmentRow;
        },
        enabled: !!id,
    });
};

// Create department
export const useCreateDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (values: { name: string; description?: string; active?: boolean; auto_assign_to?: string | null; agents_ids?: string[] }) => {
            // Get current user for owner_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Não autenticado");

            const { data: profile } = await supabase
                .from('profiles')
                .select('owner_id')
                .eq('user_id', user.id)
                .single();

            const owner_id = profile?.owner_id;

            // 1. Create department
            const { data: dept, error } = await supabase
                .from('departments')
                .insert([{
                    name: values.name,
                    description: values.description,
                    active: values.active,
                    auto_assign_to: values.auto_assign_to,
                    owner_id
                }])
                .select()
                .single();

            if (error) throw error;

            // 2. Link agents if any
            if (dept && values.agents_ids && values.agents_ids.length > 0) {
                const agentsData = values.agents_ids.map(agentId => ({
                    department_id: dept.id,
                    agent_id: agentId,
                    owner_id
                }));

                const { error: agentsError } = await supabase
                    .from('department_agents')
                    .insert(agentsData);

                if (agentsError) throw agentsError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });
};

// Update department
export const useUpdateDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; active?: boolean; auto_assign_to?: string | null; agents_ids?: string[] }) => {
            // 1. Update department basic info
            const { error } = await supabase
                .from('departments')
                .update({
                    name: values.name,
                    description: values.description,
                    active: values.active,
                    auto_assign_to: values.auto_assign_to
                })
                .eq('id', id);

            if (error) throw error;

            // 2. Sync agents if ids provided
            if (values.agents_ids) {
                // Get current user for owner_id
                const { data: { user } } = await supabase.auth.getUser();
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('owner_id')
                    .eq('user_id', user?.id)
                    .single();

                const owner_id = profile?.owner_id;

                // Delete old links
                await supabase
                    .from('department_agents')
                    .delete()
                    .eq('department_id', id);

                // Insert new ones
                if (values.agents_ids.length > 0) {
                    const agentsData = values.agents_ids.map(agentId => ({
                        department_id: id,
                        agent_id: agentId,
                        owner_id
                    }));

                    const { error: insertError } = await supabase
                        .from('department_agents')
                        .insert(agentsData);

                    if (insertError) throw insertError;
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });
};

export const useDeleteDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });
};

export const useToggleDepartmentStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase
                .from('departments')
                .update({ active })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });
};

export const useDepartmentsWithStats = () => {
    return useQuery({
        queryKey: ['departments', 'with-stats'],
        queryFn: async () => {
            const { data: departments, error: deptError } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            if (deptError) throw deptError;

            const departmentsWithStats = await Promise.all(
                departments.map(async (dept) => {
                    // Fetch contacts count
                    const { count } = await supabase
                        .from('contacts')
                        .select('id', { count: 'exact', head: true })
                        .eq('department_id', dept.id)
                        .eq('ativo', true);

                    // Fetch associated agents with names
                    const { data: agents } = await supabase
                        .from('department_agents')
                        .select(`
                            agent_id,
                            profiles:agent_id (
                                nome
                            )
                        `)
                        .eq('department_id', dept.id);

                    return {
                        ...dept,
                        contacts_count: count || 0,
                        agents_ids: agents?.map(a => a.agent_id) || [],
                        agents_names: agents?.map(a => (a.profiles as any)?.nome).filter(Boolean) || []
                    };
                })
            );

            return departmentsWithStats as DepartmentWithStats[];
        },
    });
};