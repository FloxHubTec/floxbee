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
            await createLandingPage.mutateAsync({
                titulo,
                slug,
                descricao,
                conteudo: { hero: { title: titulo, subtitle: descricao } },
                configuracao: { theme: 'light', primaryColor: '#3b82f6' },
                form_fields: formFields,
                ativo: true,
                template_tipo: 'padrao',
                seo_meta: { title: titulo, description: descricao },
                published_at: new Date().toISOString(),
                owner_id: null,
            });

            toast({
                title: 'Landing Page criada!',
                description: `Sua landing page está disponível em /lp/${slug}`,
            });

            setShowCreateDialog(false);
            setTitulo('');
            setSlug('');
            setDescricao('');
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

    const handleExportSubmissions = async (lp: LandingPageType) => {
        try {
            const { data: submissions } = await useLandingPageSubmissions(lp.id);
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
        } catch (error) {
            toast({
                title: 'Erro ao exportar',
                description: 'Não foi possível exportar as submissões.',
                variant: 'destructive',
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
                <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nova Landing Page</DialogTitle>
                        <DialogDescription>
                            Configure sua landing page personalizada
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título *</Label>
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
                            <p className="text-xs text-muted-foreground">
                                URL será: {window.location.origin}/lp/{slug || 'seu-slug'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea
                                placeholder="Breve descrição da landing page"
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Campos do Formulário</Label>
                            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                                {formFields.map((field, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline">{field.label}</Badge>
                                        <span className="text-muted-foreground">({field.type})</span>
                                        {field.required && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Campos padrão: Nome, WhatsApp e Email
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={!titulo || !slug}>
                            Criar Landing Page
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
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => selectedLandingPage && handleExportSubmissions(selectedLandingPage)}
                        >
                            <Download className="w-4 h-4" />
                            Exportar para Excel
                        </Button>

                        <p className="text-sm text-muted-foreground">
                            Lista de submissões será exibida aqui (implementação completa requer componente adicional)
                        </p>
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
