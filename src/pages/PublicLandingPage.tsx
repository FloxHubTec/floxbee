import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
    useLandingPageBySlug,
    useSubmitLandingPageForm,
    useTrackLandingPageVisit,
} from '@/hooks/useLandingPages';

const PublicLandingPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: landingPage, isLoading, error } = useLandingPageBySlug(slug || null);
    const submitForm = useSubmitLandingPageForm();
    const trackVisit = useTrackLandingPageVisit();

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track visit when landing page loads
    useEffect(() => {
        if (landingPage?.id) {
            trackVisit.mutate(landingPage.id);
        }
    }, [landingPage?.id]);

    const handleInputChange = (fieldName: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [fieldName]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!landingPage) return;

        // Validate required fields
        const requiredFields = landingPage.form_fields?.filter((f: any) => f.required) || [];
        const missingFields = requiredFields.filter((f: any) => !formData[f.name]);

        if (missingFields.length > 0) {
            toast({
                title: 'Campos obrigatórios',
                description: `Por favor, preencha: ${missingFields.map((f: any) => f.label).join(', ')}`,
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await submitForm.mutateAsync({
                landingPageId: landingPage.id,
                dados: formData,
                origem: 'direct',
            });

            setSubmitted(true);
            toast({
                title: 'Enviado com sucesso!',
                description: 'Obrigado pelo seu cadastro. Entraremos em contato em breve.',
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            toast({
                title: 'Erro ao enviar',
                description: 'Não foi possível enviar o formulário. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    // Error state - Landing page not found
    if (error || !landingPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
                        <p className="text-muted-foreground mb-6">
                            A landing page que você está procurando não existe ou foi desativada.
                        </p>
                        <Button onClick={() => navigate('/')}>
                            Voltar ao início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Get theme configuration
    const theme = landingPage.configuracao?.theme || 'light';
    const primaryColor = landingPage.configuracao?.primaryColor || '#3b82f6';

    return (
        <div
            className="min-h-screen"
            style={{
                background: theme === 'dark'
                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            }}
        >
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1
                        className="text-4xl md:text-5xl font-bold mb-4"
                        style={{
                            color: theme === 'dark' ? '#ffffff' : '#1e293b'
                        }}
                    >
                        {landingPage.conteudo?.hero?.title || landingPage.titulo}
                    </h1>
                    {(landingPage.conteudo?.hero?.subtitle || landingPage.descricao) && (
                        <p
                            className="text-lg md:text-xl max-w-2xl mx-auto"
                            style={{
                                color: theme === 'dark' ? '#cbd5e1' : '#475569'
                            }}
                        >
                            {landingPage.conteudo?.hero?.subtitle || landingPage.descricao}
                        </p>
                    )}
                </div>

                {/* Form Section */}
                <Card className="max-w-xl mx-auto shadow-2xl">
                    <CardHeader
                        className="text-center"
                        style={{ backgroundColor: `${primaryColor}10` }}
                    >
                        <CardTitle
                            className="text-2xl"
                            style={{ color: primaryColor }}
                        >
                            {submitted ? 'Cadastro Realizado!' : 'Preencha seus dados'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {submitted ? (
                            <div className="text-center py-8">
                                <CheckCircle2
                                    className="w-20 h-20 mx-auto mb-4"
                                    style={{ color: primaryColor }}
                                />
                                <h3 className="text-xl font-semibold mb-2">
                                    Obrigado pelo seu cadastro!
                                </h3>
                                <p className="text-muted-foreground">
                                    Recebemos suas informações e entraremos em contato em breve.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {landingPage.form_fields?.map((field: any, index: number) => (
                                    <div key={index} className="space-y-2">
                                        <Label htmlFor={field.name}>
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </Label>
                                        <Input
                                            id={field.name}
                                            type={field.type || 'text'}
                                            placeholder={field.placeholder || `Digite seu ${field.label.toLowerCase()}`}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                                            required={field.required}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                ))}

                                <Button
                                    type="submit"
                                    className="w-full text-white"
                                    style={{ backgroundColor: primaryColor }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar Cadastro'
                                    )}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground mt-4">
                                    Ao enviar este formulário, você concorda com nossos termos de uso.
                                </p>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center mt-12">
                    <p
                        className="text-sm"
                        style={{
                            color: theme === 'dark' ? '#94a3b8' : '#64748b'
                        }}
                    >
                        Powered by FloxBee
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicLandingPage;
