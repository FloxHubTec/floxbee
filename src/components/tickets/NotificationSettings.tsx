import React, { useState } from 'react';
import {
    Bell,
    Plus,
    Trash2,
    Edit,
    Circle,
    CheckCircle2,
    Loader2,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import {
    useTicketNotificationSettings,
    useCreateTicketNotificationSetting,
    useUpdateTicketNotificationSetting,
    useDeleteTicketNotificationSetting,
    TicketNotificationSetting,
} from '@/hooks/useTicketNotifications';

const EVENTOS = [
    { value: 'status_change', label: 'Mudança de Status' },
    { value: 'assignment', label: 'Atribuição de Responsável' },
    { value: 'new_ticket', label: 'Novo Ticket' },
    { value: 'priority_change', label: 'Mudança de Prioridade' },
];

const STATUS_OPTIONS = [
    { value: 'aberto', label: 'Aberto' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'resolvido', label: 'Resolvido' },
    { value: 'fechado', label: 'Fechado' },
];

const NotificationSettings: React.FC = () => {
    const { toast } = useToast();
    const { data: settings = [], isLoading } = useTicketNotificationSettings();
    const createSetting = useCreateTicketNotificationSetting();
    const updateSetting = useUpdateTicketNotificationSetting();
    const deleteSetting = useDeleteTicketNotificationSetting();

    const [showDialog, setShowDialog] = useState(false);
    const [editingSetting, setEditingSetting] = useState<TicketNotificationSetting | null>(null);
    const [deletingSetting, setDeletingSetting] = useState<TicketNotificationSetting | null>(null);

    // Estados para Filtro e Paginação
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Form state
    const [evento, setEvento] = useState('status_change');
    const [statusOrigem, setStatusOrigem] = useState('');
    const [statusDestino, setStatusDestino] = useState('');
    const [notificarCriador, setNotificarCriador] = useState(true);
    const [notificarResponsavel, setNotificarResponsavel] = useState(true);
    const [mensagemTemplate, setMensagemTemplate] = useState('');
    const [ativo, setAtivo] = useState(true);

    const resetForm = () => {
        setEvento('status_change');
        setStatusOrigem('');
        setStatusDestino('');
        setNotificarCriador(true);
        setNotificarResponsavel(true);
        setMensagemTemplate('');
        setAtivo(true);
        setEditingSetting(null);
    };

    const openDialog = (setting?: TicketNotificationSetting) => {
        if (setting) {
            setEditingSetting(setting);
            setEvento(setting.evento);
            setStatusOrigem(setting.status_origem || '');
            setStatusDestino(setting.status_destino || '');
            setNotificarCriador(setting.notificar_criador);
            setNotificarResponsavel(setting.notificar_responsavel);
            setMensagemTemplate(setting.mensagem_template || '');
            setAtivo(setting.ativo);
        } else {
            resetForm();
        }
        setShowDialog(true);
    };

    const handleSave = async () => {
        try {
            const settingData = {
                evento,
                status_origem: evento === 'status_change' ? statusOrigem : null,
                status_destino: evento === 'status_change' ? statusDestino : null,
                notificar_criador: notificarCriador,
                notificar_responsavel: notificarResponsavel,
                notificar_custom: [],
                mensagem_template: mensagemTemplate || null,
                ativo,
                owner_id: null, // Will be set by the hook
            };

            if (editingSetting) {
                const { owner_id, ...updateData } = settingData;
                await updateSetting.mutateAsync({
                    id: editingSetting.id,
                    ...updateData,
                });
                toast({
                    title: 'Configuração atualizada',
                    description: 'As configurações de notificação foram atualizadas.',
                });
            } else {
                await createSetting.mutateAsync(settingData);
                toast({
                    title: 'Configuração criada',
                    description: 'Nova configuração de notificação criada com sucesso.',
                });
            }

            setShowDialog(false);
            resetForm();
        } catch (error) {
            console.error('Error saving notification setting:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível salvar a configuração.',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async () => {
        if (!deletingSetting) return;

        try {
            await deleteSetting.mutateAsync(deletingSetting.id);
            toast({
                title: 'Configuração excluída',
                description: 'A configuração de notificação foi removida.',
            });
            setDeletingSetting(null);
        } catch (error) {
            console.error('Error deleting notification setting:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível excluir a configuração.',
                variant: 'destructive',
            });
        }
    };

    const toggleActive = async (setting: TicketNotificationSetting) => {
        try {
            await updateSetting.mutateAsync({
                id: setting.id,
                ativo: !setting.ativo,
            });
            toast({
                title: setting.ativo ? 'Notificação desativada' : 'Notificação ativada',
                description: `A regra foi ${setting.ativo ? 'desativada' : 'ativada'}.`,
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível alterar o status.',
                variant: 'destructive',
            });
        }
    };

    const getEventoLabel = (eventoValue: string) => {
        return EVENTOS.find((e) => e.value === eventoValue)?.label || eventoValue;
    };

    const getStatusLabel = (statusValue: string | null) => {
        if (!statusValue) return null;
        return STATUS_OPTIONS.find((s) => s.value === statusValue)?.label || statusValue;
    };

    const filteredSettings = settings.filter(setting => {
        const matchesSearch = getEventoLabel(setting.evento).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (setting.mensagem_template || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' ? setting.ativo : !setting.ativo);

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredSettings.length / itemsPerPage);
    const paginatedSettings = filteredSettings.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notificações de Tickets
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Configure notificações automáticas para eventos de tickets
                    </p>
                </div>
                <Button onClick={() => openDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Regra
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por evento ou mensagem..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <div className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5" />
                            <SelectValue placeholder="Status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        <SelectItem value="active">Ativas</SelectItem>
                        <SelectItem value="inactive">Inativas</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filteredSettings.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Bell className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                        <p className="text-muted-foreground mb-2">Nenhuma regra encontrada</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Tente ajustar seus filtros ou crie uma nova regra.
                        </p>
                        <Button onClick={() => openDialog()} variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Criar Regra
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {paginatedSettings.map((setting) => (
                        <Card key={setting.id}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                {setting.ativo ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-muted-foreground" />
                                                )}
                                                <span className="font-medium">{getEventoLabel(setting.evento)}</span>
                                            </div>
                                            <Badge variant={setting.ativo ? 'default' : 'secondary'}>
                                                {setting.ativo ? 'Ativa' : 'Inativa'}
                                            </Badge>
                                        </div>

                                        {setting.evento === 'status_change' && setting.status_origem && setting.status_destino && (
                                            <p className="text-sm text-muted-foreground mb-2">
                                                {getStatusLabel(setting.status_origem)} → {getStatusLabel(setting.status_destino)}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            {setting.notificar_criador && (
                                                <Badge variant="outline">Criador</Badge>
                                            )}
                                            {setting.notificar_responsavel && (
                                                <Badge variant="outline">Responsável</Badge>
                                            )}
                                        </div>

                                        {setting.mensagem_template && (
                                            <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                                                {setting.mensagem_template}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <Switch
                                            checked={setting.ativo}
                                            onCheckedChange={() => toggleActive(setting)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openDialog(setting)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeletingSetting(setting)}
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSetting ? 'Editar Regra de Notificação' : 'Nova Regra de Notificação'}
                        </DialogTitle>
                        <DialogDescription>
                            Configure quando e quem deve ser notificado sobre eventos de tickets
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Evento</Label>
                            <Select value={evento} onValueChange={setEvento}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENTOS.map((ev) => (
                                        <SelectItem key={ev.value} value={ev.value}>
                                            {ev.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {evento === 'status_change' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Status de Origem</Label>
                                    <Select value={statusOrigem} onValueChange={setStatusOrigem}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Qualquer status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status de Destino</Label>
                                    <Select value={statusDestino} onValueChange={setStatusDestino}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Qualquer status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label>Notificar</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="notificar-criador"
                                    checked={notificarCriador}
                                    onCheckedChange={setNotificarCriador}
                                />
                                <Label htmlFor="notificar-criador" className="cursor-pointer">
                                    Criador do ticket
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="notificar-responsavel"
                                    checked={notificarResponsavel}
                                    onCheckedChange={setNotificarResponsavel}
                                />
                                <Label htmlFor="notificar-responsavel" className="cursor-pointer">
                                    Responsável pelo ticket
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Mensagem Personalizada (Opcional)</Label>
                            <Textarea
                                placeholder="Ex: O ticket #{numero} foi alterado para {status}"
                                value={mensagemTemplate}
                                onChange={(e) => setMensagemTemplate(e.target.value)}
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                                Variáveis disponíveis: {'{numero}'}, {'{titulo}'}, {'{status}'}, {'{responsavel}'}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="ativo"
                                checked={ativo}
                                onCheckedChange={setAtivo}
                            />
                            <Label htmlFor="ativo" className="cursor-pointer">
                                Regra ativa
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            {editingSetting ? 'Atualizar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingSetting} onOpenChange={() => setDeletingSetting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir regra de notificação?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A regra será removida permanentemente.
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

export default NotificationSettings;
