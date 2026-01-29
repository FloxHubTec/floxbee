import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bot,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Zap,
  MessageSquare,
  Clock,
  Users,
  Calendar,
  Ticket,
  Loader2,
  Cake,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAutomations,
  AutomationRuleWithTemplate,
  TRIGGER_TYPES,
  useAutomationStats,
  useAutomationLogs,
  useTodaysBirthdays,
  useUpcomingBirthdays,
  useTriggerBirthdayAutomation
} from "@/hooks/useAutomations";
import { useTemplates } from "@/hooks/useTemplates";
// CORREÇÃO: Adicionadas chaves { } para importação nomeada
import { AutomationForm } from "@/components/automations/AutomationForm";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, History } from "lucide-react";

const Automations: React.FC = () => {
  const { rules, isLoading, createRule, updateRule, deleteRule, toggleRuleStatus } = useAutomations();
  const { templates } = useTemplates();
  const { profile } = useAuth();

  const { data: stats, isLoading: loadingStats } = useAutomationStats();
  const { data: logs = [], isLoading: loadingLogs } = useAutomationLogs(null, 50);
  const { data: todaysBirthdays = [], isLoading: loadingToday } = useTodaysBirthdays();
  const { data: upcomingBirthdays = [], isLoading: loadingUpcoming } = useUpcomingBirthdays(7);
  const triggerBirthday = useTriggerBirthdayAutomation();

  const [activeTab, setActiveTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRuleWithTemplate | null>(null);

  // Estados para Busca, Filtro e Paginação de Regras
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleTypeFilter, setRuleTypeFilter] = useState("all");
  const [rulePage, setRulePage] = useState(1);
  const itemsPerPage = 8;

  // Estados para Busca, Filtro e Paginação de Histórico
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [logPage, setLogPage] = useState(1);

  const filteredRules = rules.filter(rule => {
    // Filtro por Aba (Ativas/Inativas)
    const matchesTab = activeTab === "all" || (activeTab === "active" ? rule.ativo : !rule.ativo);
    if (!matchesTab && !["history", "birthdays"].includes(activeTab)) return false;

    // Filtro por Busca
    const matchesSearch = rule.nome.toLowerCase().includes(ruleSearch.toLowerCase());

    // Filtro por Tipo de Gatilho
    const matchesType = ruleTypeFilter === "all" || (rule.config?.type || rule.tipo) === ruleTypeFilter;

    return matchesSearch && matchesType;
  });

  const paginatedRules = filteredRules.slice((rulePage - 1) * itemsPerPage, rulePage * itemsPerPage);
  const totalRulePages = Math.ceil(filteredRules.length / itemsPerPage);

  const filteredLogs = (logs || []).filter(log => {
    // Filtro por Busca (Nome do contato, WhatsApp, Nome da Regra ou Template)
    const searchLower = logSearch.toLowerCase();
    const contactName = log.contact?.nome || "";
    const contactWhatsApp = log.contact?.whatsapp || "";
    const ruleName = log.rule?.nome || "";

    const matchesSearch =
      contactName.toLowerCase().includes(searchLower) ||
      contactWhatsApp.toLowerCase().includes(searchLower) ||
      ruleName.toLowerCase().includes(searchLower);

    // Filtro por Status
    const matchesStatus = logStatusFilter === "all" || log.status === logStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedLogs = filteredLogs.slice((logPage - 1) * itemsPerPage, logPage * itemsPerPage);
  const totalLogPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const handleCreate = async (data: Partial<AutomationRuleWithTemplate>) => {
    if (!profile?.id) {
      toast.error("Erro de permissão", {
        description: "Não foi possível identificar o usuário logado."
      });
      return;
    }

    try {
      await createRule.mutateAsync({
        ...data,
        created_by: profile.id,
        ativo: true
      });
      toast.success("Automação criada com sucesso!");
      setFormOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar automação");
    }
  };

  const handleUpdate = async (data: Partial<AutomationRuleWithTemplate>) => {
    if (!selectedRule) return;
    try {
      await updateRule.mutateAsync({
        id: selectedRule.id,
        ...data
      });
      toast.success("Automação atualizada com sucesso!");
      setFormOpen(false);
      setSelectedRule(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar automação");
    }
  };

  const handleDelete = async () => {
    if (!selectedRule) return;
    try {
      await deleteRule.mutateAsync(selectedRule.id);
      toast.success("Automação excluída com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedRule(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir automação");
    }
  };

  const handleEditClick = (rule: AutomationRuleWithTemplate) => {
    setSelectedRule(rule);
    setFormOpen(true);
  };

  const handleDeleteClick = (rule: AutomationRuleWithTemplate) => {
    setSelectedRule(rule);
    setDeleteDialogOpen(true);
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'keyword': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'no_response': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'new_contact': return <Users className="w-4 h-4 text-green-500" />;
      case 'schedule': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'ticket_status': return <Ticket className="w-4 h-4 text-red-500" />;
      case 'birthday': return <Cake className="w-4 h-4 text-pink-500" />;
      default: return <Zap className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTriggerLabel = (type: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === type);
    return trigger ? trigger.label : type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-6 bg-background overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Automações
          </h1>
          <p className="text-muted-foreground">
            Gerencie regras automáticas e gatilhos do sistema
          </p>
        </div>
        <Button onClick={() => { setSelectedRule(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Regras Ativas</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : stats?.activeRules || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              De {stats?.totalRules || 0} regras totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Enviadas (30 dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : stats?.sentLast30Days || 0}
            </div>
            <p className="text-xs text-muted-foreground">Mensagens com sucesso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Falhas (30 dias)</CardTitle>
            <Zap className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : stats?.failedLast30Days || 0}
            </div>
            <p className="text-xs text-muted-foreground">Erros de processamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Aniversários Hoje</CardTitle>
            <Cake className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingToday ? <Loader2 className="w-4 h-4 animate-spin" /> : todaysBirthdays.length}
            </div>
            <p className="text-xs text-muted-foreground">Contatos celebrando hoje</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 mb-6 pb-px">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Todas</TabsTrigger>
          <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Ativas</TabsTrigger>
          <TabsTrigger value="inactive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Inativas</TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="birthdays" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 gap-2">
            <Cake className="w-4 h-4" />
            Aniversários
          </TabsTrigger>
        </TabsList>

        {["all", "active", "inactive"].includes(activeTab) && (
          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader className="px-6 py-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-medium">Regras Configuradas</CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {filteredRules.length} regras
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar regra..."
                        className="pl-9 h-9"
                        value={ruleSearch}
                        onChange={(e) => { setRuleSearch(e.target.value); setRulePage(1); }}
                      />
                    </div>
                    <Select value={ruleTypeFilter} onValueChange={(val) => { setRuleTypeFilter(val); setRulePage(1); }}>
                      <SelectTrigger className="h-9 w-full sm:w-48">
                        <div className="flex items-center gap-2">
                          <Filter className="w-3.5 h-3.5" />
                          <SelectValue placeholder="Gatilho" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Gatilhos</SelectItem>
                        {TRIGGER_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Bot className="w-12 h-12 mb-4 opacity-20" />
                    <p>Nenhuma automação encontrada nesta categoria.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Gatilho</TableHead>
                        <TableHead>Template / Ação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {rule.nome}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTriggerIcon(rule.config?.type || rule.tipo)}
                              <span className="text-sm">{getTriggerLabel(rule.config?.type || rule.tipo)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {rule.message_templates ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{rule.message_templates.nome}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Mensagem personalizada</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.ativo}
                              onCheckedChange={() => toggleRuleStatus.mutate({ id: rule.id, ativo: !rule.ativo })}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(rule.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(rule)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(rule)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {totalRulePages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Página {rulePage} de {totalRulePages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRulePage(p => Math.max(1, p - 1))}
                      disabled={rulePage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRulePage(p => Math.min(totalRulePages, p + 1))}
                      disabled={rulePage === totalRulePages}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium">Últimas Execuções</CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {filteredLogs.length} logs
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contato ou regra..."
                      className="pl-9 h-9"
                      value={logSearch}
                      onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                    />
                  </div>
                  <Select value={logStatusFilter} onValueChange={(val) => { setLogStatusFilter(val); setLogPage(1); }}>
                    <SelectTrigger className="h-9 w-full sm:w-48">
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="sucesso">Sucesso</SelectItem>
                      <SelectItem value="erro">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <History className="w-12 h-12 mb-4 opacity-20" />
                  <p>Nenhuma execução registrada ainda.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Regra</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{log.contact?.nome || 'Contato'}</span>
                            <span className="text-xs text-muted-foreground">{log.contact?.whatsapp}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTriggerIcon(log.rule?.tipo)}
                            <span className="text-sm">{log.rule?.nome || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === 'enviado' || log.status === 'sucesso'
                                ? 'default'
                                : 'destructive'
                            }
                            className={
                              log.status === 'enviado' || log.status === 'sucesso'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none'
                                : ''
                            }
                          >
                            {log.status === 'enviado' || log.status === 'sucesso' ? 'Sucesso' : log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {logPage} de {totalLogPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                    disabled={logPage === totalLogPages}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="birthdays" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerBirthday.mutate()}
              disabled={triggerBirthday.isPending}
              className="gap-2"
            >
              {triggerBirthday.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Executar Automação Agora
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Cake className="w-5 h-5 text-pink-500" />
                  Aniversariantes de Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingToday ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : todaysBirthdays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum aniversariante hoje</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaysBirthdays.map((contact: any) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{contact.nome}</p>
                          <p className="text-sm text-muted-foreground">{contact.whatsapp}</p>
                        </div>
                        <Badge variant="outline" className="bg-pink-50 text-pink-600 border-pink-100">Hoje! 🎉</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Próximos 7 Dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUpcoming ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum próximo aniversário</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBirthdays.map((contact: any) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{contact.nome}</p>
                          <p className="text-sm text-muted-foreground">{contact.whatsapp}</p>
                        </div>
                        <Badge variant="secondary">Em {contact.dias_restantes} dias</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AutomationForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelectedRule(null);
        }}
        onSubmit={selectedRule ? handleUpdate : handleCreate}
        isLoading={createRule.isPending || updateRule.isPending}
        rule={selectedRule}
        templates={templates}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Automação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default Automations;