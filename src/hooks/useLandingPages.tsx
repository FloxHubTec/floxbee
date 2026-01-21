import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LandingPage = {
    id: string;
    owner_id: string | null;
    titulo: string;
    slug: string;
    descricao: string | null;
    conteudo: any;
    configuracao: any;
    form_fields: any[];
    ativo: boolean;
    template_tipo: string;
    seo_meta: any;
    visitantes: number;
    conversoes: number;
    created_at: string;
    updated_at: string;
    published_at: string | null;
};

export type LandingPageSubmission = {
    id: string;
    landing_page_id: string;
    contact_id: string | null;
    dados: any;
    origem: string | null;
    user_agent: string | null;
    ip_address: string | null;
    created_at: string;
};

// Fetch all landing pages
export const useLandingPages = () => {
    return useQuery({
        queryKey: ['landing-pages'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('landing_pages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as LandingPage[];
        },
    });
};

// Fetch single landing page by ID
export const useLandingPage = (landingPageId: string | null) => {
    return useQuery({
        queryKey: ['landing-page', landingPageId],
        queryFn: async () => {
            if (!landingPageId) return null;

            const { data, error } = await supabase
                .from('landing_pages')
                .select('*')
                .eq('id', landingPageId)
                .single();

            if (error) throw error;
            return data as LandingPage;
        },
        enabled: !!landingPageId,
    });
};

// Fetch landing page by slug (public)
export const useLandingPageBySlug = (slug: string | null) => {
    return useQuery({
        queryKey: ['landing-page-slug', slug],
        queryFn: async () => {
            if (!slug) return null;

            const { data, error } = await supabase
                .from('landing_pages')
                .select('*')
                .eq('slug', slug)
                .eq('ativo', true)
                .single();

            if (error) throw error;
            return data as LandingPage;
        },
        enabled: !!slug,
    });
};

// Create landing page
export const useCreateLandingPage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (landingPage: Omit<LandingPage, 'id' | 'created_at' | 'updated_at' | 'visitantes' | 'conversoes'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            const { data, error } = await supabase
                .from('landing_pages')
                .insert({
                    ...landingPage,
                    owner_id: profile?.id,
                    visitantes: 0,
                    conversoes: 0,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
        },
    });
};

// Update landing page
export const useUpdateLandingPage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<LandingPage> & { id: string }) => {
            const { data, error } = await supabase
                .from('landing_pages')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
        },
    });
};

// Delete landing page
export const useDeleteLandingPage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // First delete submissions
            await supabase
                .from('landing_page_submissions')
                .delete()
                .eq('landing_page_id', id);

            const { error } = await supabase
                .from('landing_pages')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
        },
    });
};

// Fetch submissions for a landing page
export const useLandingPageSubmissions = (landingPageId: string | null) => {
    return useQuery({
        queryKey: ['landing-page-submissions', landingPageId],
        queryFn: async () => {
            if (!landingPageId) return [];

            const { data, error } = await supabase
                .from('landing_page_submissions')
                .select(`
          *,
          contact:contact_id(id, nome, whatsapp, email)
        `)
                .eq('landing_page_id', landingPageId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as LandingPageSubmission[];
        },
        enabled: !!landingPageId,
    });
};

// Submit landing page form (public - no auth required)
export const useSubmitLandingPageForm = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            landingPageId,
            dados,
            origem,
        }: {
            landingPageId: string;
            dados: any;
            origem?: string;
        }) => {
            // Get landing page details for owner_id and current stats
            const { data: landingPage } = await supabase
                .from('landing_pages')
                .select('owner_id')
                .eq('id', landingPageId)
                .single();

            // Try to find or create contact
            let contactId = null;

            if (dados.whatsapp || dados.email) {
                // Check if contact exists
                let query = supabase.from('contacts').select('id');

                if (dados.whatsapp) {
                    query = query.eq('whatsapp', dados.whatsapp);
                } else if (dados.email) {
                    query = query.eq('email', dados.email);
                }

                const { data: existingContact } = await query.maybeSingle();

                if (existingContact) {
                    contactId = existingContact.id;
                } else if (dados.nome && (dados.whatsapp || dados.email)) {
                    // Create new contact
                    const { data: newContact } = await supabase
                        .from('contacts')
                        .insert({
                            nome: dados.nome,
                            whatsapp: dados.whatsapp || null,
                            email: dados.email || null,
                            ativo: true,
                            owner_id: landingPage?.owner_id, // Important for multi-tenancy
                        })
                        .select('id')
                        .single();

                    if (newContact) {
                        contactId = newContact.id;
                    }
                }
            }

            // Insert submission
            const { data, error } = await supabase
                .from('landing_page_submissions')
                .insert({
                    landing_page_id: landingPageId,
                    contact_id: contactId,
                    dados,
                    origem: origem || null,
                    user_agent: navigator.userAgent,
                    ip_address: null, // Would need backend to get real IP
                })
                .select()
                .single();

            if (error) throw error;

            // Increment conversions count safely via RPC
            await supabase.rpc('increment_landing_page_conversion', { lp_id: landingPageId });

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['landing-page', variables.landingPageId] });
            queryClient.invalidateQueries({ queryKey: ['landing-page-submissions', variables.landingPageId] });
        },
    });
};

// Track landing page visit (public)
export const useTrackLandingPageVisit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (landingPageId: string) => {
            // Increment visitors count safely via RPC
            await supabase.rpc('increment_landing_page_visit', { lp_id: landingPageId });
        },
        onSuccess: (_, landingPageId) => {
            queryClient.invalidateQueries({ queryKey: ['landing-page', landingPageId] });
        },
    });
};

// Get landing page analytics
export const useLandingPageAnalytics = (landingPageId: string | null) => {
    return useQuery({
        queryKey: ['landing-page-analytics', landingPageId],
        queryFn: async () => {
            if (!landingPageId) return null;

            const { data: submissions, error } = await supabase
                .from('landing_page_submissions')
                .select('created_at, origem')
                .eq('landing_page_id', landingPageId);

            if (error) throw error;

            // Process analytics
            const submissionsByDate: Record<string, number> = {};
            const submissionsBySource: Record<string, number> = { direct: 0, qr_code: 0, campaign: 0, other: 0 };

            submissions.forEach((sub) => {
                // Group by date
                const date = new Date(sub.created_at).toISOString().split('T')[0];
                submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;

                // Group by source
                const source = sub.origem || 'direct';
                if (source in submissionsBySource) {
                    submissionsBySource[source]++;
                } else {
                    submissionsBySource.other++;
                }
            });

            return {
                totalSubmissions: submissions.length,
                submissionsByDate,
                submissionsBySource,
                recentSubmissions: submissions.slice(0, 10),
            };
        },
        enabled: !!landingPageId,
    });
};
