import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Plus } from "lucide-react";
import {
  TriggerType,
  TriggerConfig,
  AutomationRuleWithTemplate,
  TRIGGER_TYPES
} from "@/hooks/useAutomations";

const automationSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  tipo: z.string(),
  trigger_type: z.string(),
  keywords: z.string().optional(),
  delay_minutes: z.number().optional(),
  business_hours_start: z.string().optional(),
  business_hours_end: z.string().optional(),
  use_template: z.boolean(),
  template_id: z.string().optional(),
  mensagem: z.string().optional(),
  ativo: z.boolean(),
});

export type AutomationFormValues = z.infer<typeof automationSchema>;

interface Template {
  id: string;
  nome: string;
  conteudo: string;
}

interface AutomationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    nome: string;
    tipo: string;
    trigger_config: TriggerConfig;
    mensagem?: string;
    template_id?: string;
    ativo: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
  rule?: AutomationRuleWithTemplate | null;
  templates?: Template[];
}

export const AutomationForm: React.FC<AutomationFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  rule,
  templates = [],
}) => {
  const isEditing = !!rule;
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      nome: "",
      tipo: "resposta_automatica",
      trigger_type: "keyword",
      keywords: "",
      delay_minutes: 5,
      business_hours_start: "08:00",
      business_hours_end: "18:00",
      use_template: false,
      template_id: "",
      mensagem: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (rule) {
      const config = rule.trigger_config as unknown as TriggerConfig;
      form.reset({
        nome: rule.nome,
        tipo: rule.tipo,
        trigger_type: config?.type || "keyword",
        keywords: "",
        delay_minutes: config?.delay_minutes || 5,
        business_hours_start: config?.business_hours?.start || "08:00",
        business_hours_end: config?.business_hours?.end || "18:00",
        use_template: !!rule.template_id,
        template_id: rule.template_id || "",
        mensagem: rule.mensagem || "",
        ativo: rule.ativo ?? true,
      });
      setKeywords(config?.keywords || []);
    } else {
      form.reset({
        nome: "",
        tipo: "resposta_automatica",
        trigger_type: "keyword",
        keywords: "",
        delay_minutes: 5,
        business_hours_start: "08:00",
        business_hours_end: "18:00",
        use_template: false,
        template_id: "",
        mensagem: "",
        ativo: true,
      });
      setKeywords([]);
    }
  }, [rule, form]);

  const addKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSubmit = async (data: AutomationFormValues) => {
    const triggerConfig: TriggerConfig = {
      type: data.trigger_type as TriggerType,
    };

    if (data.trigger_type === "keyword") {
      triggerConfig.keywords = keywords;
    }

    if (data.trigger_type === "no_response") {
      triggerConfig.delay_minutes = data.delay_minutes;
    }

    if (data.trigger_type === "business_hours") {
      triggerConfig.business_hours = {
        start: data.business_hours_start || "08:00",
        end: data.business_hours_end || "18:00",
        days: [1, 2, 3, 4, 5], // Mon-Fri
      };
    }

    await onSubmit({
      nome: data.nome,
      tipo: data.tipo,
      trigger_config: triggerConfig,
      mensagem: data.use_template ? undefined : data.mensagem,
      template_id: data.use_template ? data.template_id : undefined,
      ativo: data.ativo,
      // @ts-ignore - 'config' and 'trigger_config' redundancy in DB
      config: triggerConfig
    });

    form.reset();
    setKeywords([]);
  };

  const triggerType = form.watch("trigger_type");
  const useTemplate = form.watch("use_template");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Automação" : "Nova Automação"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Automação *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Resposta de boas-vindas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gatilho</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gatilho" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRIGGER_TYPES.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          <div>
                            <span>{trigger.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {TRIGGER_TYPES.find(t => t.value === field.value)?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Keywords input for keyword trigger */}
            {triggerType === "keyword" && (
              <div className="space-y-2">
                <FormLabel>Palavras-chave</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma palavra-chave"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addKeyword}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="gap-1">
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  A automação será ativada quando a mensagem contiver qualquer uma dessas palavras
                </FormDescription>
              </div>
            )}

            {/* Delay for no_response trigger */}
            {triggerType === "no_response" && (
              <FormField
                control={form.control}
                name="delay_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo sem resposta (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Aguardar X minutos antes de enviar resposta automática
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Business hours config */}
            {triggerType === "business_hours" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="business_hours_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início do expediente</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business_hours_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim do expediente</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="use_template"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Usar template</FormLabel>
                    <FormDescription>
                      Usar um template de mensagem existente
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {useTemplate ? (
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.filter(t => t.id).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="mensagem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Digite a mensagem automática..."
                          className="min-h-[100px]"
                          {...field}
                        />
                        <div className="flex flex-wrap gap-2">
                          {["nome", "whatsapp", "email", "matricula", "secretaria"].map((v) => (
                            <Badge
                              key={v}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                              onClick={() => {
                                const current = form.getValues("mensagem") || "";
                                form.setValue("mensagem", current + ` {{${v}}}`);
                              }}
                            >
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Clique nas variáveis acima para inseri-las na mensagem
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription>
                      Automação será executada quando ativa
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Criar Automação"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
