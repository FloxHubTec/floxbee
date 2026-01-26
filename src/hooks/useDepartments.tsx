import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Department = Database['public']['Tables']['departments']['Row'];
// Adicionamos a tipagem manual caso o typegen do Supabase ainda não tenha atualizado
type DepartmentRow = Department & { auto_assign_to?: string | null };

export interface DepartmentWithStats extends DepartmentRow {
    contacts_count?: number;
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
        mutationFn: async (values: { name: string; description?: string; active?: boolean; auto_assign_to?: string | null }) => {
            const { error } = await supabase
                .from('departments')
                .insert([{
                    name: values.name,
                    description: values.description,
                    active: values.active,
                    auto_assign_to: values.auto_assign_to // Novo campo
                }]);

            if (error) throw error;
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
        mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; active?: boolean; auto_assign_to?: string | null }) => {
            const { error } = await supabase
                .from('departments')
                .update({
                    name: values.name,
                    description: values.description,
                    active: values.active,
                    auto_assign_to: values.auto_assign_to // Novo campo
                })
                .eq('id', id);

            if (error) throw error;
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
                    const { count } = await supabase
                        .from('contacts')
                        .select('id', { count: 'exact', head: true })
                        .eq('department_id', dept.id)
                        .eq('ativo', true);

                    return {
                        ...dept,
                        contacts_count: count || 0,
                    };
                })
            );

            return departmentsWithStats as DepartmentWithStats[];
        },
    });
};