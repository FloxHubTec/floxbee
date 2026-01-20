import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIntegrations } from '@/hooks/useIntegrations';
import { MessageSquare, Loader2, CheckCircle2, XCircle, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationsSettings() {
    const { integrations, loading, saveIntegration, testIntegration, getIntegration } = useIntegrations();

    // WhatsApp State
    const whatsappIntegration = getIntegration('whatsapp');
    const [whatsappConfig, setWhatsappConfig] = useState({
        phone_number_id: whatsappIntegration?.config?.phone_number_id || '',
        business_account_id: whatsappIntegration?.config?.business_account_id || '',
        access_token: whatsappIntegration?.config?.access_token || '',
        webhook_verify_token: whatsappIntegration?.config?.webhook_verify_token || '',
        is_active: whatsappIntegration?.is_active || false
    });

    // OpenAI State
    const openaiIntegration = getIntegration('openai');
    const [openaiConfig, setOpenaiConfig] = useState({
        api_key: openaiIntegration?.config?.api_key || '',
        organization_id: openaiIntegration?.config?.organization_id || '',
        is_active: openaiIntegration?.is_active || false
    });

    // SMTP State
    const smtpIntegration = getIntegration('smtp');
    const [smtpConfig, setSmtpConfig] = useState({
        host: smtpIntegration?.config?.host || '',
        port: smtpIntegration?.config?.port || '587',
        username: smtpIntegration?.config?.username || '',
        password: smtpIntegration?.config?.password || '',
        from_email: smtpIntegration?.config?.from_email || '',
        from_name: smtpIntegration?.config?.from_name || '',
        is_active: smtpIntegration?.is_active || false
    });

    const [testingWhatsApp, setTestingWhatsApp] = useState(false);
    const [testingOpenAI, setTestingOpenAI] = useState(false);
    const [testingSMTP, setTestingSMTP] = useState(false);

    const handleSaveWhatsApp = async () => {
        try {
            await saveIntegration({
                integration_type: 'whatsapp',
                config: {
                    phone_number_id: whatsappConfig.phone_number_id,
                    business_account_id: whatsappConfig.business_account_id,
                    access_token: whatsappConfig.access_token,
                    webhook_verify_token: whatsappConfig.webhook_verify_token
                },
                is_active: whatsappConfig.is_active
            });
        } catch (error) {
            console.error('Erro ao salvar WhatsApp:', error);
        }
    };

    const handleTestWhatsApp = async () => {
        setTestingWhatsApp(true);
        try {
            await testIntegration('whatsapp');
        } finally {
            setTestingWhatsApp(false);
        }
    };

    const handleSaveOpenAI = async () => {
        try {
            await saveIntegration({
                integration_type: 'openai',
                config: {
                    api_key: openaiConfig.api_key,
                    organization_id: openaiConfig.organization_id
                },
                is_active: openaiConfig.is_active
            });
        } catch (error) {
            console.error('Erro ao salvar OpenAI:', error);
        }
    };

    const handleTestOpenAI = async () => {
        setTestingOpenAI(true);
        try {
            await testIntegration('openai');
        } finally {
            setTestingOpenAI(false);
        }
    };

    const handleSaveSMTP = async () => {
        try {
            await saveIntegration({
                integration_type: 'smtp',
                config: {
                    host: smtpConfig.host,
                    port: smtpConfig.port,
                    username: smtpConfig.username,
                    password: smtpConfig.password,
                    from_email: smtpConfig.from_email,
                    from_name: smtpConfig.from_name
                },
                is_active: smtpConfig.is_active
            });
        } catch (error) {
            console.error('Erro ao salvar SMTP:', error);
        }
    };

    const handleTestSMTP = async () => {
        setTestingSMTP(true);
        try {
            await testIntegration('smtp');
        } finally {
            setTestingSMTP(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* WhatsApp Business API */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                        <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                        <CardTitle>WhatsApp Business API</CardTitle>
                        <CardDescription>Configure a integração com Meta WhatsApp Business</CardDescription>
                    </div>
                    <Switch
                        checked={whatsappConfig.is_active}
                        onCheckedChange={(checked) => setWhatsappConfig({ ...whatsappConfig, is_active: checked })}
                    />
                </CardHeader>
                <CardContent className="space-y-4">
                    {whatsappIntegration?.test_status && (
                        <Alert className={whatsappIntegration.test_status === 'success' ? 'border-green-500' : 'border-red-500'}>
                            {whatsappIntegration.test_status === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <AlertDescription>
                                {whatsappIntegration.test_status === 'success'
                                    ? `Última conexão bem-sucedida: ${new Date(whatsappIntegration.last_tested_at!).toLocaleString('pt-BR')}`
                                    : `Erro: ${whatsappIntegration.test_error}`
                                }
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Phone Number ID</Label>
                            <Input
                                type="text"
                                value={whatsappConfig.phone_number_id}
                                onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phone_number_id: e.target.value })}
                                placeholder="123456789012345"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Business Account ID</Label>
                            <Input
                                type="text"
                                value={whatsappConfig.business_account_id}
                                onChange={(e) => setWhatsappConfig({ ...whatsappConfig, business_account_id: e.target.value })}
                                placeholder="123456789012345"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Access Token</Label>
                        <Input
                            type="password"
                            value={whatsappConfig.access_token}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, access_token: e.target.value })}
                            placeholder="EAAxxxxxxxxxx"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Webhook Verify Token</Label>
                        <Input
                            type="text"
                            value={whatsappConfig.webhook_verify_token}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhook_verify_token: e.target.value })}
                            placeholder="seu_token_secreto"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use este token ao configurar o webhook no Meta Business Manager
                        </p>
                    </div>

                    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm">
                            <p className="font-semibold mb-2">URL do Webhook para configurar na Meta:</p>
                            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border font-mono text-xs break-all">
                                <code className="flex-1">
                                    https://azyzqjfzaraasirpzuel.supabase.co/functions/v1/whatsapp-webhook
                                </code>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        navigator.clipboard.writeText('https://azyzqjfzaraasirpzuel.supabase.co/functions/v1/whatsapp-webhook');
                                        toast.success('URL copiada!');
                                    }}
                                    className="shrink-0"
                                >
                                    Copiar
                                </Button>
                            </div>
                            <p className="mt-2 text-xs">
                                <strong>Verify Token:</strong> {whatsappConfig.webhook_verify_token || '(configure acima)'}
                            </p>
                        </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                        <Button onClick={handleSaveWhatsApp} className="flex-1">
                            Salvar Configuração
                        </Button>
                        <Button
                            onClick={handleTestWhatsApp}
                            variant="outline"
                            disabled={testingWhatsApp || !whatsappConfig.access_token}
                        >
                            {testingWhatsApp ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testando...</>
                            ) : (
                                <><TestTube className="w-4 h-4 mr-2" /> Testar Conexão</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* OpenAI API */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                        <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <CardTitle>OpenAI API</CardTitle>
                        <CardDescription>Configure a chave de API para inteligência artificial</CardDescription>
                    </div>
                    <Switch
                        checked={openaiConfig.is_active}
                        onCheckedChange={(checked) => setOpenaiConfig({ ...openaiConfig, is_active: checked })}
                    />
                </CardHeader>
                <CardContent className="space-y-4">
                    {openaiIntegration?.test_status && (
                        <Alert className={openaiIntegration.test_status === 'success' ? 'border-green-500' : 'border-red-500'}>
                            {openaiIntegration.test_status === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <AlertDescription>
                                {openaiIntegration.test_status === 'success'
                                    ? `Última conexão bem-sucedida: ${new Date(openaiIntegration.last_tested_at!).toLocaleString('pt-BR')}`
                                    : `Erro: ${openaiIntegration.test_error}`
                                }
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                            type="password"
                            value={openaiConfig.api_key}
                            onChange={(e) => setOpenaiConfig({ ...openaiConfig, api_key: e.target.value })}
                            placeholder="sk-xxxxxxxxxxxxxxxx"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Organization ID (Opcional)</Label>
                        <Input
                            type="text"
                            value={openaiConfig.organization_id}
                            onChange={(e) => setOpenaiConfig({ ...openaiConfig, organization_id: e.target.value })}
                            placeholder="org-xxxxxxxxxxxxxxxx"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSaveOpenAI} className="flex-1">
                            Salvar Configuração
                        </Button>
                        <Button
                            onClick={handleTestOpenAI}
                            variant="outline"
                            disabled={testingOpenAI || !openaiConfig.api_key}
                        >
                            {testingOpenAI ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testando...</>
                            ) : (
                                <><TestTube className="w-4 h-4 mr-2" /> Testar Conexão</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* SMTP Email */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <CardTitle>Email SMTP</CardTitle>
                        <CardDescription>Configure o servidor de email para notificações</CardDescription>
                    </div>
                    <Switch
                        checked={smtpConfig.is_active}
                        onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, is_active: checked })}
                    />
                </CardHeader>
                <CardContent className="space-y-4">
                    {smtpIntegration?.test_status && (
                        <Alert className={smtpIntegration.test_status === 'success' ? 'border-green-500' : 'border-red-500'}>
                            {smtpIntegration.test_status === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <AlertDescription>
                                {smtpIntegration.test_status === 'success'
                                    ? `Última conexão bem-sucedida: ${new Date(smtpIntegration.last_tested_at!).toLocaleString('pt-BR')}`
                                    : `Erro: ${smtpIntegration.test_error}`
                                }
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Host SMTP</Label>
                            <Input
                                type="text"
                                value={smtpConfig.host}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Porta</Label>
                            <Input
                                type="number"
                                value={smtpConfig.port}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                placeholder="587"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Usuário</Label>
                            <Input
                                type="text"
                                value={smtpConfig.username}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                                placeholder="seu@email.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Senha</Label>
                            <Input
                                type="password"
                                value={smtpConfig.password}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Email Remetente</Label>
                            <Input
                                type="email"
                                value={smtpConfig.from_email}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, from_email: e.target.value })}
                                placeholder="noreply@empresa.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nome Remetente</Label>
                            <Input
                                type="text"
                                value={smtpConfig.from_name}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })}
                                placeholder="FloxBee"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSaveSMTP} className="flex-1">
                            Salvar Configuração
                        </Button>
                        <Button
                            onClick={handleTestSMTP}
                            variant="outline"
                            disabled={testingSMTP || !smtpConfig.host}
                        >
                            {testingSMTP ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testando...</>
                            ) : (
                                <><TestTube className="w-4 h-4 mr-2" /> Testar Conexão</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
