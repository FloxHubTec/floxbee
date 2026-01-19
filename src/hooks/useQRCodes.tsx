import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type QRCode = {
    id: string;
    owner_id: string | null;
    titulo: string;
    descricao: string | null;
    tipo: string;
    dados: any;
    qr_code_url: string | null;
    scans: number;
    ativo: boolean;
    created_at: string;
    updated_at: string;
};

export type QRCodeScan = {
    id: string;
    qr_code_id: string;
    contact_id: string | null;
    user_agent: string | null;
    ip_address: string | null;
    localizacao: any;
    scanned_at: string;
};

// Fetch all QR codes
export const useQRCodes = () => {
    return useQuery({
        queryKey: ['qr-codes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('qr_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as QRCode[];
        },
    });
};

// Fetch single QR code
export const useQRCode = (qrCodeId: string | null) => {
    return useQuery({
        queryKey: ['qr-code', qrCodeId],
        queryFn: async () => {
            if (!qrCodeId) return null;

            const { data, error } = await supabase
                .from('qr_codes')
                .select('*')
                .eq('id', qrCodeId)
                .single();

            if (error) throw error;
            return data as QRCode;
        },
        enabled: !!qrCodeId,
    });
};

// Create QR code
export const useCreateQRCode = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (qrCode: Omit<QRCode, 'id' | 'created_at' | 'updated_at' | 'scans'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user?.id)
                .single();

            const { data, error } = await supabase
                .from('qr_codes')
                .insert({
                    ...qrCode,
                    owner_id: profile?.id,
                    scans: 0,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
        },
    });
};

// Update QR code
export const useUpdateQRCode = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<QRCode> & { id: string }) => {
            const { data, error } = await supabase
                .from('qr_codes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
        },
    });
};

// Delete QR code
export const useDeleteQRCode = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // First delete scans
            await supabase
                .from('qr_code_scans')
                .delete()
                .eq('qr_code_id', id);

            const { error } = await supabase
                .from('qr_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
        },
    });
};

// Fetch QR code scans
export const useQRCodeScans = (qrCodeId: string | null) => {
    return useQuery({
        queryKey: ['qr-code-scans', qrCodeId],
        queryFn: async () => {
            if (!qrCodeId) return [];

            const { data, error } = await supabase
                .from('qr_code_scans')
                .select(`
          *,
          contact:contact_id(id, nome, whatsapp)
        `)
                .eq('qr_code_id', qrCodeId)
                .order('scanned_at', { ascending: false });

            if (error) throw error;
            return data as QRCodeScan[];
        },
        enabled: !!qrCodeId,
    });
};

// Track QR code scan (public - no auth required)
export const useTrackQRCodeScan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            qrCodeId,
            contactId,
            userAgent,
            ipAddress,
        }: {
            qrCodeId: string;
            contactId?: string;
            userAgent?: string;
            ipAddress?: string;
        }) => {
            // Insert scan record
            const { error: scanError } = await supabase
                .from('qr_code_scans')
                .insert({
                    qr_code_id: qrCodeId,
                    contact_id: contactId || null,
                    user_agent: userAgent || null,
                    ip_address: ipAddress || null,
                    localizacao: null,
                });

            if (scanError) throw scanError;

            // Increment scan count
            const { error: updateError } = await supabase.rpc('increment_qr_scan_count', {
                qr_code_id: qrCodeId,
            });

            // If the RPC doesn't exist, use a regular update
            if (updateError) {
                const { data: qrCode } = await supabase
                    .from('qr_codes')
                    .select('scans')
                    .eq('id', qrCodeId)
                    .single();

                if (qrCode) {
                    await supabase
                        .from('qr_codes')
                        .update({ scans: (qrCode.scans || 0) + 1 })
                        .eq('id', qrCodeId);
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['qr-code', variables.qrCodeId] });
            queryClient.invalidateQueries({ queryKey: ['qr-code-scans', variables.qrCodeId] });
        },
    });
};

// Get QR code analytics
export const useQRCodeAnalytics = (qrCodeId: string | null) => {
    return useQuery({
        queryKey: ['qr-code-analytics', qrCodeId],
        queryFn: async () => {
            if (!qrCodeId) return null;

            const { data: scans, error } = await supabase
                .from('qr_code_scans')
                .select('scanned_at, user_agent')
                .eq('qr_code_id', qrCodeId);

            if (error) throw error;

            // Process analytics data
            const scansByDate: Record<string, number> = {};
            const scansByDevice: Record<string, number> = { mobile: 0, desktop: 0, other: 0 };

            scans.forEach((scan) => {
                // Group by date
                const date = new Date(scan.scanned_at).toISOString().split('T')[0];
                scansByDate[date] = (scansByDate[date] || 0) + 1;

                // Group by device type
                const ua = scan.user_agent?.toLowerCase() || '';
                if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
                    scansByDevice.mobile++;
                } else if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) {
                    scansByDevice.desktop++;
                } else {
                    scansByDevice.other++;
                }
            });

            return {
                totalScans: scans.length,
                scansByDate,
                scansByDevice,
                recentScans: scans.slice(0, 10),
            };
        },
        enabled: !!qrCodeId,
    });
};
