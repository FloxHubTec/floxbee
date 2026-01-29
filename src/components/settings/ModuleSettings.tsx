import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function ModuleSettings() {
    const { config, updateConfig } = useTenant();
    const [localFeatures, setLocalFeatures] = useState(config.features);

    useEffect(() => {
        setLocalFeatures(config.features);
    }, [config.features]);

    const handleSave = async () => {
        try {
            await updateConfig({ ...config, features: localFeatures });
            toast.success("Módulos atualizados com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar módulos:", error);
            toast.error("Erro ao salvar configurações de módulos.");
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Módulos do Sistema</CardTitle>
                    <CardDescription>
                        Ative ou desative as funcionalidades globais disponíveis para sua unidade.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(localFeatures).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:border-primary/30 transition-colors">
                            <Label className="capitalize cursor-pointer flex-1 py-1" htmlFor={`module-${key}`}>
                                {key.replace('enable', '').replace(/([A-Z])/g, ' $1')}
                            </Label>
                            <Switch
                                id={`module-${key}`}
                                checked={val}
                                onCheckedChange={checked => setLocalFeatures({ ...localFeatures, [key]: checked })}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLocalFeatures(config.features)}>Descartar</Button>
                <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    Salvar Módulos
                </Button>
            </div>
        </div>
    );
}
