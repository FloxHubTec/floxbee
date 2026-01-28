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
  Download,
  Edit,
  Play,
  Copy,
  Pause,
  RefreshCcw
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FloxBeeLogo from '@/components/FloxBeeLogo';
import {
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSecretarias,
  useTags,
  useContactsCount,
  useContactsByFilter,
  useAddCampaignRecipients,
  useSendCampaign,
  useDuplicateCampaign,
  useUpdateCampaignStatus,
  Campaign
} from '@/hooks/useCampaigns';
import { useTemplates, previewTemplate, SAMPLE_VARIABLES } from '@/hooks/useTemplates';
import { useSystemPreferences } from '@/hooks/useSystemPreferences';
import { exportCampaignsToExcel } from '@/lib/exportExcel';

type CampaignStatus = Campaign['status'];

const getStatusConfig = (status: CampaignStatus) => {
  switch (status) {
    case 'concluida':
    case 'concluido':
      return { label: 'Concluída', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-200' };
    case 'enviando':
      return { label: 'Enviando...', icon: Loader2, color: 'bg-blue-500/10 text-blue-600 border-blue-200 animate-pulse' };
    case 'agendada':
      return { label: 'Agendada', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' };
    case 'rascunho':
      return { label: 'Rascunho', icon: MessageSquare, color: 'bg-secondary text-secondary-foreground border-border' };
    case 'cancelada':
      return { label: 'Cancelada', icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/20' };
    case 'pausada':
      return { label: 'Pausada', icon: Pause, color: 'bg-orange-500/10 text-orange-600 border-orange-200' };
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
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const addRecipients = useAddCampaignRecipients();
  const sendCampaign = useSendCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const updateCampaignStatus = useUpdateCampaignStatus();

  // List state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  // Wizard/Form state
  const [showWizard, setShowWizard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // Filter campaigns list
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch =
      campaign.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campaign.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'concluida' && (campaign.status === 'concluida' || campaign.status === 'concluido')) ||
      campaign.status === statusFilter;

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

  // Helper para pegar o nome TÉCNICO do template
  const getSelectedTemplateName = () => {
    if (!selectedTemplateId) return undefined;
    const template = templates.find(t => t.id === selectedTemplateId);

    // 1. Tenta usar o nome técnico oficial (se existir a coluna no banco)
    if ((template as any).meta_technical_name) {
      return (template as any).meta_technical_name;
    }

    // 2. Se não tiver coluna, tenta usar o nome normal
    // MAS, fazemos uma limpeza para tentar acertar o formato da Meta (snake_case)
    // Ex: "Teste Boas Vindas" -> "teste_boas_vindas"
    if (template?.nome) {
      return template.nome
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_'); // Troca espaços por underline
    }

    return undefined;
  };

  // Reset wizard
  const resetWizard = () => {
    setShowWizard(false);
    setIsEditing(false);
    setEditingId(null);
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

  // Open Edit Mode
  const handleEditCampaign = (campaign: Campaign) => {
    setIsEditing(true);
    setEditingId(campaign.id);
    setCampaignName(campaign.nome);
    setCampaignDescription(campaign.descricao || '');
    setCampaignMessage(campaign.mensagem);

    if (campaign.filtro_secretaria) {
      setSelectedSecretaria(campaign.filtro_secretaria);
    } else {
      setSelectedSecretaria('all');
    }

    if (campaign.filtro_tags && campaign.filtro_tags.length > 0) {
      setSelectedTags(campaign.filtro_tags);
    } else {
      setSelectedTags([]);
    }

    if (campaign.template_id) {
      setSelectedTemplateId(campaign.template_id);
    }

    if (campaign.agendado_para) {
      const date = new Date(campaign.agendado_para);
      setScheduleDate(format(date, 'yyyy-MM-dd'));
      setScheduleTime(format(date, 'HH:mm'));
    } else {
      setScheduleDate('');
      setScheduleTime('');
    }

    setShowWizard(true);
  };

  // Create/Update and send campaign
  const handleSaveOrSend = async (schedule: boolean = false) => {
    if (!campaignName || !campaignMessage) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e a mensagem da campanha.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      let campaignId = editingId;

      // 1. Create or Update Campaign
      const campaignData = {
        nome: campaignName,
        descricao: campaignDescription,
        mensagem: campaignMessage,
        filtro_secretaria: selectedSecretaria !== 'all' ? selectedSecretaria : null,
        filtro_tags: selectedTags.length > 0 ? selectedTags : [],
        template_id: selectedTemplateId || null,
        status: 'rascunho',
        total_destinatarios: filteredContacts.length > 0 ? filteredContacts.length : undefined,
      };

      if (isEditing && campaignId) {
        await updateCampaign.mutateAsync({
          id: campaignId,
          ...campaignData
        });
      } else {
        const newCampaign = await createCampaign.mutateAsync(campaignData);
        campaignId = newCampaign.id;
      }

      if (!campaignId) throw new Error("Falha ao obter ID da campanha");

      // 2. Add recipients
      if (filteredContacts.length > 0) {
        await addRecipients.mutateAsync({
          campaignId: campaignId,
          contactIds: filteredContacts.map(c => c.id),
        });
      }

      // 3. Send or Schedule
      if (schedule) {
        let scheduledAt: Date | undefined;
        if (scheduleDate && scheduleTime) {
          scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
        }

        const isTemplate = !!selectedTemplateId;
        const templateName = getSelectedTemplateName();

        await sendCampaign.mutateAsync({
          campaignId: campaignId,
          scheduledAt,
          frequencyLimitHours: preferences.frequencyLimitEnabled ? preferences.frequencyLimitHours : 0,
          bypassFrequencyCheck: bypassFrequencyLimit || !preferences.frequencyLimitEnabled,
          useTemplateApi: isTemplate,
          templateName: isTemplate ? templateName : undefined,
        });

        toast({
          title: scheduledAt ? 'Campanha agendada!' : 'Campanha enviada!',
          description: scheduledAt
            ? `Será enviada em ${format(scheduledAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
            : `Processo de envio iniciado.`,
        });
      } else {
        toast({
          title: 'Campanha salva!',
          description: 'Rascunho atualizado com sucesso.',
        });
      }

      resetWizard();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a campanha: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Quick Send from List
  const handleSendNow = async (campaign: Campaign) => {
    if (confirm(`Deseja iniciar o envio da campanha "${campaign.nome}" agora?`)) {
      try {
        const isTemplate = !!campaign.template_id;
        let templateName = undefined;

        if (isTemplate) {
          const tmpl = templates.find(t => t.id === campaign.template_id);
          // Mesma lógica de fallback
          if ((tmpl as any)?.meta_technical_name) {
            templateName = (tmpl as any).meta_technical_name;
          } else if (tmpl?.nome) {
            templateName = tmpl.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, '_');
          }
        }

        await sendCampaign.mutateAsync({
          campaignId: campaign.id,
          frequencyLimitHours: preferences.frequencyLimitEnabled ? preferences.frequencyLimitHours : 0,
          useTemplateApi: isTemplate,
          templateName: templateName,
        });
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deletingCampaign) return;
    try {
      await deleteCampaign.mutateAsync(deletingCampaign.id);
      setDeletingCampaign(null);
    } catch (error) { }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      await duplicateCampaign.mutateAsync(campaign.id);
    } catch (error) { }
  };

  const handleUpdateStatus = async (campaign: Campaign, newStatus: string) => {
    try {
      await updateCampaignStatus.mutateAsync({ id: campaign.id, status: newStatus });
    } catch (error) { }
  };

  const handleExportExcel = () => {
    if (!filteredCampaigns || filteredCampaigns.length === 0) {
      toast({ title: 'Nenhuma campanha', description: 'Nada para exportar.' });
      return;
    }
    try {
      const fileName = exportCampaignsToExcel(filteredCampaigns);
      toast({ title: 'Sucesso', description: `Arquivo ${fileName} gerado.` });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha na exportação.', variant: 'destructive' });
    }
  };

  if (showWizard) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-background animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={resetWizard}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
              </h1>
              <p className="text-sm text-muted-foreground">Etapa {wizardStep} de 3</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6 max-w-2xl mx-auto">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  wizardStep >= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {step}
                </div>
                <span className={cn(
                  "text-sm hidden sm:block",
                  wizardStep >= step ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {step === 1 ? 'Público' : step === 2 ? 'Conteúdo' : 'Envio'}
                </span>
                {step < 3 && <div className={cn("flex-1 h-0.5 mx-2", wizardStep > step ? "bg-primary" : "bg-border")} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-secondary/5">
          <div className="max-w-3xl mx-auto">
            {wizardStep === 1 && (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="w-5 h-5 text-primary" />
                    Definir Público Alvo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Nome da Campanha *</Label>
                    <Input placeholder="Ex: Aviso de Feriado" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="text-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Input placeholder="Breve descrição" value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><Filter className="w-4 h-4" /> Filtrar por Departamento</Label>
                      <Select value={selectedSecretaria} onValueChange={setSelectedSecretaria}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Departamentos</SelectItem>
                          {secretarias.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {allTags.length > 0 && (
                      <div className="space-y-3">
                        <Label>Filtrar por Tags</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background min-h-[42px]">
                          {allTags.map((tag) => (
                            <div key={tag} className="flex items-center gap-2">
                              <Checkbox id={`tag-${tag}`} checked={selectedTags.includes(tag)} onCheckedChange={(checked) => checked ? setSelectedTags([...selectedTags, tag]) : setSelectedTags(selectedTags.filter(t => t !== tag))} />
                              <label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer select-none">{tag}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10 mt-6">
                    <div className="p-3 bg-white rounded-full shadow-sm"><Users className="w-6 h-6 text-primary" /></div>
                    <div>
                      <p className="font-bold text-xl text-primary">{contactsCount} Contatos</p>
                      <p className="text-sm text-muted-foreground">atendem aos critérios selecionados.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {wizardStep === 2 && (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Conteúdo da Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Carregar Template (Meta)</Label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                      <SelectTrigger><SelectValue placeholder="Selecione um template..." /></SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.ativo).map((template) => (
                          <SelectItem key={template.id} value={template.id}>{template.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      * Certifique-se que o nome do template no sistema seja igual ao nome técnico na Meta (ex: teste_boas_vindas).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem *</Label>
                    <Textarea placeholder="Conteúdo da mensagem..." className="min-h-[200px] font-sans text-base p-4" value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-bold">Variáveis</Label>
                    <div className="flex flex-wrap gap-2">
                      {['nome', 'matricula', 'secretaria', 'cargo', 'email', 'protocolo'].map((v) => (
                        <Badge key={v} variant="outline" className="cursor-pointer hover:bg-primary hover:text-white" onClick={() => setCampaignMessage(prev => prev + ` {{${v}}}`)}>{`{{${v}}}`}</Badge>
                      ))}
                    </div>
                  </div>
                  {campaignMessage && (
                    <div className="mt-4 p-4 bg-secondary/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground"><Eye className="w-4 h-4" /><span className="text-xs font-bold uppercase">Simulação</span></div>
                      <div className="bg-white p-3 rounded-lg shadow-sm text-sm whitespace-pre-wrap border border-gray-100">{previewTemplate(campaignMessage, SAMPLE_VARIABLES)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {wizardStep === 3 && (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Revisão e Envio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Campanha</p>
                      <p className="font-medium truncate" title={campaignName}>{campaignName}</p>
                    </div>
                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Público</p>
                      <p className="font-medium text-primary">{contactsCount} destinatários</p>
                    </div>
                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Departamento</p>
                      <p className="font-medium truncate">{selectedSecretaria === 'all' ? 'Todos' : secretarias.find(d => d.id === selectedSecretaria)?.name || 'Específico'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Mensagem a ser enviada:</Label>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border text-sm whitespace-pre-wrap italic">"{campaignMessage}"</div>
                  </div>
                  <div className="p-5 border rounded-xl bg-card shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div><h4 className="font-medium">Agendar Disparo?</h4><p className="text-xs text-muted-foreground">Deixe em branco para enviar agora.</p></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
                      <div className="space-y-1.5"><Label>Hora</Label><Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleSaveOrSend(false)} disabled={isSending}>
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />} Salvar Rascunho
                    </Button>
                    <Button className="flex-[2] gap-2" onClick={() => handleSaveOrSend(true)} disabled={isSending}>
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : scheduleDate && scheduleTime ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {scheduleDate && scheduleTime ? `Agendar para ${scheduleDate} às ${scheduleTime}` : 'Enviar Agora'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-card">
          <div className="max-w-3xl mx-auto flex justify-between">
            <Button variant="ghost" onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : resetWizard()}>
              {wizardStep > 1 ? 'Voltar' : 'Cancelar'}
            </Button>
            {wizardStep < 3 && (
              <Button onClick={() => setWizardStep(wizardStep + 1)} disabled={(wizardStep === 1 && (!campaignName || contactsCount === 0)) || (wizardStep === 2 && !campaignMessage)} className="gap-2">
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <FloxBeeLogo size={32} showText={false} />
          <div><h1 className="text-2xl font-bold">Campanhas</h1><p className="text-sm text-muted-foreground">Gerencie disparos em massa.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={filteredCampaigns.length === 0} className="gap-2"><Download className="w-4 h-4" /><span className="hidden sm:inline">Exportar</span></Button>
          <Button className="gap-2 shadow-sm" onClick={() => setShowWizard(true)}><Plus className="w-4 h-4" /> Nova Campanha</Button>
        </div>
      </div>
      <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/30">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar campanhas..." className="pl-9 bg-background" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="enviando">Enviando</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-secondary/5">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4"><MessageSquare className="w-8 h-8 opacity-50" /></div>
            <p className="text-lg font-medium">Nenhuma campanha</p>
            <Button variant="link" onClick={() => setShowWizard(true)} className="mt-2">Criar Campanha</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const statusConfig = getStatusConfig(campaign.status);
              const total = campaign.total_destinatarios || 0;
              const sent = campaign.enviados || 0;
              const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
              return (
                <Card key={campaign.id} className="group hover:shadow-lg transition-all duration-200 border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Badge variant="outline" className={cn("mb-2 gap-1 px-2 py-0.5", statusConfig.color)}>
                          <statusConfig.icon className={cn("w-3 h-3", campaign.status === 'enviando' && "animate-spin")} />
                          {statusConfig.label}
                        </Badge>
                        <h3 className="font-bold text-lg text-foreground line-clamp-1" title={campaign.nome}>{campaign.nome}</h3>
                        {campaign.status === 'agendada' && campaign.agendado_para && (
                          <p className="text-xs text-orange-600 font-medium mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Agendado: {format(new Date(campaign.agendado_para), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {campaign.created_at ? format(new Date(campaign.created_at), "dd 'de' MMMM", { locale: ptBR }) : '-'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-5 h-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {(campaign.status === 'rascunho' || campaign.status === 'agendada' || campaign.status === 'pausada') && (
                            <DropdownMenuItem onClick={() => handleEditCampaign(campaign)}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                          )}

                          {campaign.status === 'rascunho' && (
                            <DropdownMenuItem onClick={() => handleSendNow(campaign)}>
                              <Play className="w-4 h-4 mr-2 text-green-600" /> Enviar Agora
                            </DropdownMenuItem>
                          )}

                          {(campaign.status === 'agendada' || campaign.status === 'enviando') && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(campaign, 'pausada')}>
                              <Pause className="w-4 h-4 mr-2 text-orange-600" /> Pausar
                            </DropdownMenuItem>
                          )}

                          {campaign.status === 'pausada' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(campaign, 'rascunho')}>
                              <RefreshCcw className="w-4 h-4 mr-2 text-blue-600" /> Retomar (Rascunho)
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicar
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingCampaign(campaign)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg mb-4 border border-border/50"><p className="text-sm text-muted-foreground line-clamp-2 font-medium italic">"{campaign.mensagem}"</p></div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-muted-foreground" title="Público Alvo"><Users className="w-4 h-4" /><span>{total}</span></div>
                      {campaign.status === 'concluida' || campaign.status === 'enviando' ? (
                        <div className="flex items-center gap-1.5 text-green-600 font-medium" title="Enviados"><CheckCircle className="w-4 h-4" /><span>{sent} ({successRate}%)</span></div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-orange-600 font-medium" title="Pendente"><Clock className="w-4 h-4" /><span>Pendente</span></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <AlertDialog open={!!deletingCampaign} onOpenChange={(open) => !open && setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir campanha?</AlertDialogTitle><AlertDialogDescription>Tem certeza? A ação é irreversível.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive hover:bg-destructive/90">Excluir Definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Campaigns;