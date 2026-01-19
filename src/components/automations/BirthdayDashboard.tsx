import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Cake, Users, TrendingUp, Play, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    useTodaysBirthdays,
    useUpcomingBirthdays,
    useAutomationStats,
    useTriggerBirthdayAutomation,
    useAutomationLogs,
} from '@/hooks/useAutomations';
import { useToast } from '@/hooks/use-toast';

const BirthdayDashboard: React.FC = () => {
    const { toast } = useToast();
    const { data: todaysBirthdays = [], isLoading: loadingToday } = useTodaysBirthdays();
    const { data: upcomingBirthdays = [], isLoading: loadingUpcoming } = useUpcomingBirthdays(7);
    const { data: stats, isLoading: loadingStats } = useAutomationStats();
    const { data: logs = [], isLoading: loadingLogs } = useAutomationLogs(null, 10);
    const triggerBirthday = useTriggerBirthdayAutomation();

    const handleTriggerAutomation = async () => {
        try {
            await triggerBirthday.mutateAsync();
        } catch (error) {
            console.error('Error triggering automation:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Aniversários e Automações</h2>
                    <p className="text-muted-foreground">
                        Gerencie mensagens automáticas de aniversário
                    </p>
                </div>
                <Button
                    onClick={handleTriggerAutomation}
                    disabled={triggerBirthday.isPending}
                    className="gap-2"
                >
                    {triggerBirthday.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Executando...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            Executar Agora
                        </>
                    )}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aniversários Hoje</CardTitle>
                        <Cake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingToday ? '...' : todaysBirthdays.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {todaysBirthdays.length === 1 ? 'Aniversariante' : 'Aniversariantes'} hoje
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Próximos 7 Dias</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingUpcoming ? '...' : upcomingBirthdays.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Aniversários chegando</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingStats ? '...' : stats?.activeRules || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            De {stats?.totalRules || 0} regras totais
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enviadas (30 dias)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadingStats ? '...' : stats?.sentLast30Days || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.failedLast30Days || 0} falharam
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Birthdays */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cake className="w-5 h-5" />
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
                            <Cake className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhum aniversariante hoje</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todaysBirthdays.map((contact: any) => (
                                <div
                                    key={contact.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Cake className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{contact.nome}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {contact.whatsapp}
                                                {contact.idade && ` • ${contact.idade} anos`}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="default">Hoje! 🎉</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Birthdays */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Próximos Aniversários (7 dias)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingUpcoming ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : upcomingBirthdays.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhum aniversário nos próximos 7 dias</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingBirthdays.map((contact: any) => (
                                <div
                                    key={contact.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{contact.nome}</p>
                                            <p className="text-sm text-muted-foreground">{contact.whatsapp}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">
                                        Em {contact.dias_restantes} dia{contact.dias_restantes !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Logs */}
            <Card>
                <CardHeader>
                    <CardTitle>Últimas Execuções</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingLogs ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Nenhuma execução registrada ainda</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.slice(0, 10).map((log: any) => (
                                <div
                                    key={log.id}
                                    className="flex items-center justify-between p-2 border-l-2 pl-3"
                                    style={{
                                        borderLeftColor:
                                            log.status === 'enviado' || log.status === 'sucesso'
                                                ? '#22c55e'
                                                : '#ef4444',
                                    }}
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {log.contact?.nome || 'Contato'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {log.rule?.nome || 'Regra'} • {log.rule?.tipo}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge
                                            variant={
                                                log.status === 'enviado' || log.status === 'sucesso'
                                                    ? 'default'
                                                    : 'destructive'
                                            }
                                        >
                                            {log.status}
                                        </Badge>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default BirthdayDashboard;
