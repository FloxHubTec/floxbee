import React, { useState } from 'react';
import {
    QrCode,
    Plus,
    Search,
    MoreHorizontal,
    Download,
    Eye,
    Trash2,
    Edit,
    Loader2,
    BarChart3,
    Copy,
    Check,
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
import { useToast } from '@/hooks/use-toast';
import { useQRCodes, useDeleteQRCode, useCreateQRCode, QRCode as QRCodeType } from '@/hooks/useQRCodes';
import { downloadQRCodePNG, downloadQRCodeSVG, generateQRCodeSVG } from '@/lib/qrCodeGenerator';
import QRCodeGenerator from '@/components/qr-codes/QRCodeGenerator';
import QRCodeAnalytics from '@/components/qr-codes/QRCodeAnalytics';
import FloxBeeLogo from '@/components/FloxBeeLogo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const QRCodes: React.FC = () => {
    const { toast } = useToast();
    const { data: qrCodes = [], isLoading } = useQRCodes();
    const deleteQRCode = useDeleteQRCode();
    const createQRCode = useCreateQRCode();

    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
    const [selectedQRCode, setSelectedQRCode] = useState<QRCodeType | null>(null);
    const [deletingQRCode, setDeletingQRCode] = useState<QRCodeType | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Form state for new QR code
    const [newQRTitle, setNewQRTitle] = useState('');
    const [newQRDescription, setNewQRDescription] = useState('');
    const [generatedDataUrl, setGeneratedDataUrl] = useState('');
    const [generatedTipo, setGeneratedTipo] = useState('');
    const [generatedDados, setGeneratedDados] = useState<any>({});

    // Filter QR codes
    const filteredQRCodes = qrCodes.filter((qr) =>
        qr.titulo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGenerate = (dataUrl: string, tipo: string, dados: any) => {
        setGeneratedDataUrl(dataUrl);
        setGeneratedTipo(tipo);
        setGeneratedDados(dados);
    };

    const handleSaveQRCode = async () => {
        if (!newQRTitle || !generatedDataUrl) {
            toast({
                title: 'Erro',
                description: 'Preencha o título e gere o QR Code',
                variant: 'destructive',
            });
            return;
        }

        try {
            await createQRCode.mutateAsync({
                titulo: newQRTitle,
                descricao: newQRDescription || null,
                tipo: generatedTipo,
                dados: generatedDados,
                qr_code_url: generatedDataUrl,
                ativo: true,
                owner_id: null, // Will be set by hook
            });

            toast({
                title: 'QR Code salvo!',
                description: 'Seu QR Code foi criado com sucesso.',
            });

            // Reset form
            setNewQRTitle('');
            setNewQRDescription('');
            setGeneratedDataUrl('');
            setGeneratedTipo('');
            setGeneratedDados({});
            setShowCreateDialog(false);
        } catch (error) {
            console.error('Error saving QR code:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível salvar o QR Code.',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async () => {
        if (!deletingQRCode) return;

        try {
            await deleteQRCode.mutateAsync(deletingQRCode.id);
            toast({
                title: 'QR Code excluído',
                description: 'O QR Code foi removido com sucesso.',
            });
            setDeletingQRCode(null);
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível excluir o QR Code.',
                variant: 'destructive',
            });
        }
    };

    const handleDownloadPNG = (qr: QRCodeType) => {
        if (qr.qr_code_url) {
            downloadQRCodePNG(qr.qr_code_url, qr.titulo);
            toast({
                title: 'Download iniciado',
                description: `QR Code "${qr.titulo}" em PNG baixado.`,
            });
        }
    };

    const handleCopyLink = (qr: QRCodeType) => {
        const url = window.location.origin + `/qr/${qr.id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(qr.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({
            title: 'Link copiado!',
            description: 'Link de rastreamento copiado para a área de transferência.',
        });
    };

    const getTipoLabel = (tipo: string) => {
        const tipos: Record<string, string> = {
            url: 'URL',
            whatsapp: 'WhatsApp',
            vcard: 'vCard',
            landing_page: 'Landing Page',
            wifi: 'WiFi',
            sms: 'SMS',
            email: 'Email',
        };
        return tipos[tipo] || tipo;
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <FloxBeeLogo size={32} showText={false} />
                    <div>
                        <h1 className="text-2xl font-bold">QR Codes</h1>
                        <p className="text-sm text-muted-foreground">
                            Gere e gerencie QR codes com rastreamento
                        </p>
                    </div>
                </div>
                <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4" />
                    Novo QR Code
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/30">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar QR codes..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Badge variant="secondary">
                    {filteredQRCodes.length} QR code{filteredQRCodes.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* QR Code List */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredQRCodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <QrCode className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum QR Code encontrado</p>
                        <p className="text-sm">Crie seu primeiro QR Code para começar</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredQRCodes.map((qr) => (
                            <Card key={qr.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex flex-col items-center gap-3">
                                        {/* QR Code Image */}
                                        {qr.qr_code_url && (
                                            <div className="w-full aspect-square bg-white rounded-lg p-4 flex items-center justify-center">
                                                <img
                                                    src={qr.qr_code_url}
                                                    alt={qr.titulo}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div className="w-full space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-sm truncate">{qr.titulo}</h3>
                                                    {qr.descricao && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {qr.descricao}
                                                        </p>
                                                    )}
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleDownloadPNG(qr)}>
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Download PNG
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleCopyLink(qr)}>
                                                            {copiedId === qr.id ? (
                                                                <Check className="w-4 h-4 mr-2 text-green-600" />
                                                            ) : (
                                                                <Copy className="w-4 h-4 mr-2" />
                                                            )}
                                                            Copiar Link
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedQRCode(qr);
                                                                setShowAnalyticsDialog(true);
                                                            }}
                                                        >
                                                            <BarChart3 className="w-4 h-4 mr-2" />
                                                            Analytics
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeletingQRCode(qr)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <Badge variant="outline">{getTipoLabel(qr.tipo)}</Badge>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Eye className="w-3 h-3" />
                                                    <span>{qr.scans} scans</span>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-muted-foreground">
                                                Criado em {format(new Date(qr.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                            </p>
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Novo QR Code</DialogTitle>
                        <DialogDescription>
                            Configure e gere seu QR Code com rastreamento
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Título *</label>
                            <Input
                                placeholder="Ex: QR Code WhatsApp Suporte"
                                value={newQRTitle}
                                onChange={(e) => setNewQRTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Descrição (Opcional)</label>
                            <Input
                                placeholder="Breve descrição do QR Code"
                                value={newQRDescription}
                                onChange={(e) => setNewQRDescription(e.target.value)}
                            />
                        </div>

                        <QRCodeGenerator onGenerate={handleGenerate} />

                        <div className="flex gap-2 justify-end pt-4">
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveQRCode} disabled={!generatedDataUrl || !newQRTitle}>
                                Salvar QR Code
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Analytics Dialog */}
            <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Analytics - {selectedQRCode?.titulo}</DialogTitle>
                        <DialogDescription>
                            Estatísticas e rastreamento de scans do QR Code
                        </DialogDescription>
                    </DialogHeader>

                    {selectedQRCode && (
                        <QRCodeAnalytics
                            qrCodeId={selectedQRCode.id}
                            qrCodeTitle={selectedQRCode.titulo}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingQRCode} onOpenChange={() => setDeletingQRCode(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir QR Code?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O QR Code e todos os seus scans serão removidos permanentemente.
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

export default QRCodes;
