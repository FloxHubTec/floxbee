import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQRCode, useTrackQRCodeScan } from '@/hooks/useQRCodes';

const PublicQRCodeRedirect: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: qrCode, isLoading, error } = useQRCode(id || null);
    const trackScan = useTrackQRCodeScan();
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        const handleRedirect = async () => {
            if (qrCode && id && !redirecting) {
                setRedirecting(true);

                try {
                    // Track the scan first
                    await trackScan.mutateAsync({
                        qrCodeId: id,
                        userAgent: navigator.userAgent,
                        // ipAddress is handled backend if possible, or null here
                    });

                    // Determine destination
                    let destination = '/';

                    if (qrCode.tipo === 'url' && qrCode.dados?.url) {
                        destination = qrCode.dados.url;
                    } else if (qrCode.tipo === 'landing_page' && qrCode.dados?.landing_page_slug) {
                        // Check if it's a full URL or just a slug
                        const slug = qrCode.dados.landing_page_slug;
                        if (slug.startsWith('http')) {
                            destination = slug;
                        } else {
                            destination = `/lp/${slug}`;
                        }
                    } else if (qrCode.tipo === 'whatsapp' && qrCode.dados?.phone) {
                        const message = qrCode.dados.message ? `?text=${encodeURIComponent(qrCode.dados.message)}` : '';
                        destination = `https://wa.me/${qrCode.dados.phone}${message}`;
                    }

                    // Perform redirection
                    if (destination.startsWith('http')) {
                        window.location.href = destination;
                    } else {
                        navigate(destination);
                    }
                } catch (err) {
                    console.error('Error tracking scan:', err);
                    // Still redirect even if tracking fails, but maybe to a safe place
                    window.location.href = qrCode.dados?.url || '/';
                }
            }
        };

        handleRedirect();
    }, [qrCode, id, navigate, trackScan, redirecting]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Processando QR Code...</p>
                </div>
            </div>
        );
    }

    if (error || !qrCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center pt-10">
                        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
                        <h1 className="text-2xl font-bold mb-4">QR Code Inválido</h1>
                        <p className="text-muted-foreground mb-8">
                            Este QR Code não foi encontrado ou foi desativado.
                        </p>
                        <Button onClick={() => navigate('/')} className="w-full">
                            Ir para a Página Inicial
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Redirecionando...</p>
            </div>
        </div>
    );
};

export default PublicQRCodeRedirect;
