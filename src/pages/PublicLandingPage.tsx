import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    Zap,
    Shield,
    Activity,
    Download,
    Check,
    Menu,
    Smartphone,
    LayoutDashboard,
    MessageSquare,
    BarChart3,
    HelpCircle,
    ClipboardCheck,
    Globe,
    FileText,
    FileCode2,
    ShieldCheck,
    Gavel,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    useLandingPageBySlug,
    useSubmitLandingPageForm,
    useTrackLandingPageVisit,
} from '@/hooks/useLandingPages';
import FloxBeeLogo from '@/components/FloxBeeLogo';

const PublicLandingPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { data: landingPage, isLoading, error } = useLandingPageBySlug(slug || null);
    const submitForm = useSubmitLandingPageForm();
    const trackVisit = useTrackLandingPageVisit();

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitted, setSubmitted] = useState(false);
    const [hasTracked, setHasTracked] = useState(false);

    useEffect(() => {
        if (landingPage?.id && !hasTracked) {
            trackVisit.mutate(landingPage.id);
            setHasTracked(true);
        }
    }, [landingPage?.id, hasTracked, trackVisit]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="space-y-4 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground animate-pulse">Carregando experiência institucional...</p>
                </div>
            </div>
        );
    }

    if (error || !landingPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-xl border-dashed">
                    <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <CardHeader className="p-0">
                        <CardTitle className="text-2xl font-bold">Página não encontrada</CardTitle>
                        <p className="text-muted-foreground">A landing page que você está procurando não existe ou foi desativada.</p>
                    </CardHeader>
                    <Button onClick={() => navigate('/')} className="w-full h-12 rounded-full">
                        Voltar ao Início
                    </Button>
                </Card>
            </div>
        );
    }

    // Default institutional content structure (Empty by default to allow generic builder)
    const defaultContent = {
        layout: { primaryColor: '#3b82f6', logoUrl: '' },
        hero: { title: landingPage.titulo || '', subtitle: landingPage.descricao || '', imageUrl: '', videoUrl: '' },
        apresentacao: { title: '', text: '', imageUrl: '', videoUrl: '' },
        funcionalidades: { title: 'Principais Destaques', items: [] },
        detalhes: { title: '', features: [], text: '' },
        legal: { title: '', text: '' },
        operacao: { title: '', text: '' },
        onboarding: { title: '', steps: [] },
        metricas: { title: '', items: [] },
        materiais: { title: '', links: [] },
        cta: { title: 'Pronto para começar?', text: '', benefits: [] }
    };

    // Deep merge function helper
    const mergeDeep = (target: any, source: any) => {
        const output = Object.assign({}, target);
        if (target && source && typeof target === 'object' && typeof source === 'object') {
            Object.keys(source).forEach(key => {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    output[key] = mergeDeep(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    };

    const content = mergeDeep(defaultContent, landingPage.conteudo || {});

    // Media renderer helper
    const renderMedia = (imageUrl?: string, videoUrl?: string, className?: string) => {
        if (videoUrl) {
            const getEmbedUrl = (url: string) => {
                if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
                if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
                if (url.includes('vimeo.com/')) return url.replace('vimeo.com/', 'player.vimeo.com/video/');
                return url;
            };

            return (
                <div className={cn("aspect-video w-full overflow-hidden rounded-2xl shadow-2xl bg-black/5 flex items-center justify-center", className)}>
                    <iframe
                        src={getEmbedUrl(videoUrl)}
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        if (imageUrl) {
            return (
                <div className={cn("relative overflow-hidden rounded-2xl shadow-2xl", className)}>
                    <img
                        src={imageUrl}
                        alt="Hero Media"
                        className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                </div>
            );
        }

        return null;
    };

    const primaryColorHex = content.layout?.primaryColor || '#3b82f6';
    const primaryForegroundHex = content.layout?.primaryForeground || '#ffffff';
    const secondaryColorHex = content.layout?.secondaryColor || '#10b981';
    const secondaryForegroundHex = content.layout?.secondaryForeground || '#ffffff';
    const backgroundColorHex = content.layout?.backgroundColor || '#f9fafb';
    const textColorHex = content.layout?.textColor || '#111827';
    const fontFamily = content.layout?.fontFamily || 'Inter';

    // Helper to convert HEX to HSL for Tailwind compatibility
    const hexToHsl = (hex: string) => {
        if (!hex) return '0 0% 0%';
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const primaryHsl = hexToHsl(primaryColorHex);
    const primaryForegroundHsl = hexToHsl(primaryForegroundHex);
    const secondaryHsl = hexToHsl(secondaryColorHex);
    const secondaryForegroundHsl = hexToHsl(secondaryForegroundHex);
    const backgroundHsl = hexToHsl(backgroundColorHex);
    const textHsl = hexToHsl(textColorHex);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submitForm.mutateAsync({
                landingPageId: landingPage.id,
                dados: formData,
            });
            setSubmitted(true);
            toast({
                title: "Enviado com sucesso!",
                description: "Recebemos suas informações e entraremos em contato em breve.",
            });
        } catch (error) {
            toast({
                title: "Erro ao enviar",
                description: "Ocorreu um problema. Por favor, tente novamente.",
                variant: "destructive",
            });
        }
    };

    return (
        <div
            className="min-h-screen bg-background text-foreground selection:bg-primary/20"
            style={{
                '--primary': primaryHsl,
                '--primary-foreground': primaryForegroundHsl,
                '--secondary': secondaryHsl,
                '--secondary-foreground': secondaryForegroundHsl,
                '--background': backgroundHsl,
                '--foreground': textHsl,
                'fontFamily': fontFamily + ', sans-serif'
            } as React.CSSProperties}
        >
            {/* Dynamic Font Loading */}
            <link
                href={`https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`}
                rel="stylesheet"
            />
            {/* Header / Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {content.layout.logoUrl ? (
                            <img src={content.layout.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                        ) : (
                            <FloxBeeLogo className="w-10 h-10 text-primary" showText={false} />
                        )}
                        <span className="font-bold text-xl tracking-tight">
                            {content.layout.logoUrl ? '' : 'FloxBee'}
                        </span>
                    </div>
                </div>
            </header>

            <main className="pt-20">
                {/* Hero Section */}
                <section className="relative py-20 lg:py-32 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
                    <div className="container mx-auto px-4 relative">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8 text-center lg:text-left">
                                <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-medium border-primary/20 bg-primary/10 text-primary animate-fade-in">
                                    {landingPage.titulo}
                                </Badge>
                                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:leading-[1.1]">
                                    {content.hero.title}
                                </h1>
                                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                                    {content.hero.subtitle}
                                </p>
                            </div>

                            {/* Hero Media */}
                            {(content.hero.imageUrl || content.hero.videoUrl) && (
                                <div className="animate-in fade-in slide-in-from-right duration-1000">
                                    {renderMedia(content.hero.imageUrl, content.hero.videoUrl)}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Apresentação Section */}
                {content.apresentacao?.text && (
                    <section className="py-20 bg-muted/30">
                        <div className="container mx-auto px-4">
                            <div className="grid lg:grid-cols-2 gap-16 items-center">
                                <div className={cn("space-y-6", (content.apresentacao.imageUrl || content.apresentacao.videoUrl) ? "order-2" : "col-span-2 text-center max-w-3xl mx-auto")}>
                                    <h2 className="text-3xl md:text-4xl font-bold">{content.apresentacao.title}</h2>
                                    <div className="w-20 h-1.5 bg-primary rounded-full mx-auto lg:mx-0" />
                                    <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap text-left lg:text-left">
                                        {content.apresentacao.text}
                                    </p>
                                </div>
                                {(content.apresentacao.imageUrl || content.apresentacao.videoUrl) && (
                                    <div className="order-1">
                                        {renderMedia(content.apresentacao.imageUrl, content.apresentacao.videoUrl)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Destaques / Funcionalidades */}
                {content.funcionalidades?.items?.length > 0 && (
                    <section className="py-24">
                        <div className="container mx-auto px-4">
                            <div className="text-center mb-16 space-y-4">
                                <h2 className="text-3xl md:text-5xl font-bold">{content.funcionalidades.title}</h2>
                                <div className="w-24 h-1.5 bg-primary rounded-full mx-auto" />
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {content.funcionalidades.items.map((item: any, idx: number) => (
                                    <Card key={idx} className="group hover:shadow-2xl transition-all duration-500 border-primary/10 hover:border-primary/30 overflow-hidden rounded-3xl">
                                        <CardContent className="p-8 space-y-4">
                                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors duration-500">
                                                <Zap className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-xl font-bold">{item}</h3>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Detalhes Adicionais */}
                {content.detalhes?.text && (
                    <section className="py-24 bg-primary/[0.02]">
                        <div className="container mx-auto px-4">
                            <div className="max-w-4xl mx-auto text-center space-y-8">
                                <h2 className="text-3xl font-bold">{content.detalhes.title}</h2>
                                <p className="text-xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {content.detalhes.text}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Legal & Operação */}
                {(content.legal?.text || content.operacao?.text) && (
                    <section className="py-20 border-y bg-muted/20">
                        <div className="container mx-auto px-4">
                            <div className="grid md:grid-cols-2 gap-12">
                                {content.legal?.text && (
                                    <div className="p-8 rounded-3xl bg-background border border-border/50 shadow-sm space-y-4">
                                        <div className="flex items-center gap-3 text-primary">
                                            <Shield className="w-6 h-6" />
                                            <h3 className="font-bold text-xl">{content.legal.title || "Privacidade & Segurança"}</h3>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">{content.legal.text}</p>
                                    </div>
                                )}
                                {content.operacao?.text && (
                                    <div className="p-8 rounded-3xl bg-background border border-border/50 shadow-sm space-y-4">
                                        <div className="flex items-center gap-3 text-primary">
                                            <Activity className="w-6 h-6" />
                                            <h3 className="font-bold text-xl">{content.operacao.title || "Governança & Operação"}</h3>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">{content.operacao.text}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Onboarding & Métricas */}
                {(content.onboarding?.steps?.length > 0 || content.metricas?.items?.length > 0) && (
                    <section className="py-24 overflow-hidden">
                        <div className="container mx-auto px-4">
                            <div className="grid lg:grid-cols-2 gap-20">
                                {content.onboarding?.steps?.length > 0 && (
                                    <div className="space-y-12">
                                        <h2 className="text-3xl font-bold">{content.onboarding.title || "Como Funciona"}</h2>
                                        <div className="space-y-8 relative">
                                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border lg:block hidden" />
                                            {content.onboarding.steps.map((step: string, idx: number) => (
                                                <div key={idx} className="flex gap-6 relative group">
                                                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold z-10 shrink-0 group-hover:scale-110 transition-transform">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="pt-2">
                                                        <p className="text-xl font-medium">{step}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {content.metricas?.items?.length > 0 && (
                                    <div className="space-y-12">
                                        <h2 className="text-3xl font-bold text-center lg:text-left">{content.metricas.title || "Nossos Números"}</h2>
                                        <div className="grid grid-cols-2 gap-6">
                                            {content.metricas.items.map((item: any, idx: number) => (
                                                <div key={idx} className="p-8 rounded-3xl bg-secondary/5 border border-secondary/10 text-center space-y-2">
                                                    <div className="text-4xl font-extrabold text-secondary">{item.value}</div>
                                                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{item.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Final CTA & Form Section */}
                <section id="contato" className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-right" />
                    <div className="container mx-auto px-4 relative">
                        <div className="max-w-6xl mx-auto bg-background rounded-[40px] shadow-2xl border border-border overflow-hidden grid lg:grid-cols-2">
                            <div className="p-12 lg:p-20 bg-primary text-primary-foreground space-y-8 flex flex-col justify-center">
                                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                                    {content.cta.title}
                                </h2>
                                <p className="text-xl opacity-90 leading-relaxed text-primary-foreground">
                                    {content.cta.text}
                                </p>
                                <div className="pt-4">
                                    <CheckCircle2 className="w-16 h-16 opacity-20" />
                                </div>
                            </div>

                            <div className="p-12 lg:p-20">
                                {submitted ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-500">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-bold">Solicitação Recebida!</h3>
                                            <p className="text-muted-foreground">Em breve nossa equipe entrará em contato com você.</p>
                                        </div>
                                        <Button variant="outline" className="rounded-full" onClick={() => setSubmitted(false)}>
                                            Enviar Novamente
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-4">
                                            {landingPage.form_fields?.map((field: any) => (
                                                <div key={field.name} className="space-y-2">
                                                    <Label htmlFor={field.name}>{field.label} {field.required && '*'}</Label>
                                                    <Input
                                                        id={field.name}
                                                        type={field.type}
                                                        required={field.required}
                                                        placeholder={`Seu ${field.label.toLowerCase()}...`}
                                                        className="h-12 border-muted-foreground/20 focus:border-primary rounded-xl"
                                                        value={formData[field.name] || ''}
                                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/90"
                                            disabled={submitForm.isPending}
                                        >
                                            {submitForm.isPending ? (
                                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                            ) : (
                                                <ArrowRight className="w-6 h-6 mr-2" />
                                            )}
                                            Enviar Agora
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 border-t bg-muted/50">
                <div className="container mx-auto px-4 text-center space-y-6">
                    <div className="flex items-center justify-center gap-2">
                        {content.layout.logoUrl ? (
                            <img src={content.layout.logoUrl} alt="Logo" className="h-8 w-auto opacity-50 grayscale hover:grayscale-0 transition-all" />
                        ) : (
                            <>
                                <FloxBeeLogo className="w-8 h-8 opacity-50 gray-filter" showText={false} />
                                <span className="font-bold text-lg opacity-50">FloxBee</span>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} {content.layout.logoUrl ? '' : 'FloxBee - '}Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default PublicLandingPage;
