import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Save, Users, Settings2, Loader2, ShieldCheck,
    CheckCircle2, AlertCircle, LayoutGrid
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CURRENT_TENANT, TenantConfig } from "@/config/tenant";

export default function ModuleSettings() {
    const { isSuperadmin, profile } = useAuth();
    const { config: globalConfig, updateConfig: updateGlobalConfig } = useTenant();

    const [selectedAdminId, setSelectedAdminId] = useState<string>("none");
    const [admins, setAdmins] = useState<{ id: string, nome: string }[]>([]);
    const [localFeatures, setLocalFeatures] = useState(globalConfig.features);
    const [loading, setLoading] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<any>(null);

    useEffect(() => {
        if (isSuperadmin) {
            fetchAdmins();
        }
    }, [isSuperadmin]);

    useEffect(() => {
        if (selectedAdminId === "none") {
            setLocalFeatures(globalConfig.features);
            setSelectedConfig(null);
        } else {
            loadAdminConfig(selectedAdminId);
        }
    }, [selectedAdminId, globalConfig.features]);

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

    const loadAdminConfig = async (adminId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'tenant_config')
                .eq('owner_id', adminId)
                .maybeSingle();

            if (error) throw error;

            if (data?.value) {
                setSelectedConfig(data.value);
                setLocalFeatures({
                    ...CURRENT_TENANT.features,
                    ...(data.value.features || {})
                });
            } else {
                setSelectedConfig(null);
                setLocalFeatures(CURRENT_TENANT.features);
            }
        } catch (error) {
            console.error('Erro ao carregar config do admin:', error);
            toast.error("Erro ao carregar módulos do administrador.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const targetOwnerId = selectedAdminId === "none" ? profile?.id : selectedAdminId;
            if (!targetOwnerId) return;

            // Se for o próprio superadmin, usa o hook global
            if (selectedAdminId === "none") {
                await updateGlobalConfig({ ...globalConfig, features: localFeatures });
            } else {
                // Se for outro admin, salva via supabase diretamente
                const fullConfig = selectedConfig || { ...CURRENT_TENANT, id: `tenant-${targetOwnerId}` };
                const updatedConfig = { ...fullConfig, features: localFeatures };

                const { error } = await supabase
                    .from('system_settings')
                    .upsert({
                        key: 'tenant_config',
                        value: updatedConfig,
                        owner_id: targetOwnerId,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key,owner_id' });

                if (error) throw error;
                setSelectedConfig(updatedConfig);
            }
            toast.success(`Módulos ${selectedAdminId === 'none' ? 'globais' : 'do administrador'} atualizados!`);
        } catch (error) {
            console.error("Erro ao salvar módulos:", error);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {isSuperadmin && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Gestão de Módulos por Unidade
                        </CardTitle>
                        <CardDescription>
                            Selecione um administrador para gerenciar quais módulos estão disponíveis para sua unidade.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                        <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                            <SelectTrigger className="w-full md:w-[300px] bg-background">
                                <SelectValue placeholder="Selecione um Admin..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Meus módulos (Globais)</SelectItem>
                                {[...admins]
                                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                                    .map(admin => (
                                        <SelectItem key={admin.id} value={admin.id}>{admin.nome}</SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-primary" />
                            Configuração de Recursos
                        </CardTitle>
                        <CardDescription>
                            {selectedAdminId === "none"
                                ? "Ative módulos globais para sua conta."
                                : `Gerenciando recursos de: ${admins.find(a => a.id === selectedAdminId)?.nome || '...'}`}
                        </CardDescription>
                    </div>
                    {selectedAdminId !== "none" && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            Modo Superadmin
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Carregando permissões...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(localFeatures).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:shadow-md transition-all group border-muted/50">
                                    <div className="space-y-0.5">
                                        <Label className="capitalize cursor-pointer font-medium text-sm group-hover:text-primary transition-colors" htmlFor={`module-${key}`}>
                                            {key.replace('enable', '').replace(/([A-Z])/g, ' $1')}
                                        </Label>
                                        <div className="flex items-center gap-1">
                                            {val ? (
                                                <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Ativo
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                    <AlertCircle className="w-2.5 h-2.5" /> Inativo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Switch
                                        id={`module-${key}`}
                                        checked={val}
                                        onCheckedChange={checked => setLocalFeatures({ ...localFeatures, [key]: checked })}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">
                    As alterações entrarão em vigor após o salvamento.
                    {selectedAdminId !== "none" && " O administrador verá as mudanças no próximo carregamento."}
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={loading}
                        onClick={() => selectedAdminId === "none" ? setLocalFeatures(globalConfig.features) : loadAdminConfig(selectedAdminId)}
                    >
                        Resetar
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="gap-2 shadow-sm">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Configurações
                    </Button>
                </div>
            </div>
        </div>
    );
}
