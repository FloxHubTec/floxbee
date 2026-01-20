import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  MessageSquare,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Eye,
  Loader2,
  FileText,
  Filter,
  AlertTriangle,
  Download
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FloxBeeLogo from '@/components/FloxBeeLogo';
import { toast as sonnerToast } from 'sonner';
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useSecretarias,
  useTags,
  useContactsCount,
  useContactsByFilter,
  useAddCampaignRecipients,
  useSendCampaign,
  Campaign
} from '@/hooks/useCampaigns';
import { useTemplates, Template, previewTemplate, SAMPLE_VARIABLES } from '@/hooks/useTemplates';
import { useSystemPreferences } from '@/hooks/useSystemPreferences';
import { exportCampaignsToExcel } from '@/lib/exportExcel';

type CampaignStatus = Campaign['status'];

const getStatusConfig = (status: CampaignStatus) => {
  switch (status) {
    case 'concluida':
      return { label: 'Concluída', icon: CheckCircle, color: 'bg-green-500/10 text-green-600' };
    case 'enviando':
      return { label: 'Enviando...', icon: Loader2, color: 'bg-blue-500/10 text-blue-600' };
    case 'agendada':
      return { label: 'Agendada', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600' };
    case 'rascunho':
      return { label: 'Rascunho', icon: MessageSquare, color: 'bg-muted text-muted-foreground' };
    case 'cancelada':
      return { label: 'Cancelada', icon: XCircle, color: 'bg-destructive/10 text-destructive' };
    default:
      return { label: status, icon: MessageSquare, color: 'bg-muted text-muted-foreground' };
  }
};

const Campaigns: React.FC = () => {
  const { toast } = useToast();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { templates } = useTemplates();
  const { data: secretarias = [] } = useSecretarias();
  const { data: allTags = [] } = useTags();
  const { preferences } = useSystemPreferences();
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const addRecipients = useAddCampaignRecipients();
  const sendCampaign = useSendCampaign();

  // List state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [selectedSecretaria, setSelectedSecretaria] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [bypassFrequencyLimit, setBypassFrequencyLimit] = useState(false);

  // Get contacts count based on filter
  const { data: contactsCount = 0 } = useContactsCount({
    secretaria: selectedSecretaria,
    tags: selectedTags,
  });

  const { data: filteredContacts = [] } = useContactsByFilter({
    secretaria: selectedSecretaria,
    tags: selectedTags,
  });

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch =
      campaign.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campaign.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setCampaignMessage(template.conteudo);
    }
  };

  // Reset wizard
  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setCampaignName('');
    setCampaignDescription('');
    setSelectedSecretaria('all');
    setSelectedTags([]);
    setSelectedTemplateId('');
    setCampaignMessage('');
    setScheduleDate('');
    setScheduleTime('');
    setBypassFrequencyLimit(false);
  };

  // Create and send campaign
  const handleSendCampaign = async (schedule: boolean = false) => {
    if (!campaignName || !campaignMessage || filteredContacts.length === 0) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos e selecione destinatários.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Create campaign
      const campaign = await createCampaign.mutateAsync({
        nome: campaignName,
        descricao: campaignDescription,
        mensagem: campaignMessage,
        filtro_secretaria: selectedSecretaria !== 'all' ? selectedSecretaria : null,
        filtro_tags: selectedTags.length > 0 ? selectedTags : [],
        template_id: selectedTemplateId || null,
        status: 'rascunho',
        total_destinatarios: filteredContacts.length,
      });

      // Add recipients
      await addRecipients.mutateAsync({
        campaignId: campaign.id,
        contactIds: filteredContacts.map(c => c.id),
      });

      // Send or schedule with frequency limit settings
      let scheduledAt: Date | undefined;
      if (schedule && scheduleDate && scheduleTime) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      }

      const result = await sendCampaign.mutateAsync({
        campaignId: campaign.id,
        scheduledAt,
        frequencyLimitHours: preferences.frequencyLimitEnabled ? preferences.frequencyLimitHours : 0,
        bypassFrequencyCheck: bypassFrequencyLimit || !preferences.frequencyLimitEnabled,
      });

      const blockedCount = result.summary?.blocked_by_frequency || 0;
      const sentCount = result.summary?.sent || filteredContacts.length;

      toast({
        title: result.scheduled ? 'Campanha agendada!' : 'Campanha enviada!',
        description: result.scheduled
          ? `Será enviada em ${format(scheduledAt!, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
          : blockedCount > 0
            ? `${sentCount} enviadas, ${blockedCount} bloqueadas por limite de frequência.`
            : `${sentCount} mensagens processadas.`,
      });

      resetWizard();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a campanha.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async () => {
    if (!deletingCampaign) return;

    try {
      await deleteCampaign.mutateAsync(deletingCampaign.id);
      toast({
        title: 'Campanha excluída',
        description: 'A campanha foi removida com sucesso.',
      });
      setDeletingCampaign(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a campanha.',
        variant: 'destructive',
      });
    }
  };

  // Export campaigns to Excel
  const handleExportExcel = () => {
    if (!filteredCampaigns || filteredCampaigns.length === 0) {
      toast({
        title: 'Nenhuma campanha para exportar',
        description: 'Não há campanhas para exportar.',
      });
      return;
    }

    try {
      const fileName = exportCampaignsToExcel(filteredCampaigns);
      toast({
        title: 'Campanhas exportadas',
        description: `${filteredCampaigns.length} campanhas exportadas para ${fileName}.`,
      });
    } catch (error) {
      console.error('Erro ao exportar campanhas:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar as campanhas.',
        variant: 'destructive',
      });
    }
  };

  // Wizard View
  if (showWizard) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* Wizard Header */}
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={resetWizard}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Nova Campanha</h1>
              <p className="text-sm text-muted-foreground">Etapa {wizardStep} de 3</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  wizardStep >= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {step}
                </div>
                <span className={cn(
                  "text-sm hidden sm:block",
                  wizardStep >= step ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step === 1 ? 'Audiência' : step === 2 ? 'Mensagem' : 'Revisão'}
                </span>
                {step < 3 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2",
                    wizardStep > step ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Step 1: Audience */}
            {wizardStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Selecione a Audiência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Campanha *</Label>
                    <Input
                      placeholder="Ex: Lembrete de Recadastramento"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Input
                      placeholder="Breve descrição da campanha"
                      value={campaignDescription}
                      onChange={(e) => setCampaignDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filtrar por Secretaria
                    </Label>
                    <Select value={selectedSecretaria} onValueChange={setSelectedSecretaria}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma secretaria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Secretarias</SelectItem>
                        {secretarias.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {allTags.length > 0 && (
                    <div className="space-y-2">
                      <Label>Filtrar por Tags</Label>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                        {allTags.map((tag) => (
                          <div key={tag} className="flex items-center gap-2">
                            <Checkbox
                              id={`tag-${tag}`}
                              checked={selectedTags.includes(tag)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTags([...selectedTags, tag]);
                                } else {
                                  setSelectedTags(selectedTags.filter(t => t !== tag));
                                }
                              }}
                            />
                            <label
                              htmlFor={`tag-${tag}`}
                              className="text-sm cursor-pointer"
                            >
                              {tag}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recipients count */}
                  <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <Users className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-semibold text-lg">{contactsCount} destinatários</p>
                      <p className="text-sm text-muted-foreground">
                        serão alcançados com esta campanha
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Message */}
            {wizardStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Compose sua Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Usar Template (opcional)
                    </Label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.ativo).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem *</Label>
                    <Textarea
                      placeholder="Digite sua mensagem aqui..."
                      className="min-h-[200px] font-mono"
                      value={campaignMessage}
                      onChange={(e) => setCampaignMessage(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <p className="text-sm text-muted-foreground w-full mb-1">
                      Variáveis disponíveis (clique para inserir):
                    </p>
                    {['nome', 'matricula', 'secretaria', 'cargo', 'email'].map((variable) => (
                      <Badge
                        key={variable}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => setCampaignMessage(prev => prev + ` {{${variable}}}`)}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>

                  {campaignMessage && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">
                        Pré-visualização:
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {previewTemplate(campaignMessage, SAMPLE_VARIABLES)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Review */}
            {wizardStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Revisar e Enviar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Nome</span>
                      <span className="text-sm font-medium">{campaignName}</span>
                    </div>
                    {campaignDescription && (
                      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Descrição</span>
                        <span className="text-sm font-medium">{campaignDescription}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Audiência</span>
                      <span className="text-sm font-medium">
                        {selectedSecretaria === 'all'
                          ? 'Todas as secretarias'
                          : secretarias.find(d => d.id === selectedSecretaria)?.name || selectedSecretaria}
                        {selectedTags.length > 0 && ` + ${selectedTags.length} tags`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-sm text-muted-foreground">Destinatários</span>
                      <span className="text-sm font-bold text-primary">{contactsCount} pessoas</span>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Mensagem:</p>
                    <p className="text-sm whitespace-pre-wrap">{campaignMessage}</p>
                  </div>

                  {/* Schedule Option */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Agendar envio (opcional)
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {scheduleDate && scheduleTime ? (
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => handleSendCampaign(true)}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        Agendar para {scheduleDate} às {scheduleTime}
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => handleSendCampaign(false)}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Enviar Agora
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Wizard Footer */}
        <div className="p-4 border-t border-border bg-card">
          <div className="max-w-2xl mx-auto flex justify-between">
            <Button
              variant="outline"
              onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : resetWizard()}
            >
              {wizardStep > 1 ? 'Voltar' : 'Cancelar'}
            </Button>
            {wizardStep < 3 && (
              <Button
                onClick={() => setWizardStep(wizardStep + 1)}
                disabled={
                  (wizardStep === 1 && (!campaignName || contactsCount === 0)) ||
                  (wizardStep === 2 && !campaignMessage)
                }
                className="gap-2"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <FloxBeeLogo size={32} showText={false} />
          <div>
            <h1 className="text-2xl font-bold">Campanhas</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie disparos em massa para seus contatos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={filteredCampaigns.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <Button className="gap-2" onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/30">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="enviando">Enviando</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">
          {filteredCampaigns.length} campanha{filteredCampaigns.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Campaign List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma campanha encontrada</p>
            <p className="text-sm">Crie sua primeira campanha para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => {
              const statusConfig = getStatusConfig(campaign.status);
              const StatusIcon = statusConfig.icon;
              const deliveryRate = campaign.enviados && campaign.enviados > 0
                ? Math.round((campaign.entregues || 0) / campaign.enviados * 100)
                : null;

              return (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">{campaign.nome}</h3>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className={cn(
                              "w-3 h-3 mr-1",
                              campaign.status === 'enviando' && "animate-spin"
                            )} />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        {campaign.descricao && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {campaign.descricao}
                          </p>
                        )}

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-1 font-mono bg-muted/50 p-2 rounded">
                          {campaign.mensagem}
                        </p>

                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {campaign.total_destinatarios} destinatários
                            </span>
                          </div>

                          {campaign.filtro_secretaria && (
                            <div className="flex items-center gap-2">
                              <Filter className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {secretarias.find(d => d.id === campaign.filtro_secretaria)?.name || campaign.filtro_secretaria}
                              </span>
                            </div>
                          )}

                          {campaign.concluido_em && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {format(new Date(campaign.concluido_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                          )}

                          {campaign.agendado_para && campaign.status === 'agendada' && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-yellow-600" />
                              <span className="text-yellow-600">
                                {format(new Date(campaign.agendado_para), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      {campaign.status === 'concluida' && (
                        <div className="text-right ml-6 space-y-1">
                          <p className="text-2xl font-bold text-foreground">{deliveryRate ?? 0}%</p>
                          <p className="text-xs text-muted-foreground">Taxa de entrega</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>{campaign.enviados ?? 0} enviados</span>
                            <span className="text-green-600">{campaign.lidos ?? 0} lidos</span>
                            <span className="text-blue-600">{campaign.respondidos ?? 0} resp.</span>
                            <span className="text-red-600">{campaign.falhas ?? 0} falhas</span>
                          </div>
                        </div>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="ml-2">
                            <MoreHorizontal className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDeletingCampaign(campaign)}>
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCampaign} onOpenChange={(open) => !open && setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a campanha "{deletingCampaign?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Campaigns;
