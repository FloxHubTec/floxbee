import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Bot, 
  MessageSquare, 
  Zap, 
  Settings,
  TestTube,
  Activity,
  Server,
  Database
} from "lucide-react";
import { AIChat } from "@/components/ai/AIChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AIService: React.FC = () => {
  const { config, loading: loadingConfig } = useTenant();
  
  // Estado para métricas reais
  const [stats, setStats] = useState({
    totalAiMessages: 0,
    lastActive: null as string | null
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Contexto de teste editável
  const [testContext, setTestContext] = useState({
    servidor_nome: "Maria Oliveira",
    servidor_matricula: "998877",
    servidor_secretaria: "Saúde",
  });

  // Carregar estatísticas reais do banco
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Contar mensagens enviadas pela IA
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_type', 'ia');

        if (error) throw error;

        // Pegar última interação (opcional, apenas para mostrar atividade)
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('sender_type', 'ia')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setStats({
          totalAiMessages: count || 0,
          lastActive: lastMsg?.created_at || null
        });
      } catch (error) {
        console.error("Erro ao carregar estatísticas da IA:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const handleContextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestContext(prev => ({ ...prev, [name]: value }));
  };

  return (
    <ScrollArea className="h-full w-full bg-background">
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Bot className="w-8 h-8 text-primary" />
              Inteligência Artificial
            </h2>
            <p className="text-muted-foreground mt-1">
              Gerencie o comportamento, testes e métricas do assistente virtual {config.ai.aiName}.
            </p>
          </div>
          <Badge variant="outline" className="w-fit px-4 py-1 flex items-center gap-2 border-primary/20 bg-primary/5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium text-primary">Sistema Online</span>
          </Badge>
        </div>

        {/* Tabs Principais */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-2">
              <TestTube className="w-4 h-4" />
              Playground (Teste)
            </TabsTrigger>
          </TabsList>

          {/* ABA: Visão Geral */}
          <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">
            {/* Cards de Status */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              
              {/* Card 1: Modelo */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Modelo Ativo</CardTitle>
                  <Zap className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {loadingConfig ? "..." : config.ai.model || "GPT-4o Mini"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Engine de processamento
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: Identidade */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Identidade</CardTitle>
                  <Bot className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold truncate">
                    {loadingConfig ? "..." : config.ai.aiName}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Função: {config.ai.aiRole}
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: Métricas Reais */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Interações Totais</CardTitle>
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingStats ? "..." : stats.totalAiMessages}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mensagens enviadas pela IA
                  </p>
                </CardContent>
              </Card>

              {/* Card 4: Conexão */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status da API</CardTitle>
                  <Server className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Conectado</div>
                  <p className="text-xs text-muted-foreground">
                    OpenAI Integration Active
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Configurações Atuais */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Parâmetros de Comportamento
                  </CardTitle>
                  <CardDescription>
                    Regras atuais definidas nas configurações do sistema (Tenant).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Organização</Label>
                      <p className="text-sm text-muted-foreground">Entidade representada</p>
                    </div>
                    <span className="font-medium">{config.ai.aiOrganization || "Não definido"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Base de Conhecimento</Label>
                      <p className="text-sm text-muted-foreground">Tópicos principais instruídos</p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                      {config.ai.helpTopics.slice(0, 3).map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {config.ai.helpTopics.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{config.ai.helpTopics.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Recursos Habilitados
                  </CardTitle>
                  <CardDescription>
                    Capacidades ativas para o assistente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 border rounded-lg bg-card flex items-start gap-3">
                      <div className="mt-1 bg-green-100 p-1.5 rounded-full">
                        <Zap className="w-4 h-4 text-green-700" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Transferência Automática</h4>
                        <p className="text-xs text-muted-foreground">
                          Detecta solicitações complexas e transfere para humanos.
                        </p>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg bg-card flex items-start gap-3">
                      <div className="mt-1 bg-blue-100 p-1.5 rounded-full">
                        <Bot className="w-4 h-4 text-blue-700" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Personalização de Contexto</h4>
                        <p className="text-xs text-muted-foreground">
                          Utiliza nome e secretaria do servidor nas respostas.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ABA: Playground */}
          <TabsContent value="playground" className="h-[600px] animate-in fade-in-50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              
              {/* Coluna da Esquerda: Configuração do Cenário */}
              <Card className="lg:col-span-1 border-primary/20 bg-muted/10 h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Cenário de Teste</CardTitle>
                  <CardDescription>
                    Simule dados de um servidor para testar a personalização da resposta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Servidor</Label>
                    <Input 
                      id="nome"
                      name="servidor_nome"
                      value={testContext.servidor_nome} 
                      onChange={handleContextChange}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matricula">Matrícula</Label>
                    <Input 
                      id="matricula"
                      name="servidor_matricula"
                      value={testContext.servidor_matricula} 
                      onChange={handleContextChange}
                      placeholder="Ex: 123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretaria">Secretaria / Setor</Label>
                    <Input 
                      id="secretaria"
                      name="servidor_secretaria"
                      value={testContext.servidor_secretaria} 
                      onChange={handleContextChange}
                      placeholder="Ex: Saúde"
                    />
                  </div>

                  <div className="pt-4 border-t mt-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Log de Sistema
                    </h4>
                    <div className="bg-black/80 text-green-400 p-3 rounded-md text-xs font-mono h-32 overflow-y-auto">
                      <p>{">"} Sistema iniciado...</p>
                      <p>{">"} Contexto carregado: {testContext.servidor_secretaria}</p>
                      <p>{">"} Modelo: {config.ai.model}</p>
                      <p className="animate-pulse">{">"} Aguardando input...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coluna da Direita: Chat */}
              <Card className="lg:col-span-2 h-full flex flex-col shadow-lg border-primary/10">
                <CardHeader className="py-3 px-4 border-b bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{config.ai.aiName} (Modo Teste)</CardTitle>
                        <p className="text-xs text-muted-foreground">Ambiente seguro - nada é salvo no banco</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Preview</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden relative">
                  {/* Componente de Chat Real injetando o contexto */}
                  <div className="absolute inset-0">
                    <AIChat 
                      context={testContext}
                      key={JSON.stringify(testContext)} // Reinicia o chat se o contexto mudar
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};

export default AIService;