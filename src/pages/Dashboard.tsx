import React from 'react';
import {
  MessageSquare,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Ticket,
  Megaphone,
  Loader2,
  Send,
  Eye,
  MessageCircle,
  BarChart3,
  Download,
  Calendar,
  Filter,
  User,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FloxBeeLogo from '@/components/FloxBeeLogo';
import {
  useDashboardMetrics,
  useTicketsByStatus,
  useMessagesOverTime,
  useRecentActivity,
  useActiveAgents,
  useCampaignsSummary,
} from '@/hooks/useDashboard';
import { useTenant } from '@/hooks/useTenant';
import { exportDashboardToPDF } from '@/lib/exportPDF';
import { toast } from 'sonner';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const Dashboard: React.FC = () => {
  const { config } = useTenant();
  const [dateRange, setDateRange] = React.useState({
    from: startOfDay(new Date()).toISOString(),
    to: endOfDay(new Date()).toISOString(),
  });
  const [selectedAgent, setSelectedAgent] = React.useState<string>('all');
  const [agentsPage, setAgentsPage] = React.useState(1);
  const [activityPage, setActivityPage] = React.useState(1);
  const itemsPerPage = 5;

  const filters = {
    startDate: dateRange.from,
    endDate: dateRange.to,
    agentId: selectedAgent === 'all' ? undefined : selectedAgent,
  };

  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(filters);
  const { data: ticketsByStatus = [] } = useTicketsByStatus(filters);
  const { data: messagesOverTime = [] } = useMessagesOverTime(filters);
  const { data: recentActivity = [] } = useRecentActivity({ agentId: filters.agentId });
  const { data: activeAgents = [] } = useActiveAgents();
  const { data: campaignsSummary } = useCampaignsSummary({ startDate: filters.startDate, endDate: filters.endDate });

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    const date = type === 'from' ? startOfDay(new Date(value)) : endOfDay(new Date(value));
    setDateRange(prev => ({ ...prev, [type]: date.toISOString() }));
  };

  const clearFilters = () => {
    setDateRange({
      from: startOfDay(new Date()).toISOString(),
      to: endOfDay(new Date()).toISOString(),
    });
    setSelectedAgent('all');
  };

  const handleExportPDF = async () => {
    if (!metrics || !campaignsSummary) {
      toast.error('Aguarde os dados carregarem antes de exportar');
      return;
    }

    try {
      const fileName = await exportDashboardToPDF({
        metrics,
        campaignsSummary,
        ticketsByStatus,
        activeAgents,
        branding: config.branding,
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          agentName: selectedAgent !== 'all' ? activeAgents.find(a => a.id === selectedAgent)?.nome : undefined,
        }
      });
      toast.success(`Dashboard exportado: ${fileName}`);
    } catch (error) {
      console.error('Erro ao exportar dashboard:', error);
      toast.error('Erro ao exportar dashboard');
    }
  };

  const kpiData = [
    {
      title: 'Atendimentos Hoje',
      value: metrics?.conversationsToday ?? 0,
      change: metrics?.conversationsChange ?? 0,
      icon: MessageSquare,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Mensagens Hoje',
      value: metrics?.messagesToday ?? 0,
      change: null,
      icon: Send,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Tickets Abertos',
      value: metrics?.openTickets ?? 0,
      change: null,
      icon: Ticket,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Resolvidos Hoje',
      value: metrics?.resolvedToday ?? 0,
      change: metrics?.resolvedChange ?? 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket_resolved':
      case 'conversation_resolved':
        return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'ticket_created':
        return { icon: Ticket, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
      case 'conversation_started':
        return { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' };
      default:
        return { icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  const TICKET_COLORS = ['hsl(var(--primary))', '#eab308', '#ef4444', '#22c55e'];

  return (
    <div className="h-full overflow-auto bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <FloxBeeLogo size={32} />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral do atendimento</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={metricsLoading}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {metricsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap items-end gap-4 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Data Inicial
          </label>
          <Input
            type="date"
            value={dateRange.from.split('T')[0]}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Data Final
          </label>
          <Input
            type="date"
            value={dateRange.to.split('T')[0]}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
            <User className="w-3 h-3" /> Filtrar por Atendente
          </label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos os Atendentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Atendentes</SelectItem>
              {activeAgents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(selectedAgent !== 'all' || dateRange.from.split('T')[0] !== new Date().toISOString().split('T')[0]) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground hover:text-foreground gap-1">
            <X className="w-4 h-4" /> Limpar
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {metricsLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      kpi.value.toLocaleString('pt-BR')
                    )}
                  </p>
                  {kpi.change !== null && (
                    <p className={`text-sm mt-1 flex items-center gap-1 ${kpi.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                      {kpi.change >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {kpi.change >= 0 ? '+' : ''}{kpi.change}% vs ontem
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${kpi.bgColor}`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-primary/10">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{metrics?.totalContacts?.toLocaleString('pt-BR') ?? 0}</p>
                <p className="text-sm text-muted-foreground">Contatos cadastrados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-purple-500/10">
                <Megaphone className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{campaignsSummary?.totalEnviados?.toLocaleString('pt-BR') ?? 0}</p>
                <p className="text-sm text-muted-foreground">
                  Mensagens enviadas ({campaignsSummary?.concluidas ?? 0} campanhas)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-green-500/10">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{campaignsSummary?.deliveryRate ?? 0}%</p>
                <p className="text-sm text-muted-foreground">Taxa de entrega</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-blue-500/10">
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{campaignsSummary?.readRate ?? 0}%</p>
                <p className="text-sm text-muted-foreground">
                  Taxa de leitura ({campaignsSummary?.totalLidos ?? 0} lidas)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-orange-500/10">
                <MessageCircle className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{campaignsSummary?.responseRate ?? 0}%</p>
                <p className="text-sm text-muted-foreground">
                  Taxa de resposta ({campaignsSummary?.totalRespondidos ?? 0})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Metrics Funnel */}
      <Card className="mb-6 border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Funil de Mensagens (Campanhas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            {campaignsSummary && campaignsSummary.totalEnviados > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Enviadas', value: campaignsSummary.totalEnviados, fill: 'hsl(var(--primary))' },
                    { name: 'Entregues', value: campaignsSummary.totalEntregues, fill: 'hsl(142, 71%, 45%)' },
                    { name: 'Lidas', value: campaignsSummary.totalLidos, fill: 'hsl(217, 91%, 60%)' },
                    { name: 'Respondidas', value: campaignsSummary.totalRespondidos, fill: 'hsl(25, 95%, 53%)' },
                    { name: 'Falhas', value: campaignsSummary.totalFalhas, fill: 'hsl(0, 84%, 60%)' },
                  ]}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      const total = campaignsSummary.totalEnviados;
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                      return [`${value.toLocaleString('pt-BR')} (${percentage}%)`, name];
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: 'Enviadas', fill: 'hsl(var(--primary))' },
                      { name: 'Entregues', fill: 'hsl(142, 71%, 45%)' },
                      { name: 'Lidas', fill: 'hsl(217, 91%, 60%)' },
                      { name: 'Respondidas', fill: 'hsl(25, 95%, 53%)' },
                      { name: 'Falhas', fill: 'hsl(0, 84%, 60%)' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma campanha enviada ainda</p>
                </div>
              </div>
            )}
          </div>
          {campaignsSummary && campaignsSummary.totalEnviados > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-4 text-center text-xs">
              <div className="p-2 rounded-lg bg-primary/10">
                <p className="font-semibold text-primary">{campaignsSummary.totalEnviados.toLocaleString('pt-BR')}</p>
                <p className="text-muted-foreground">Enviadas</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <p className="font-semibold text-green-500">{campaignsSummary.totalEntregues.toLocaleString('pt-BR')}</p>
                <p className="text-muted-foreground">Entregues</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <p className="font-semibold text-blue-500">{campaignsSummary.totalLidos.toLocaleString('pt-BR')}</p>
                <p className="text-muted-foreground">Lidas</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <p className="font-semibold text-orange-500">{campaignsSummary.totalRespondidos.toLocaleString('pt-BR')}</p>
                <p className="text-muted-foreground">Respondidas</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <p className="font-semibold text-red-500">{campaignsSummary.totalFalhas.toLocaleString('pt-BR')}</p>
                <p className="text-muted-foreground">Falhas</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Messages Chart */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Mensagens nas últimas 24 horas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {messagesOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={messagesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [value, 'Mensagens']}
                    />
                    <Line
                      type="monotone"
                      dataKey="messages"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Sem dados de mensagens</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tickets by Status */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Tickets por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {ticketsByStatus.some(t => t.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [value, 'Tickets']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {ticketsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={TICKET_COLORS[index % TICKET_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Sem tickets cadastrados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Agents */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Atendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAgents.length > 0 ? (
              <div className="space-y-3">
                {activeAgents
                  .slice((agentsPage - 1) * itemsPerPage, agentsPage * itemsPerPage)
                  .map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {agent.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${agent.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{agent.nome}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {agent.status === 'online' ? 'Ativo' : 'Disponível'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">{agent.activeChats}</p>
                        <p className="text-xs text-muted-foreground">chats ativos</p>
                      </div>
                    </div>
                  ))}

                {activeAgents.length > itemsPerPage && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={agentsPage === 1}
                      onClick={() => setAgentsPage(p => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Página {agentsPage} de {Math.ceil(activeAgents.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={agentsPage >= Math.ceil(activeAgents.length / itemsPerPage)}
                      onClick={() => setAgentsPage(p => p + 1)}
                    >
                      Próximo
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum atendente cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity
                  .slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage)
                  .map((activity) => {
                    const { icon: Icon, color, bg } = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className={`p-2 rounded-full ${bg}`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.subtitle}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                      </div>
                    );
                  })}

                {recentActivity.length > itemsPerPage && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={activityPage === 1}
                      onClick={() => setActivityPage(p => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Página {activityPage} de {Math.ceil(recentActivity.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={activityPage >= Math.ceil(recentActivity.length / itemsPerPage)}
                      onClick={() => setActivityPage(p => p + 1)}
                    >
                      Próximo
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
