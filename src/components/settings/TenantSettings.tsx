import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Users,
  Bot,
  Settings2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ShieldAlert,
  Lock,
  Zap
} from "lucide-react";
import { CURRENT_TENANT, TenantConfig } from "@/config/tenant";

export default function TenantSettings() {
  const { config, updateConfig } = useTenant();
  const { isAdmin, isSuperadmin } = useAuth();
  const [departments, setDepartments] = useState<string[]>(config.entity.departments);
  const [newDepartment, setNewDepartment] = useState("");
  const [helpTopics, setHelpTopics] = useState<string[]>(config.ai.helpTopics);
  const [newTopic, setNewTopic] = useState("");

  // Apenas admins ou superadmins podem acessar
  if (!isAdmin && !isSuperadmin) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          Apenas usuários administradores podem acessar as configurações do sistema.
        </AlertDescription>
      </Alert>
    );
  }

  const handleSaveEntity = () => {
    updateConfig({
      entity: {
        ...config.entity,
        departments
      }
    });
    toast.success("Configurações de entidade salvas!");
  };

  const handleSaveAI = () => {
    updateConfig({
      ai: {
        ...config.ai,
        helpTopics
      }
    });
    toast.success("Configurações de IA salvas!");
  };

  const handleSaveFeatures = (updates: Partial<TenantConfig['features']>) => {
    updateConfig({ features: { ...config.features, ...updates } });
    toast.success("Módulos atualizados!");
  };

  const handleReset = () => {
    updateConfig(CURRENT_TENANT);
    setDepartments(CURRENT_TENANT.entity.departments);
    setHelpTopics(CURRENT_TENANT.ai.helpTopics);
    toast.success("Configurações restauradas!");
  };

  const addDepartment = () => {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      setDepartments([...departments, newDepartment.trim()]);
      setNewDepartment("");
    }
  };

  const removeDepartment = (dept: string) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const addTopic = () => {
    if (newTopic.trim() && !helpTopics.includes(newTopic.trim())) {
      setHelpTopics([...helpTopics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (topic: string) => {
    setHelpTopics(helpTopics.filter(t => t !== topic));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuração do Sistema</h2>
          <p className="text-muted-foreground">
            Personalize entidades, IA e módulos do sistema
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrões
        </Button>
      </div>

      <Tabs defaultValue="entity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entity" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Entidade</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Módulos</span>
          </TabsTrigger>
        </TabsList>

        {/* Entity Configuration */}
        <TabsContent value="entity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Configuração de Entidade
              </CardTitle>
              <CardDescription>
                Defina como chamar seus contatos e quais campos usar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Entidade (singular)</Label>
                  <Input
                    value={config.entity.entityName}
                    onChange={(e) => updateConfig({
                      entity: { ...config.entity, entityName: e.target.value }
                    })}
                    placeholder="Ex: servidor, cliente, paciente"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Entidade (plural)</Label>
                  <Input
                    value={config.entity.entityNamePlural}
                    onChange={(e) => updateConfig({
                      entity: { ...config.entity, entityNamePlural: e.target.value }
                    })}
                    placeholder="Ex: servidores, clientes, pacientes"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Departamentos/Setores</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Adicionar departamento..."
                    onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                  />
                  <Button onClick={addDepartment} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {departments.map((dept) => (
                    <Badge
                      key={dept}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {dept}
                      <button
                        onClick={() => removeDepartment(dept)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveEntity} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações de Entidade
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Configuração da IA
              </CardTitle>
              <CardDescription>
                Personalize a identidade e comportamento do assistente virtual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Modelo de IA - Restrito ao Superadmin */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Modelo de IA
                  {!isSuperadmin && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                {isSuperadmin ? (
                  <select
                    className="w-full p-3 border rounded-lg bg-background"
                    value={config.ai.model || 'gpt-4o-mini'}
                    onChange={(e) => updateConfig({
                      ai: { ...config.ai, model: e.target.value }
                    })}
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Rápido)</option>
                    <option value="gpt-4o">GPT-4o (Avançado)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">GPT-4o Mini (Rápido)</p>
                      <p className="text-xs text-muted-foreground">
                        Modelo otimizado para velocidade. Contate o suporte para alterar.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Fixo
                    </Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nome da IA</Label>
                  <Input
                    value={config.ai.aiName}
                    onChange={(e) => updateConfig({
                      ai: { ...config.ai, aiName: e.target.value }
                    })}
                    placeholder="Ex: FloxBee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Função da IA</Label>
                  <Input
                    value={config.ai.aiRole}
                    onChange={(e) => updateConfig({
                      ai: { ...config.ai, aiRole: e.target.value }
                    })}
                    placeholder="Ex: assistente virtual"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Input
                    value={config.ai.aiOrganization}
                    onChange={(e) => updateConfig({
                      ai: { ...config.ai, aiOrganization: e.target.value }
                    })}
                    placeholder="Ex: Empresa XYZ"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tópicos de Ajuda</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Adicionar tópico de ajuda..."
                    onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                  />
                  <Button onClick={addTopic} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {helpTopics.map((topic) => (
                    <Badge
                      key={topic}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {topic}
                      <button
                        onClick={() => removeTopic(topic)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tópicos que a IA pode ajudar os usuários
                </p>
              </div>

              <div className="space-y-2">
                <Label>Prompt de Sistema (Instruções para a IA)</Label>
                <textarea
                  className="w-full min-h-[200px] p-3 border rounded-lg bg-background font-mono text-sm resize-y"
                  value={config.ai.systemPromptTemplate}
                  onChange={(e) => updateConfig({
                    ai: { ...config.ai, systemPromptTemplate: e.target.value }
                  })}
                  placeholder="Digite as instruções para a IA..."
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis: {'{'}{'{'} aiName {'}'}{'}'},  {'{'}{'{'} aiRole {'}'}{'}'},  {'{'}{'{'} aiOrganization {'}'}{'}'},  {'{'}{'{'} entityName {'}'}{'}'},  {'{'}{'{'} entityNamePlural {'}'}{'}'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Para listas use: {'{'}{'{'} #helpTopics {'}'}{'}'}...{'{'}{'{'} /helpTopics {'}'}{'}'}
                </p>
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                <Label className="text-sm font-semibold">Preview do Prompt</Label>
                <div className="text-xs whitespace-pre-wrap font-mono bg-background p-3 rounded border max-h-[300px] overflow-y-auto">
                  {(() => {
                    // Generate preview with substituted variables
                    try {
                      const processedPrompt = config.ai.systemPromptTemplate
                        .replace(/\{\{aiName\}\}/g, config.ai.aiName || 'IA')
                        .replace(/\{\{aiRole\}\}/g, config.ai.aiRole || 'assistente')
                        .replace(/\{\{aiOrganization\}\}/g, config.ai.aiOrganization || 'Organização')
                        .replace(/\{\{entityName\}\}/g, config.entity.entityName || 'usuário')
                        .replace(/\{\{entityNamePlural\}\}/g, config.entity.entityNamePlural || 'usuários');

                      // Process help topics loop
                      const topicsRegex = /\{\{#helpTopics\}\}([\s\S]*?)\{\{\/helpTopics\}\}/g;
                      const processedWithTopics = processedPrompt.replace(topicsRegex, (_, template) => {
                        return helpTopics.map(topic => template.replace(/\{\{\.\}\}/g, topic)).join('\n');
                      });

                      return processedWithTopics || "Digite um prompt acima para ver o preview...";
                    } catch (e) {
                      return "Erro ao gerar preview. Verifique a sintaxe do template.";
                    }
                  })()}
                </div>
              </div>

              <Button onClick={handleSaveAI} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações da IA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Módulos do Sistema
              </CardTitle>
              <CardDescription>
                Ative ou desative funcionalidades conforme necessário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Lista de Features - Mantida a mesma lógica */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Tickets de Atendimento</h4>
                    <p className="text-sm text-muted-foreground">
                      Sistema de gestão de chamados e demandas
                    </p>
                  </div>
                  <Switch
                    checked={config.features.enableTickets}
                    onCheckedChange={(checked) => handleSaveFeatures({ enableTickets: checked })}
                  />
                </div>
                {/* Outras features... */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}