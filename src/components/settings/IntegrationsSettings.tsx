import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
    MessageSquare, Loader2, CheckCircle2, XCircle, TestTube,
    Zap, Save, Mail, Bot, Users
} from 'lucide-react';
import { toast } from 'sonner';

const MASK = '••••••••••••••••••••';

export default function IntegrationsSettings() {
    const { isSuperadmin, profile } = useAuth();
    const [selectedAdminId, setSelectedAdminId] = useState<string | undefined>(undefined);
    const [admins, setAdmins] = useState<{ id: string, nome: string }[]>([]);

    // Hook de integrações agora recebe o ID do admin selecionado ou o próprio perfil
    const { integrations, loading: loadingIntegrations, saveIntegration, testIntegration, getIntegration } = useIntegrations(selectedAdminId);
    const { config: tenantConfig, updateConfig: updateTenantConfig } = useTenant();
    const [localTenantConfig, setLocalTenantConfig] = useState(tenantConfig);

    useEffect(() => {
        if (isSuperadmin) {
            fetchAdmins();
        }
    }, [isSuperadmin]);

    useEffect(() => {
        setLocalTenantConfig(tenantConfig);
    }, [tenantConfig]);

    const fetchAdmins = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nome')
                .eq('role', 'admin')
                .eq('ativo', true);

            if (error) throw error;
            setAdmins(data || []);
        } catch (error) {
            console.error('Erro ao buscar admins:', error);
        }
    };

    const handleSaveTenantPart = async () => {
        try {
            await updateTenantConfig(localTenantConfig);
            toast.success('Configurações de comunicação salvas!');
        } catch (error) {
            toast.error('Erro ao salvar configurações.');
        }
    };

    // WhatsApp State
    const whatsappIntegration = getIntegration('whatsapp');
    const [whatsappConfig, setWhatsappConfig] = useState({
        phone_number_id: '',
        business_account_id: '',
        access_token: '',
        webhook_verify_token: '',
        is_active: false
    });

    // OpenAI State
    const openaiIntegration = getIntegration('openai');
    const [openaiConfig, setOpenaiConfig] = useState({
        api_key: '',
        organization_id: '',
        knowledge_base: '',
        is_active: false
    });

    // SMTP State
    const smtpIntegration = getIntegration('smtp');
    const [smtpConfig, setSmtpConfig] = useState({
        host: '',
        port: '587',
        username: '',
        password: '',
        from_email: '',
        from_name: '',
        is_active: false
    });

    // Efeito para carregar dados iniciais (com máscara nos sensíveis)
    useEffect(() => {
        if (!loadingIntegrations) {
            if (whatsappIntegration) {
                setWhatsappConfig({
                    phone_number_id: whatsappIntegration.config?.phone_number_id || '',
                    business_account_id: whatsappIntegration.config?.business_account_id || '',
                    access_token: whatsappIntegration.config?.access_token ? MASK : '',
                    webhook_verify_token: whatsappIntegration.config?.webhook_verify_token ? MASK : '',
                    is_active: whatsappIntegration.is_active || false
                });
            } else {
                setWhatsappConfig({ phone_number_id: '', business_account_id: '', access_token: '', webhook_verify_token: '', is_active: false });
            }
            if (openaiIntegration) {
                setOpenaiConfig({
                    api_key: openaiIntegration.config?.api_key ? MASK : '',
                    organization_id: openaiIntegration.config?.organization_id || '',
                    knowledge_base: openaiIntegration.config?.knowledge_base || '',
                    is_active: openaiIntegration.is_active || false
                });
            } else {
                setOpenaiConfig({ api_key: '', organization_id: '', knowledge_base: '', is_active: false });
            }
            if (smtpIntegration) {
                setSmtpConfig({
                    host: smtpIntegration.config?.host || '',
                    port: smtpIntegration.config?.port || '587',
                    username: smtpIntegration.config?.username || '',
                    password: smtpIntegration.config?.password ? MASK : '',
                    from_email: smtpIntegration.config?.from_email || '',
                    from_name: smtpIntegration.config?.from_name || '',
                    is_active: smtpIntegration.is_active || false
                });
            } else {
                setSmtpConfig({ host: '', port: '587', username: '', password: '', from_email: '', from_name: '', is_active: false });
            }
        }
    }, [loadingIntegrations, whatsappIntegration, openaiIntegration, smtpIntegration]);

    const [testingWhatsApp, setTestingWhatsApp] = useState(false);
    const [testingOpenAI, setTestingOpenAI] = useState(false);
    const [testingSMTP, setTestingSMTP] = useState(false);

    const handleSaveWhatsApp = async () => {
        try {
            const finalConfig = {
                ...whatsappIntegration?.config,
                phone_number_id: whatsappConfig.phone_number_id,
                business_account_id: whatsappConfig.business_account_id,
            };
            if (whatsappConfig.access_token !== MASK) finalConfig.access_token = whatsappConfig.access_token;
            if (whatsappConfig.webhook_verify_token !== MASK) finalConfig.webhook_verify_token = whatsappConfig.webhook_verify_token;

            await saveIntegration({
                integration_type: 'whatsapp',
                config: finalConfig,
                is_active: whatsappConfig.is_active
            });
            toast.success('WhatsApp Business API atualizado!');
        } catch (error) {
            console.error('Erro ao salvar WhatsApp:', error);
        }
    };

    const handleSaveOpenAI = async () => {
        try {
            const finalConfig = {
                ...openaiIntegration?.config,
                organization_id: openaiConfig.organization_id,
                knowledge_base: openaiConfig.knowledge_base
            };
            if (openaiConfig.api_key !== MASK) finalConfig.api_key = openaiConfig.api_key;

            await saveIntegration({
                integration_type: 'openai',
                config: finalConfig,
                is_active: openaiConfig.is_active
            });
            toast.success('OpenAI API atualizada!');
        } catch (error) {
            console.error('Erro ao salvar OpenAI:', error);
        }
    };

    const handleSaveSMTP = async () => {
        try {
            const finalConfig = {
                ...smtpIntegration?.config,
                host: smtpConfig.host,
                port: smtpConfig.port,
                username: smtpConfig.username,
                from_email: smtpConfig.from_email,
                from_name: smtpConfig.from_name
            };
            if (smtpConfig.password !== MASK) finalConfig.password = smtpConfig.password;

            await saveIntegration({
                integration_type: 'smtp',
                config: finalConfig,
                is_active: smtpConfig.is_active
            });
            toast.success('Configurações de SMTP atualizadas!');
        } catch (error) {
            console.error('Erro ao salvar SMTP:', error);
        }
    };

    if (loadingIntegrations) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {isSuperadmin && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Gerenciar Integrações de Unidades
                        </CardTitle>
                        <CardDescription>
                            Selecione um administrador para visualizar ou configurar as integrações de sua unidade.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                        <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                            <SelectTrigger className="w-full md:w-[300px] bg-background">
                                <SelectValue placeholder="Selecione um Admin..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Minhas integrações</SelectItem>
                                {admins.map(admin => (
                                    <SelectItem key={admin.id} value={admin.id}>{admin.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="whatsapp" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/30">
                    <TabsTrigger value="whatsapp" className="gap-2 py-2">
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="openai" className="gap-2 py-2">
                        <Bot className="w-4 h-4" />
                        IA (OpenAI)
                    </TabsTrigger>
                    <TabsTrigger value="smtp" className="gap-2 py-2">
                        <Mail className="w-4 h-4" />
                        E-mail
                    </TabsTrigger>
                    <TabsTrigger value="communication" className="gap-2 py-2">
                        <Zap className="w-4 h-4" />
                        Comunicação
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="whatsapp" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <MessageSquare className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle>WhatsApp Business API</CardTitle>
                                    <CardDescription>Configure a integração oficial da Meta</CardDescription>
                                </div>
                                <Switch
                                    checked={whatsappConfig.is_active}
                                    onCheckedChange={(checked) => setWhatsappConfig({ ...whatsappConfig, is_active: checked })}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Phone Number ID</Label>
                                        <Input
                                            value={whatsappConfig.phone_number_id}
                                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phone_number_id: e.target.value })}
                                            placeholder="1234567890"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Business Account ID</Label>
                                        <Input
                                            value={whatsappConfig.business_account_id}
                                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, business_account_id: e.target.value })}
                                            placeholder="1234567890"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Access Token</Label>
                                    <Input
                                        type="password"
                                        value={whatsappConfig.access_token}
                                        onFocus={() => whatsappConfig.access_token === MASK && setWhatsappConfig({ ...whatsappConfig, access_token: '' })}
                                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, access_token: e.target.value })}
                                        placeholder="EAAB..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Webhook Verify Token</Label>
                                    <Input
                                        value={whatsappConfig.webhook_verify_token}
                                        onFocus={() => whatsappConfig.webhook_verify_token === MASK && setWhatsappConfig({ ...whatsappConfig, webhook_verify_token: '' })}
                                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhook_verify_token: e.target.value })}
                                        placeholder="token_secreto"
                                    />
                                </div>
                                <Button onClick={handleSaveWhatsApp} className="w-full">Salvar Configurações de WhatsApp</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="openai" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                    <Bot className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle>OpenAI Intelligence</CardTitle>
                                    <CardDescription>Configure o motor de IA do FloxBee</CardDescription>
                                </div>
                                <Switch
                                    checked={openaiConfig.is_active}
                                    onCheckedChange={(checked) => setOpenaiConfig({ ...openaiConfig, is_active: checked })}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input
                                        type="password"
                                        value={openaiConfig.api_key}
                                        onFocus={() => openaiConfig.api_key === MASK && setOpenaiConfig({ ...openaiConfig, api_key: '' })}
                                        onChange={(e) => setOpenaiConfig({ ...openaiConfig, api_key: e.target.value })}
                                        placeholder="sk-..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Organization (Opcional)</Label>
                                    <Input
                                        value={openaiConfig.organization_id}
                                        onChange={(e) => setOpenaiConfig({ ...openaiConfig, organization_id: e.target.value })}
                                        placeholder="org-..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Base de Conhecimento</Label>
                                    <Textarea
                                        value={openaiConfig.knowledge_base}
                                        onChange={(e) => setOpenaiConfig({ ...openaiConfig, knowledge_base: e.target.value })}
                                        placeholder="Digite aqui as informações que a IA deve conhecer para atender seus clientes..."
                                        className="min-h-[200px]"
                                    />
                                    <p className="text-xs text-muted-foreground italic">
                                        Use este campo para fornecer o contexto de negócio, regras de atendimento e informações sobre produtos ou serviços.
                                    </p>
                                </div>
                                <Button onClick={handleSaveOpenAI} className="w-full">Salvar Configurações de IA</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="smtp" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle>Configurações de E-mail</CardTitle>
                                    <CardDescription>Configure o servidor SMTP para notificações</CardDescription>
                                </div>
                                <Switch
                                    checked={smtpConfig.is_active}
                                    onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, is_active: checked })}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Host SMTP</Label>
                                        <Input
                                            value={smtpConfig.host}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                            placeholder="smtp.gmail.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Porta</Label>
                                        <Input
                                            value={smtpConfig.port}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                            placeholder="587"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Usuário/Email</Label>
                                        <Input
                                            value={smtpConfig.username}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                                            placeholder="seu@dominio.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Senha</Label>
                                        <Input
                                            type="password"
                                            value={smtpConfig.password}
                                            onFocus={() => smtpConfig.password === MASK && setSmtpConfig({ ...smtpConfig, password: '' })}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSaveSMTP} className="w-full">Salvar Configurações de E-mail</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="communication" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-primary" />
                                    Configurações de Comunicação
                                </CardTitle>
                                <CardDescription>Regras globais de envio e frequência de mensagens</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">Controle de Frequência</Label>
                                        <p className="text-xs text-muted-foreground">Intervalo mínimo (horas) para repetir campanhas ao mesmo contato</p>
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="number"
                                            value={localTenantConfig.communicationConfig?.frequencyLimitHours || 24}
                                            onChange={e => setLocalTenantConfig({
                                                ...localTenantConfig,
                                                communicationConfig: {
                                                    ...localTenantConfig.communicationConfig,
                                                    frequencyLimitHours: parseInt(e.target.value) || 0
                                                }
                                            })}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSaveTenantPart} className="w-full gap-2">
                                    <Save className="w-4 h-4" />
                                    Salvar Configuração de Frequência
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
