import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Zap,
  Clock,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Upload,
  X
} from "lucide-react";
import { CURRENT_TENANT, TenantConfig } from "@/config/tenant";
import { useFileUpload } from "@/hooks/useFileUpload";

// Color utility functions
function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToRgb(hsl: string): [number, number, number] {
  const parts = hsl.split(' ');
  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2]) / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(h + 1 / 3);
    g = hue2rgb(h);
    b = hue2rgb(h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(rgb: [number, number, number]): string {
  return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
}

export default function TenantSettings() {
  const { config, updateConfig } = useTenant();
  const { profile, isAdmin, isSuperadmin } = useAuth();

  // Local state for all fields
  const [localConfig, setLocalConfig] = useState<TenantConfig>(config);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [newTopic, setNewTopic] = useState("");

  // Sync when config loads
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isAdmin && !isSuperadmin) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          Acesso restrito a administradores.
        </AlertDescription>
      </Alert>
    );
  }

  const handleSave = async () => {
    try {
      await updateConfig(localConfig);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações.");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const ownerId = profile?.owner_id || profile?.id || "default";
      const timestamp = Date.now();
      const extension = file.name.split(".").pop();
      const fileName = `logo-${timestamp}.${extension}`;
      const filePath = `logos/${ownerId}/${fileName}`;

      console.log("Iniciando upload de logotipo:", filePath);

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const oldUrl = localConfig.branding.logoUrl;
      const newConfig = {
        ...localConfig,
        branding: {
          ...localConfig.branding,
          logoUrl: urlData.publicUrl
        }
      };

      // Atualiza estado local e persiste no banco imediatamente
      setLocalConfig(newConfig);
      await updateConfig(newConfig);

      // Limpa logo antiga após sucesso no banco
      if (oldUrl) {
        await deleteOldLogo(oldUrl);
      }

      toast.success("Logo atualizada com sucesso!");
    } catch (error: any) {
      console.error("Erro no processo de logo:", error);
      toast.error(`Erro ao processar logotipo: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const deleteOldLogo = async (url: string) => {
    if (!url || !url.startsWith('http')) return;

    try {
      // Extração robusta do path usando URL API
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/public/branding/');

      if (pathParts.length >= 2) {
        const filePath = decodeURIComponent(pathParts[1]);
        console.log("Limpando arquivo físico no storage:", filePath);

        const { error } = await supabase.storage
          .from('branding')
          .remove([filePath]);

        if (error) {
          console.error("Erro na exclusão física (Storage):", error);
        }
      }
    } catch (e) {
      console.error("Erro ao processar URL para exclusão:", e);
    }
  };

  const handleRemoveLogo = async () => {
    if (!localConfig.branding.logoUrl) return;

    const oldUrl = localConfig.branding.logoUrl;
    const newConfig = {
      ...localConfig,
      branding: {
        ...localConfig.branding,
        logoUrl: undefined
      }
    };

    try {
      setLocalConfig(newConfig);
      await updateConfig(newConfig);
      await deleteOldLogo(oldUrl);
      toast.success("Logo removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover logo:", error);
      toast.error("Erro ao processar remoção");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração do Sistema</h2>
          <p className="text-muted-foreground">Gerencie sua unidade e comportamento da IA</p>
        </div>
      </div>

      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding" className="flex items-center gap-2"><Zap className="h-4 w-4" /> Branding</TabsTrigger>
          <TabsTrigger value="entity" className="flex items-center gap-2"><Users className="h-4 w-4" /> Entidade</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2"><Bot className="h-4 w-4" /> IA</TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> Módulos & SLA</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card>
            <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Identidade Visual (Logo)</Label>
                <div className="flex items-start gap-6 p-4 border rounded-lg bg-muted/20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-24 w-24 rounded-lg border bg-background flex items-center justify-center overflow-hidden">
                      {localConfig.branding.logoUrl ? (
                        <img
                          src={localConfig.branding.logoUrl}
                          alt="Logo preview"
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground p-2 text-center">
                          <ImageIcon className="h-8 w-8 opacity-20" />
                          <span className="text-[10px]">Sem Logo</span>
                        </div>
                      )}
                    </div>
                    {localConfig.branding.logoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-7 px-2 hover:bg-destructive/10"
                        onClick={handleRemoveLogo}
                      >
                        <X className="h-3 w-3 mr-1" /> Remover
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Logotipo da Unidade</p>
                      <p className="text-xs text-muted-foreground">
                        Recomendado: SVG ou PNG transparente (512x512px).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                      />
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        disabled={isUploadingLogo}
                        className="cursor-pointer"
                      >
                        <label htmlFor="logo-upload">
                          {isUploadingLogo ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {isUploadingLogo ? "Enviando..." : "Escolher Arquivo"}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={localConfig.branding.name} onChange={e => setLocalConfig({ ...localConfig, branding: { ...localConfig.branding, name: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome Curto</Label>
                  <Input value={localConfig.branding.shortName} onChange={e => setLocalConfig({ ...localConfig, branding: { ...localConfig.branding, shortName: e.target.value } })} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Cor Primária</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      value={rgbToHex(hslToRgb(localConfig.branding.colors.primary))}
                      onChange={e => setLocalConfig({
                        ...localConfig,
                        branding: {
                          ...localConfig.branding,
                          colors: { ...localConfig.branding.colors, primary: hexToHsl(e.target.value) }
                        }
                      })}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{localConfig.branding.colors.primary}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Texto s/ Primária</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      value={rgbToHex(hslToRgb(localConfig.branding.colors.primaryForeground))}
                      onChange={e => setLocalConfig({
                        ...localConfig,
                        branding: {
                          ...localConfig.branding,
                          colors: { ...localConfig.branding.colors, primaryForeground: hexToHsl(e.target.value) }
                        }
                      })}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{localConfig.branding.colors.primaryForeground}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Cor Secundária</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      value={rgbToHex(hslToRgb(localConfig.branding.colors.accent))}
                      onChange={e => setLocalConfig({
                        ...localConfig,
                        branding: {
                          ...localConfig.branding,
                          colors: { ...localConfig.branding.colors, accent: hexToHsl(e.target.value) }
                        }
                      })}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{localConfig.branding.colors.accent}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Texto s/ Secundária</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md">
                    <input
                      type="color"
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      value={rgbToHex(hslToRgb(localConfig.branding.colors.accentForeground))}
                      onChange={e => setLocalConfig({
                        ...localConfig,
                        branding: {
                          ...localConfig.branding,
                          colors: { ...localConfig.branding.colors, accentForeground: hexToHsl(e.target.value) }
                        }
                      })}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{localConfig.branding.colors.accentForeground}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entity">
          <Card>
            <CardHeader><CardTitle>Entidade Principal</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome (Singular)</Label>
                  <Input value={localConfig.entity.entityName} onChange={e => setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, entityName: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome (Plural)</Label>
                  <Input value={localConfig.entity.entityNamePlural} onChange={e => setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, entityNamePlural: e.target.value } })} />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Campos Customizados</Label>
                {[1, 2, 3].map(num => {
                  const key = `field${num}` as keyof typeof localConfig.entity.customFields;
                  const field = localConfig.entity.customFields[key];
                  return (
                    <div key={key} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/20">
                      <Checkbox checked={field?.enabled} onCheckedChange={v => setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, customFields: { ...localConfig.entity.customFields, [key]: { ...field, enabled: v === true } } } })} />
                      <Input placeholder="Label" className="flex-1" value={field?.label || ""} onChange={e => setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, customFields: { ...localConfig.entity.customFields, [key]: { ...field, label: e.target.value } } } })} />
                      <Input placeholder="Dica" className="flex-1" value={field?.placeholder || ""} onChange={e => setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, customFields: { ...localConfig.entity.customFields, [key]: { ...field, placeholder: e.target.value } } } })} />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>Departamentos</Label>
                <div className="flex gap-2">
                  <Input value={newDepartment} onChange={e => setNewDepartment(e.target.value)} placeholder="Novo depto..." onKeyDown={e => { if (e.key === 'Enter') { setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, departments: [...localConfig.entity.departments, newDepartment] } }); setNewDepartment(""); } }} />
                  <Button onClick={() => { setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, departments: [...localConfig.entity.departments, newDepartment] } }); setNewDepartment(""); }}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {localConfig.entity.departments.map(d => (
                    <Badge key={d} variant="secondary">{d} <Trash2 className="h-3 w-3 ml-2 cursor-pointer" onClick={() => setLocalConfig({ ...localConfig, entity: { ...localConfig.entity, departments: localConfig.entity.departments.filter(x => x !== d) } })} /></Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader><CardTitle>Comportamento da IA</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nome da IA</Label>
                  <Input value={localConfig.ai.aiName} onChange={e => setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, aiName: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Input value={localConfig.ai.aiRole} onChange={e => setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, aiRole: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Input value={localConfig.ai.aiOrganization} onChange={e => setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, aiOrganization: e.target.value } })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tópicos de Ajuda</Label>
                <div className="flex gap-2">
                  <Input value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, helpTopics: [...localConfig.ai.helpTopics, newTopic] } }); setNewTopic(""); } }} />
                  <Button onClick={() => { setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, helpTopics: [...localConfig.ai.helpTopics, newTopic] } }); setNewTopic(""); }}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {localConfig.ai.helpTopics.map(t => (
                    <Badge key={t} variant="outline">{t} <Trash2 className="h-3 w-3 ml-2 cursor-pointer" onClick={() => setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, helpTopics: localConfig.ai.helpTopics.filter(x => x !== t) } })} /></Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prompt de Sistema</Label>
                <textarea className="w-full min-h-[150px] p-3 border rounded-lg bg-background font-mono text-sm" value={localConfig.ai.systemPromptTemplate} onChange={e => setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, systemPromptTemplate: e.target.value } })} />
              </div>

              <div className="space-y-2">
                <Label>Base de Conhecimento</Label>
                <textarea className="w-full min-h-[150px] p-3 border rounded-lg bg-background text-sm" value={localConfig.ai.knowledgeBase || ""} onChange={e => setLocalConfig({ ...localConfig, ai: { ...localConfig.ai, knowledgeBase: e.target.value } })} placeholder="Regras de negócio, detalhes da organização..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <div className="grid gap-6">
            <Card>
              <CardHeader><CardTitle>SLA e Horários</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Resposta (Minutos)</Label>
                    <Input type="number" value={localConfig.slaConfig?.responseTimeMinutes} onChange={e => setLocalConfig({ ...localConfig, slaConfig: { ...localConfig.slaConfig!, responseTimeMinutes: parseInt(e.target.value) || 0 } })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Resolução (Horas)</Label>
                    <Input type="number" value={localConfig.slaConfig?.resolutionTimeHours} onChange={e => setLocalConfig({ ...localConfig, slaConfig: { ...localConfig.slaConfig!, resolutionTimeHours: parseInt(e.target.value) || 0 } })} />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Horário de Funcionamento</Label>
                  <div className="space-y-2">
                    {localConfig.businessHours?.schedule.map((item, idx) => (
                      <div key={item.day} className="flex items-center gap-4 p-2 border rounded bg-muted/10">
                        <div className="w-24 font-medium">{item.day}</div>
                        <Input type="time" value={item.open} disabled={item.closed} onChange={e => {
                          const sched = [...localConfig.businessHours!.schedule];
                          sched[idx] = { ...item, open: e.target.value };
                          setLocalConfig({ ...localConfig, businessHours: { ...localConfig.businessHours!, schedule: sched } });
                        }} />
                        <span>-</span>
                        <Input type="time" value={item.close} disabled={item.closed} onChange={e => {
                          const sched = [...localConfig.businessHours!.schedule];
                          sched[idx] = { ...item, close: e.target.value };
                          setLocalConfig({ ...localConfig, businessHours: { ...localConfig.businessHours!, schedule: sched } });
                        }} />
                        <Switch checked={!item.closed} onCheckedChange={checked => {
                          const sched = [...localConfig.businessHours!.schedule];
                          sched[idx] = { ...item, closed: !checked };
                          setLocalConfig({ ...localConfig, businessHours: { ...localConfig.businessHours!, schedule: sched } });
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Módulos do Sistema</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Object.entries(localConfig.features).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <Label className="capitalize">{key.replace('enable', '').replace(/([A-Z])/g, ' $1')}</Label>
                    <Switch checked={val} onCheckedChange={checked => setLocalConfig({ ...localConfig, features: { ...localConfig.features, [key]: checked } })} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end gap-2 z-50">
        <Button variant="outline" onClick={() => setLocalConfig(config)}>Descartar Alterações</Button>
        <Button onClick={handleSave} size="lg"><Save className="h-4 w-4 mr-2" /> Salvar Configurações</Button>
      </div>
    </div>
  );
}