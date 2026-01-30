import React, { useState } from 'react';
import {
    FileText,
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    QrCode,
    Download,
    Loader2,
    BarChart3,
    Copy,
    Check,
    ExternalLink,
    Settings,
    X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    useLandingPages,
    useCreateLandingPage,
    useUpdateLandingPage,
    useDeleteLandingPage,
    useLandingPageSubmissions,
    LandingPage as LandingPageType,
} from '@/hooks/useLandingPages';
import FloxBeeLogo from '@/components/FloxBeeLogo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportLandingPageSubmissionsToExcel } from '@/lib/exportExcel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LandingPages: React.FC = () => {
    const { toast } = useToast();
    const { data: landingPages = [], isLoading } = useLandingPages();
    const createLandingPage = useCreateLandingPage();
    const updateLandingPage = useUpdateLandingPage();
    const deleteLandingPage = useDeleteLandingPage();

    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
    const [selectedLandingPage, setSelectedLandingPage] = useState<LandingPageType | null>(null);
    const [deletingLandingPage, setDeletingLandingPage] = useState<LandingPageType | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Form state
    const [titulo, setTitulo] = useState('');
    const [slug, setSlug] = useState('');
    const [descricao, setDescricao] = useState('');
    const [formFields, setFormFields] = useState([
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { name: 'whatsapp', label: 'WhatsApp', type: 'tel', required: true },
        { name: 'email', label: 'Email', type: 'email', required: false },
    ]);
    const [newField, setNewField] = useState({ label: '', type: 'text', required: false });

    // Local text states for list fields to avoid typing issues with commas/spaces
    const [itemsText, setItemsText] = useState('');
    const [stepsText, setStepsText] = useState('');
    const [metricasText, setMetricasText] = useState('');

    // Default structure for dynamic content - Now with generic labels and media support
    const DEFAULT_CONTEUDO = {
        layout: { primaryColor: '#3b82f6', logoUrl: '' },
        hero: { title: '', subtitle: '', imageUrl: '', videoUrl: '' },
        apresentacao: { title: 'Apresentação', text: '', imageUrl: '', videoUrl: '' },
        funcionalidades: { title: 'Destaques & Recursos', items: [] },
        detalhes: { title: 'Detalhes Técnicos', features: [], text: '' },
        legal: { title: 'Segurança & Privacidade', text: '' },
        operacao: { title: 'Operação & Governança', text: '' },
        onboarding: { title: 'Processo de Onboarding', steps: [] },
        metricas: { title: 'Resultados & Métricas', items: [] },
        materiais: { title: 'Documentos & Materiais', links: [] },
        cta: { title: 'Pronto para começar?', text: '', benefits: [] }
    };

    const [conteudo, setConteudo] = useState<any>(DEFAULT_CONTEUDO);

    const updateConteudo = (section: string, data: any) => {
        setConteudo((prev: any) => ({
            ...prev,
            [section]: { ...prev[section], ...data }
        }));
    };

    // Submissions fetching (hook is called inside the component now for the list)
    const { data: submissions = [], isLoading: isLoadingSubmissions } = useLandingPageSubmissions(selectedLandingPage?.id || null);

    const filteredLandingPages = landingPages.filter((lp) =>
        lp.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lp.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const generateSlug = (text: string) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleTituloChange = (value: string) => {
        setTitulo(value);
        if (!slug || slug === generateSlug(titulo)) {
            setSlug(generateSlug(value));
        }
    };

    const resetForm = () => {
        setSelectedLandingPage(null);
        setTitulo('');
        setSlug('');
        setDescricao('');
        setConteudo(DEFAULT_CONTEUDO);
        setFormFields([
            { name: 'nome', label: 'Nome', type: 'text', required: true },
            { name: 'whatsapp', label: 'WhatsApp', type: 'tel', required: true },
            { name: 'email', label: 'Email', type: 'email', required: false },
        ]);
        setItemsText('');
        setStepsText('');
        setMetricasText('');
    };

    const handleSave = async () => {
        if (!titulo || !slug) {
            toast({
                title: 'Erro',
                description: 'Preencha título e slug',
                variant: 'destructive',
            });
            return;
        }

        try {
            // Process local text states back into arrays before saving
            const finalConteudo = {
                ...conteudo,
                funcionalidades: {
                    ...conteudo.funcionalidades,
                    items: itemsText.split(',').map(i => i.trim()).filter(Boolean)
                },
                onboarding: {
                    ...conteudo.onboarding,
                    steps: stepsText.split(',').map(i => i.trim()).filter(Boolean)
                },
                metricas: {
                    ...conteudo.metricas,
                    items: metricasText.split(',').map(part => {
                        const [label, value] = part.split(':').map(s => s.trim());
                        return label && value ? { label, value } : null;
                    }).filter(Boolean)
                }
            };

            const payload = {
                titulo,
                slug,
                descricao,
                conteudo: finalConteudo,
                configuracao: { theme: 'light', primaryColor: '#3b82f6' },
                form_fields: formFields,
                ativo: true,
                template_tipo: 'padrao',
                seo_meta: { title: titulo, description: descricao },
                published_at: selectedLandingPage?.published_at || new Date().toISOString(),
            };

            if (selectedLandingPage) {
                await updateLandingPage.mutateAsync({
                    id: selectedLandingPage.id,
                    ...payload,
                });
                toast({
                    title: 'Landing Page atualizada!',
                    description: 'As alterações foram salvas com sucesso.',
                });
            } else {
                await createLandingPage.mutateAsync(payload);
                toast({
                    title: 'Landing Page criada!',
                    description: `Sua landing page está disponível em /lp/${slug}`,
                });
            }

            setShowCreateDialog(false);
            resetForm();
        } catch (error: any) {
            console.error('Error creating landing page:', error);
            toast({
                title: 'Erro',
                description: error.message?.includes('duplicate')
                    ? 'Este slug já está em uso. Escolha outro.'
                    : 'Não foi possível criar a landing page.',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async () => {
        if (!deletingLandingPage) return;

        try {
            await deleteLandingPage.mutateAsync(deletingLandingPage.id);
            toast({
                title: 'Landing Page excluída',
                description: 'A landing page foi removida com sucesso.',
            });
            setDeletingLandingPage(null);
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível excluir a landing page.',
                variant: 'destructive',
            });
        }
    };

    const handleCopyLink = (lp: LandingPageType) => {
        const url = window.location.origin + `/lp/${lp.slug}`;
        navigator.clipboard.writeText(url);
        setCopiedId(lp.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({
            title: 'Link copiado!',
            description: 'URL da landing page copiada para a área de transferência.',
        });
    };

    const handleEdit = (lp: LandingPageType) => {
        setSelectedLandingPage(lp);
        setTitulo(lp.titulo);
        setSlug(lp.slug);
        setDescricao(lp.descricao || '');
        setFormFields(lp.form_fields || []);

        // Merge with defaults to ensure all sections exist
        const mergedConteudo = { ...DEFAULT_CONTEUDO };
        if (lp.conteudo) {
            Object.keys(lp.conteudo).forEach(key => {
                if (lp.conteudo[key]) {
                    mergedConteudo[key as keyof typeof DEFAULT_CONTEUDO] = {
                        ...mergedConteudo[key as keyof typeof DEFAULT_CONTEUDO],
                        ...lp.conteudo[key]
                    };
                }
            });
        }

        setConteudo(mergedConteudo);

        // Populate local text states
        setItemsText(mergedConteudo.funcionalidades.items?.join(', ') || '');
        setStepsText(mergedConteudo.onboarding.steps?.join(', ') || '');
        setMetricasText(mergedConteudo.metricas.items?.map((i: any) => `${i.label}: ${i.value}`).join(', ') || '');

        setShowCreateDialog(true);
    };


    const handleToggleActive = async (lp: LandingPageType) => {
        try {
            await updateLandingPage.mutateAsync({
                id: lp.id,
                ativo: !lp.ativo,
            });
            toast({
                title: lp.ativo ? 'Landing Page desativada' : 'Landing Page ativada',
                description: `A landing page foi ${lp.ativo ? 'desativada' : 'ativada'}.`,
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível alterar o status.',
                variant: 'destructive',
            });
        }
    };

    const handleAddField = () => {
        if (!newField.label) return;
        const name = generateSlug(newField.label).replace(/-/g, '_');
        setFormFields([...formFields, { ...newField, name }]);
        setNewField({ label: '', type: 'text', required: false });
    };

    const handleRemoveField = (index: number) => {
        // Don't remove default fields if preferred, but here we allow it for full customization
        setFormFields(formFields.filter((_, i) => i !== index));
    };

    const handleExportSubmissions = (lp: LandingPageType) => {
        if (submissions && submissions.length > 0) {
            exportLandingPageSubmissionsToExcel(submissions, lp.titulo);
            toast({
                title: 'Submissões exportadas',
                description: `${submissions.length} submissões exportadas para Excel.`,
            });
        } else {
            toast({
                title: 'Nenhuma submissão',
                description: 'Esta landing page ainda não tem submissões.',
            });
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <FloxBeeLogo size={32} showText={false} />
                    <div>
                        <h1 className="text-2xl font-bold">Landing Pages</h1>
                        <p className="text-sm text-muted-foreground">
                            Crie páginas personalizadas para captura de leads
                        </p>
                    </div>
                </div>
                <Button className="gap-2" onClick={() => {
                    resetForm();
                    setShowCreateDialog(true);
                }}>
                    <Plus className="w-4 h-4" />
                    Nova Landing Page
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/30">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar landing pages..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Badge variant="secondary">
                    {filteredLandingPages.length} landing page{filteredLandingPages.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Landing Pages List */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredLandingPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhuma landing page encontrada</p>
                        <p className="text-sm">Crie sua primeira landing page para começar</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLandingPages.map((lp) => (
                            <Card key={lp.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold truncate">{lp.titulo}</h3>
                                                <p className="text-xs text-muted-foreground truncate">/lp/{lp.slug}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={lp.ativo ? 'default' : 'secondary'}>
                                                    {lp.ativo ? 'Ativa' : 'Inativa'}
                                                </Badge>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => window.open(`/lp/${lp.slug}`, '_blank')}>
                                                            <ExternalLink className="w-4 h-4 mr-2" />
                                                            Visualizar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(lp)}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Editar Conteúdo
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleCopyLink(lp)}>
                                                            {copiedId === lp.id ? (
                                                                <Check className="w-4 h-4 mr-2 text-green-600" />
                                                            ) : (
                                                                <Copy className="w-4 h-4 mr-2" />
                                                            )}
                                                            Copiar Link
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleActive(lp)}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            {lp.ativo ? 'Desativar' : 'Ativar'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedLandingPage(lp);
                                                                setShowSubmissionsDialog(true);
                                                            }}
                                                        >
                                                            <BarChart3 className="w-4 h-4 mr-2" />
                                                            Ver Submissões ({lp.conversoes})
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeletingLandingPage(lp)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        {lp.descricao && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {lp.descricao}
                                            </p>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Visitantes</p>
                                                <p className="text-2xl font-bold">{lp.visitantes}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Conversões</p>
                                                <p className="text-2xl font-bold">{lp.conversoes}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>
                                                Taxa: {lp.visitantes > 0
                                                    ? `${Math.round((lp.conversoes / lp.visitantes) * 100)}%`
                                                    : '0%'}
                                            </span>
                                            <span>
                                                Criada em {format(new Date(lp.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{selectedLandingPage ? 'Editar Landing Page' : 'Nova Landing Page'}</DialogTitle>
                        <DialogDescription>
                            Configure sua landing page institucional e o formulário de captação.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="grid w-full grid-cols-6 mb-4">
                            <TabsTrigger value="geral">Geral & Hero</TabsTrigger>
                            <TabsTrigger value="apresentacao">Apresentação</TabsTrigger>
                            <TabsTrigger value="destaques">Destaques</TabsTrigger>
                            <TabsTrigger value="detalhes">TI & Legal</TabsTrigger>
                            <TabsTrigger value="acao">Sucesso & CTA</TabsTrigger>
                            <TabsTrigger value="form">Formulário</TabsTrigger>
                        </TabsList>

                        <ScrollArea className="h-[60vh] pr-4 mt-2">
                            {/* Aba Geral */}
                            <TabsContent value="geral" className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Título da Página *</Label>
                                        <Input
                                            placeholder="Ex: Cadastro de Servidores"
                                            value={titulo}
                                            onChange={(e) => handleTituloChange(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Slug * (URL única)</Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">/lp/</span>
                                            <Input
                                                placeholder="cadastro-servidores"
                                                value={slug}
                                                onChange={(e) => setSlug(generateSlug(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Descrição Curta (SEO)</Label>
                                    <Textarea
                                        placeholder="Breve descrição da landing page..."
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        rows={2}
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Design & Identidade</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Cor Primária</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    value={conteudo.layout.primaryColor}
                                                    onChange={(e) => updateConteudo('layout', { primaryColor: e.target.value })}
                                                    className="w-12 h-10 p-1 cursor-pointer"
                                                />
                                                <Input
                                                    value={conteudo.layout.primaryColor}
                                                    onChange={(e) => updateConteudo('layout', { primaryColor: e.target.value })}
                                                    placeholder="#3b82f6"
                                                    className="font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>URL do Logo (SVG ou PNG)</Label>
                                            <Input
                                                value={conteudo.layout.logoUrl}
                                                onChange={(e) => updateConteudo('layout', { logoUrl: e.target.value })}
                                                placeholder="https://exemplo.com/logo.png"
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Hero Section (Entrada)</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Título Destaque</Label>
                                            <Input
                                                value={conteudo.hero.title}
                                                onChange={(e) => updateConteudo('hero', { title: e.target.value })}
                                                placeholder="Título grande de destaque"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Subtítulo / Chamada</Label>
                                            <Textarea
                                                value={conteudo.hero.subtitle}
                                                onChange={(e) => updateConteudo('hero', { subtitle: e.target.value })}
                                                placeholder="Texto de apoio abaixo do título"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                                        <div className="space-y-2">
                                            <Label>URL da Imagem (Hero)</Label>
                                            <Input
                                                value={conteudo.hero.imageUrl}
                                                onChange={(e) => updateConteudo('hero', { imageUrl: e.target.value })}
                                                placeholder="https://exemplo.com/hero.jpg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>URL do Vídeo (Embed)</Label>
                                            <Input
                                                value={conteudo.hero.videoUrl}
                                                onChange={(e) => updateConteudo('hero', { videoUrl: e.target.value })}
                                                placeholder="YouTube or Vimeo URL"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Aba Apresentação */}
                            <TabsContent value="apresentacao" className="space-y-6 pt-2">
                                <div className="space-y-3">
                                    <h4 className="font-medium border-b pb-1">Seção de Apresentação</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Título da Seção</Label>
                                            <Input
                                                value={conteudo.apresentacao.title}
                                                onChange={(e) => updateConteudo('apresentacao', { title: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>URL de Mídia (Lateral)</Label>
                                            <Input
                                                value={conteudo.apresentacao.imageUrl || conteudo.apresentacao.videoUrl}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val.includes('youtube.com') || val.includes('vimeo.com') || val.includes('youtu.be')) {
                                                        updateConteudo('apresentacao', { videoUrl: val, imageUrl: '' });
                                                    } else {
                                                        updateConteudo('apresentacao', { imageUrl: val, videoUrl: '' });
                                                    }
                                                }}
                                                placeholder="Imagem ou Vídeo para acompanhar o texto"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Texto Descritivo</Label>
                                        <Textarea
                                            value={conteudo.apresentacao.text}
                                            onChange={(e) => updateConteudo('apresentacao', { text: e.target.value })}
                                            placeholder="Descreva seu projeto, produto ou evento..."
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Aba Destaques */}
                            <TabsContent value="destaques" className="space-y-3 pt-2">
                                <h4 className="font-medium border-b pb-1">Destaques & Recursos</h4>
                                <div className="space-y-2">
                                    <Label>Título da Seção</Label>
                                    <Input
                                        value={conteudo.funcionalidades.title}
                                        onChange={(e) => updateConteudo('funcionalidades', { title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Itens de Destaque (Separados por vírgula)</Label>
                                    <p className="text-[10px] text-muted-foreground">O builder criará cards automáticos para cada item.</p>
                                    <Textarea
                                        placeholder="Ex: Suporte 24h, Design Moderno, Gratuito..."
                                        value={itemsText}
                                        onChange={(e) => setItemsText(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </TabsContent>

                            {/* Aba TI & Legal */}
                            <TabsContent value="detalhes" className="space-y-6 pt-2">
                                <div className="space-y-3">
                                    <h4 className="font-medium border-b pb-1">Informações Adicionais</h4>
                                    <div className="space-y-2">
                                        <Label>Título do Detalhamento</Label>
                                        <Input
                                            value={conteudo.detalhes.title}
                                            onChange={(e) => updateConteudo('detalhes', { title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Descrição Detalhada</Label>
                                        <Textarea
                                            value={conteudo.detalhes.text}
                                            onChange={(e) => updateConteudo('detalhes', { text: e.target.value })}
                                            placeholder="Explique detalhes técnicos, diferenciais ou processos..."
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="font-medium border-b pb-1">Privacidade & Operação</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Políticas & Segurança</Label>
                                            <Textarea
                                                value={conteudo.legal.text}
                                                onChange={(e) => updateConteudo('legal', { text: e.target.value })}
                                                rows={3}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Governança & Gestão</Label>
                                            <Textarea
                                                value={conteudo.operacao.text}
                                                onChange={(e) => updateConteudo('operacao', { text: e.target.value })}
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Aba Métricas & CTA */}
                            <TabsContent value="acao" className="space-y-6 pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="font-medium border-b pb-1">Processo de Onboarding</h4>
                                        <Label className="text-[10px]">Passos (separados por vírgula)</Label>
                                        <Textarea
                                            placeholder="Ex: Contato, Planejamento, Execução..."
                                            value={stepsText}
                                            onChange={(e) => setStepsText(e.target.value)}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-medium border-b pb-1">Métricas de Sucesso</h4>
                                        <Label className="text-[10px]">Formato: Rótulo: Valor</Label>
                                        <Textarea
                                            placeholder="Ex: Crescimento: +200%, Satisfação: 98%"
                                            value={metricasText}
                                            onChange={(e) => setMetricasText(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 border-t pt-4">
                                    <h4 className="font-medium">Call to Action (Fechamento)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Título CTA</Label>
                                            <Input
                                                value={conteudo.cta.title}
                                                onChange={(e) => updateConteudo('cta', { title: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Frase de Convite</Label>
                                            <Input
                                                value={conteudo.cta.text}
                                                onChange={(e) => updateConteudo('cta', { text: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Aba Formulário (Existente re-utilizada) */}
                            <TabsContent value="form" className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label>Campos do Formulário (Otimização de Captação)</Label>
                                    <Badge variant="outline" className="text-[10px]">{formFields.length} Campos</Badge>
                                </div>

                                <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                                    {formFields.map((field, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-background border rounded-md shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{field.label}</Badge>
                                                <span className="text-[10px] text-muted-foreground uppercase">{field.type}</span>
                                                {field.required && <span className="text-[10px] text-destructive">*</span>}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => handleRemoveField(index)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-end gap-2 p-3 border rounded-md bg-accent/5">
                                    <div className="space-y-1 flex-1">
                                        <Label className="text-xs">Novo Campo</Label>
                                        <Input
                                            placeholder="Ex: CPF, Cargo..."
                                            value={newField.label}
                                            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="space-y-1 w-28">
                                        <Label className="text-xs">Tipo</Label>
                                        <Select
                                            value={newField.type}
                                            onValueChange={(v) => setNewField({ ...newField, type: v })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Texto</SelectItem>
                                                <SelectItem value="tel">WhatsApp</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="date">Data</SelectItem>
                                                <SelectItem value="number">Número</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddField}
                                        className="h-8"
                                        disabled={!newField.label}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>

                    <Separator className="my-2" />

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={!titulo || !slug}>
                            {selectedLandingPage ? 'Salvar Alterações' : 'Criar Landing Page'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Submissions Dialog */}
            <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Submissões - {selectedLandingPage?.titulo}</DialogTitle>
                        <DialogDescription>
                            Visualize e exporte as submissões desta landing page
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => selectedLandingPage && handleExportSubmissions(selectedLandingPage)}
                                disabled={submissions.length === 0}
                            >
                                <Download className="w-4 h-4" />
                                Exportar Excel
                            </Button>
                            <Badge variant="secondary">{submissions.length} Total</Badge>
                        </div>

                        {isLoadingSubmissions ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : submissions.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                <p>Nenhuma submissão encontrada para esta página.</p>
                            </div>
                        ) : (
                            <div className="relative overflow-x-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Contato/Nome</TableHead>
                                            <TableHead>Dados Capturados</TableHead>
                                            <TableHead>Origem</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map((sub) => (
                                            <TableRow key={sub.id}>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {format(new Date(sub.created_at), 'dd/MM/yy HH:mm')}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {sub.contact ? (
                                                        <div className="flex flex-col">
                                                            <span>{sub.contact.nome}</span>
                                                            <span className="text-[10px] text-muted-foreground">{sub.contact.whatsapp}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">Desconhecido</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                                                        {Object.entries(sub.dados || {}).map(([key, val]) => (
                                                            <Badge key={key} variant="outline" className="text-[9px] px-1 h-5">
                                                                {key}: {String(val)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-[10px] uppercase">
                                                        {sub.origem || 'Direto'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingLandingPage} onOpenChange={() => setDeletingLandingPage(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Landing Page?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A landing page e todas as suas submissões serão removidas permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default LandingPages;
