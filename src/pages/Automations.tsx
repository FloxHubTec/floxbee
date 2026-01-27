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
  Cake
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAutomations,
  AutomationRuleWithTemplate,
  TRIGGER_TYPES
} from "@/hooks/useAutomations";
import { useTemplates } from "@/hooks/useTemplates";
// CORREÇÃO: Adicionadas chaves { } para importação nomeada
import { AutomationForm } from "@/components/automations/AutomationForm";
import { useAuth } from "@/hooks/useAuth";

const Automations: React.FC = () => {
  const { rules, isLoading, createRule, updateRule, deleteRule, toggleRuleStatus } = useAutomations();
  const { templates } = useTemplates();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRuleWithTemplate | null>(null);

  const filteredRules = rules.filter(rule => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return rule.ativo;
    if (activeTab === "inactive") return !rule.ativo;
    return true;
  });

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

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Ativas</TabsTrigger>
          <TabsTrigger value="inactive">Inativas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Regras Configuradas</CardTitle>
                <Badge variant="secondary" className="font-normal">
                  {filteredRules.length} regras
                </Badge>
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
                    {filteredRules.map((rule) => (
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
          </Card>
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