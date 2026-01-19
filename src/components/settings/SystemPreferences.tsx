import React from 'react';
import { Bot, Bell, Clock, Timer, RotateCcw, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemPreferences } from '@/hooks/useSystemPreferences';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
  { value: 'gpt-4o', label: 'GPT-4o (Avançado)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

const SystemPreferences: React.FC = () => {
  const { preferences, updatePreference, resetToDefaults, isLoaded } = useSystemPreferences();
  const { isAdmin, isSuperadmin } = useAuth();

  // Proteção de Acesso
  if (!isAdmin && !isSuperadmin) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          Apenas usuários administradores podem alterar as preferências globais do sistema.
        </AlertDescription>
      </Alert>
    );
  }

  const handleDayToggle = (day: number) => {
    const currentDays = preferences.businessDays;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();
    updatePreference('businessDays', newDays);
  };

  const handleReset = () => {
    resetToDefaults();
    toast.success('Preferências restauradas para o padrão!');
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* AI Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>Comportamento da IA</CardTitle>
            <CardDescription>Defina como a IA interage nas conversas</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Resposta automática ativada</Label>
              <p className="text-xs text-muted-foreground">IA responde automaticamente novas mensagens</p>
            </div>
            <Switch
              checked={preferences.aiAutoResponse}
              onCheckedChange={(v) => updatePreference('aiAutoResponse', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Transferência após tentativas</Label>
              <p className="text-xs text-muted-foreground">Quantas tentativas antes de transferir para humano</p>
            </div>
            <Select
              value={String(preferences.aiAutoTransferAfterAttempts)}
              onValueChange={(v) => updatePreference('aiAutoTransferAfterAttempts', Number(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Coleta de feedback</Label>
              <p className="text-xs text-muted-foreground">Solicitar avaliação após atendimento</p>
            </div>
            <Switch
              checked={preferences.aiFeedbackCollection}
              onCheckedChange={(v) => updatePreference('aiFeedbackCollection', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Configure alertas do sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Novos atendimentos</Label>
            <Switch
              checked={preferences.notifyNewConversations}
              onCheckedChange={(v) => updatePreference('notifyNewConversations', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Tickets prioritários</Label>
            <Switch
              checked={preferences.notifyPriorityTickets}
              onCheckedChange={(v) => updatePreference('notifyPriorityTickets', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Horário de Funcionamento</CardTitle>
            <CardDescription>Configure o expediente de atendimento</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Habilitar horário comercial</Label>
            <Switch
              checked={preferences.businessHoursEnabled}
              onCheckedChange={(v) => updatePreference('businessHoursEnabled', v)}
            />
          </div>

          {preferences.businessHoursEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="time"
                    value={preferences.businessHoursStart}
                    onChange={(e) => updatePreference('businessHoursStart', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="time"
                    value={preferences.businessHoursEnd}
                    onChange={(e) => updatePreference('businessHoursEnd', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Dias de funcionamento</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center gap-1">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={preferences.businessDays.includes(day.value)}
                        onCheckedChange={() => handleDayToggle(day.value)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SLA Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Configuração de SLA</CardTitle>
            <CardDescription>Defina prazos por prioridade (em horas)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Habilitar SLA</Label>
            <Switch
              checked={preferences.slaEnabled}
              onCheckedChange={(v) => updatePreference('slaEnabled', v)}
            />
          </div>

          {preferences.slaEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-green-600">Baixa prioridade</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={preferences.slaLowPriority}
                    onChange={(e) => updatePreference('slaLowPriority', Number(e.target.value))}
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-yellow-600">Média prioridade</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={preferences.slaMediumPriority}
                    onChange={(e) => updatePreference('slaMediumPriority', Number(e.target.value))}
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-orange-600">Alta prioridade</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={preferences.slaHighPriority}
                    onChange={(e) => updatePreference('slaHighPriority', Number(e.target.value))}
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-red-600">Urgente</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={preferences.slaUrgentPriority}
                    onChange={(e) => updatePreference('slaUrgentPriority', Number(e.target.value))}
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrões
        </Button>
      </div>
    </div>
  );
};

export default SystemPreferences;