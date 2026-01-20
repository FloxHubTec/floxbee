import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Globe,
  Users,
  Key,
  ChevronRight,
  Settings2,
  Sliders,
  Building,
  Pencil,
  Loader2,
  Lock,
  ExternalLink,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FloxBeeLogo from '@/components/FloxBeeLogo';
import UserManagement from '@/components/settings/UserManagement';
import SystemPreferences from '@/components/settings/SystemPreferences';
import TenantSettings from '@/components/settings/TenantSettings';
import NotificationSettings from '@/components/tickets/NotificationSettings';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Componente Interno para Edição de Perfil
const EditProfileDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: { nome: string; telefone: string };
  onSuccess: () => void;
}> = ({ open, onOpenChange, initialData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const { user } = useAuth();

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome,
          telefone: formData.telefone
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      onSuccess(); // Recarrega os dados no hook useAuth
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações de contato. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone / WhatsApp</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="Ex: 5511999999999"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Utilize apenas números com DDD.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, profile, refreshProfile, isAdmin, isSuperadmin } = useAuth();

  // Estados para diálogos
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Estados locais para configurações avançadas (persistem no localStorage)
  const [advancedSettings, setAdvancedSettings] = useState({
    debugMode: localStorage.getItem('floxbee_debug_mode') === 'true',
    cacheEnabled: localStorage.getItem('floxbee_cache_enabled') !== 'false',
    analyticsEnabled: localStorage.getItem('floxbee_analytics_enabled') !== 'false'
  });

  // Redirecionamento de segurança: Se não for admin, força aba de perfil
  useEffect(() => {
    if (!isAdmin && !isSuperadmin && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [isAdmin, isSuperadmin, activeTab]);

  const toggleAdvancedSetting = (key: keyof typeof advancedSettings) => {
    setAdvancedSettings(prev => {
      const newState = { ...prev, [key]: !prev[key] };
      if (key === 'debugMode') localStorage.setItem('floxbee_debug_mode', String(newState[key]));
      if (key === 'cacheEnabled') localStorage.setItem('floxbee_cache_enabled', String(newState[key]));
      if (key === 'analyticsEnabled') localStorage.setItem('floxbee_analytics_enabled', String(newState[key]));
      return newState;
    });
    toast.success(`Configuração ${!advancedSettings[key] ? 'ativada' : 'desativada'}`);
  };

  const handleProfileSuccess = async () => {
    await refreshProfile();
  };

  const handleConfigureIntegration = (integrationId: string) => {
    toast.info("Configuração de integração", {
      description: `O módulo de configuração para ${integrationId} será implementado em breve.`
    });
  };

  // Determinar permissões de visualização
  const canManageUsers = isAdmin || isSuperadmin;
  const canManageSystem = isAdmin || isSuperadmin;

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <FloxBeeLogo size={32} />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários, permissões e preferências do sistema</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6 h-auto bg-muted/50 p-1">
            <TabsTrigger value="profile" className="gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>

            {canManageUsers && (
              <TabsTrigger value="users" className="gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Usuários</span>
              </TabsTrigger>
            )}

            {canManageSystem && (
              <TabsTrigger value="preferences" className="gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Sliders className="w-4 h-4" />
                <span className="hidden sm:inline">Preferências</span>
              </TabsTrigger>
            )}

            {canManageSystem && (
              <TabsTrigger value="notifications" className="gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notificações</span>
              </TabsTrigger>
            )}

            {canManageSystem && (
              <TabsTrigger value="tenant" className="gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">Sistema</span>
              </TabsTrigger>
            )}

            {canManageSystem && (
              <TabsTrigger value="integrations" className="gap-2 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Integrações</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab - Disponível para todos */}
          <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 duration-300">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle>Meu Perfil</CardTitle>
                  <CardDescription>Suas informações pessoais</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditProfileOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Nome', value: profile?.nome || 'Carregando...' },
                    { label: 'Email', value: profile?.email || user?.email || 'Sem email' },
                    { label: 'Telefone', value: profile?.telefone || 'Não informado' },
                    { label: 'Matrícula', value: profile?.matricula || 'Não informada' },
                    {
                      label: 'Função',
                      value: isSuperadmin ? 'Superadmin' : isAdmin ? 'Administrador' : 'Agente',
                      isBadge: true
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      {item.isBadge ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {item.value}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Segurança</CardTitle>
                  <CardDescription>Proteja sua conta</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors border border-transparent hover:border-border"
                    onClick={() => setIsChangePasswordOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Alterar Senha</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg opacity-50 cursor-not-allowed border border-transparent">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">Autenticação em duas etapas</span>
                        <span className="text-xs text-muted-foreground">Em breve</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <EditProfileDialog
              open={isEditProfileOpen}
              onOpenChange={setIsEditProfileOpen}
              initialData={{
                nome: profile?.nome || '',
                telefone: profile?.telefone || ''
              }}
              onSuccess={handleProfileSuccess}
            />

            <ChangePasswordDialog
              open={isChangePasswordOpen}
              onOpenChange={setIsChangePasswordOpen}
            />
          </TabsContent>

          {/* Abas Administrativas - Renderização Condicional */}
          {canManageUsers && (
            <TabsContent value="users" className="animate-in fade-in-50 duration-300">
              <UserManagement />
            </TabsContent>
          )}

          {canManageSystem && (
            <TabsContent value="preferences" className="animate-in fade-in-50 duration-300">
              <SystemPreferences />
            </TabsContent>
          )}

          {canManageSystem && (
            <TabsContent value="notifications" className="animate-in fade-in-50 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notificações Automáticas
                  </CardTitle>
                  <CardDescription>
                    Configure notificações automáticas para eventos do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NotificationSettings />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canManageSystem && (
            <TabsContent value="tenant" className="animate-in fade-in-50 duration-300">
              <TenantSettings />
            </TabsContent>
          )}

          {canManageSystem && (
            <TabsContent value="integrations" className="space-y-6 animate-in fade-in-50 duration-300">
              <IntegrationsSettings />

              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Configurações Avançadas</CardTitle>
                    <CardDescription>Opções técnicas locais do sistema</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Modo de debug</p>
                        <p className="text-xs text-muted-foreground">Exibir logs detalhados no console do navegador</p>
                      </div>
                      <Switch
                        checked={advancedSettings.debugMode}
                        onCheckedChange={() => toggleAdvancedSetting('debugMode')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Cache de mensagens</p>
                        <p className="text-xs text-muted-foreground">Armazenar mensagens localmente para carregamento mais rápido</p>
                      </div>
                      <Switch
                        checked={advancedSettings.cacheEnabled}
                        onCheckedChange={() => toggleAdvancedSetting('cacheEnabled')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Analytics Anônimo</p>
                        <p className="text-xs text-muted-foreground">Permitir coleta de dados de uso para melhoria do sistema</p>
                      </div>
                      <Switch
                        checked={advancedSettings.analyticsEnabled}
                        onCheckedChange={() => toggleAdvancedSetting('analyticsEnabled')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;