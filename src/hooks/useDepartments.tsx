import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Department = Database['public']['Tables']['departments']['Row'];
type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

export interface DepartmentWithStats extends Department {
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
            return data as Department[];
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
            return data as Department[];
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
            return data as Department;
        },
        enabled: !!id,
    });
};

// Create department
export const useCreateDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (department: Omit<DepartmentInsert, 'id' | 'created_at' | 'updated_at'>) => {
            const { data: { user } } = await supabase.auth.getUser();

            // Get profile ID from auth user ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            const { data, error } = await supabase
                .from('departments')
                .insert({
                    ...department,
                    owner_id: profile?.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
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
        mutationFn: async ({ id, ...updates }: DepartmentUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from('departments')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            queryClient.invalidateQueries({ queryKey: ['department'] });
        },
    });
};

// Delete department (soft delete by setting active = false)
export const useDeleteDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // Soft delete - just set active to false
            const { error } = await supabase
                .from('departments')
                .update({ active: false })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
    });
};

// Toggle department active status
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

// Get departments with contact counts
export const useDepartmentsWithStats = () => {
    return useQuery({
        queryKey: ['departments', 'with-stats'],
        queryFn: async () => {
            // First get all departments
            const { data: departments, error: deptError } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            if (deptError) throw deptError;

            // Then get contact counts for each department
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
