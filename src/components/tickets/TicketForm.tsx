import React, { useEffect } from "react";
import { useActiveDepartments } from "@/hooks/useDepartments";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, Clock, History as HistoryIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTicketHistory, type TicketWithRelations } from "@/hooks/useTickets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Schema flexível para department_id
const ticketSchema = z.object({
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
  contact_id: z.string().optional(),
  assigned_to: z.string().optional(),
  // Permite string (UUID), undefined ou null
  department_id: z.string().optional().nullable().or(z.literal("")),
});

export type TicketFormValues = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  ticket?: TicketWithRelations | null;
  contacts?: Array<{ id: string; nome: string }>;
  agentes?: Array<{ id: string; nome: string }>;
}

const SLA_HOURS = {
  urgente: 4,
  alta: 8,
  media: 24,
  baixa: 72,
};

export const TicketForm: React.FC<TicketFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  ticket,
  contacts = [],
  agentes = [],
}) => {
  const isEditing = !!ticket;
  const { data: history, isLoading: isLoadingHistory } = useTicketHistory(ticket?.id || null);
  const { data: departamentos = [] } = useActiveDepartments ? useActiveDepartments() : { data: [] };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberto: "Aberto",
      em_atendimento: "Em Atendimento",
      pendente: "Pendente",
      resolvido: "Resolvido",
      cancelado: "Cancelado",
      em_analise: "Em Análise",
      aberto_ia: "Aberto (IA)"
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      baixa: "Baixa",
      media: "Média",
      alta: "Alta",
      urgente: "Urgente"
    };
    return labels[priority] || priority;
  };

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      prioridade: "media",
      contact_id: "",
      assigned_to: "",
      department_id: "", // String vazia inicial
    },
  });

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      form.reset({
        titulo: ticket.titulo,
        descricao: ticket.descricao || "",
        prioridade: (ticket.prioridade as "baixa" | "media" | "alta" | "urgente") || "media",
        contact_id: ticket.contact_id || "",
        assigned_to: ticket.assigned_to || "",
        // Converte null do banco para "" do form
        department_id: ticket.department_id || "",
      });
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        prioridade: "media",
        contact_id: "",
        assigned_to: "",
        department_id: "",
      });
    }
  }, [ticket, form]);

  const handleSubmit = async (data: TicketFormValues) => {
    // Tratamento explícito: Converte vazio/"__none__" para NULL, senão usa o valor string (UUID)
    const deptId = (!data.department_id || data.department_id === "" || data.department_id === "__none__")
      ? null
      : data.department_id;

    const contactId = (!data.contact_id || data.contact_id === "" || data.contact_id === "__none__")
      ? null
      : data.contact_id;

    const assignedTo = (!data.assigned_to || data.assigned_to === "" || data.assigned_to === "__none__")
      ? null
      : data.assigned_to;

    const formattedData = {
      ...data,
      department_id: deptId,
      contact_id: contactId,
      assigned_to: assignedTo,
    };

    // Debug: Veja no console do navegador se 'department_id' é um UUID válido ou null
    console.log("Formulário enviando:", formattedData);

    await onSubmit(formattedData);

    if (!isEditing) {
      form.reset();
    }
  };

  const selectedPriority = form.watch("prioridade");
  const slaHours = SLA_HOURS[selectedPriority || "media"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar Ticket #${ticket.numero}` : "Novo Ticket"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva brevemente o problema" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa (72h SLA)</SelectItem>
                        <SelectItem value="media">Média (24h SLA)</SelectItem>
                        <SelectItem value="alta">Alta (8h SLA)</SelectItem>
                        <SelectItem value="urgente">Urgente (4h SLA)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      SLA: {slaHours}h para resolução
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {contacts.length > 0 && (
                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vincular contato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {agentes.length > 0 && (
                <FormField
                  control={form.control}
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Atribuir para</FormLabel>
                      {agentes.length > 3 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? agentes.find((agente) => agente.id === field.value)?.nome
                                  : "Selecione agente"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar agente..." />
                              <CommandList>
                                <CommandEmpty>Nenhum agente encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="__none__"
                                    onSelect={() => {
                                      field.onChange("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === "" ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    Não atribuído
                                  </CommandItem>
                                  {agentes.map((agente) => (
                                    <CommandItem
                                      key={agente.id}
                                      value={agente.nome}
                                      onSelect={() => {
                                        field.onChange(agente.id);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          agente.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {agente.nome}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Select
                          onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione agente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Não atribuído</SelectItem>
                            {agentes.map((agente) => (
                              <SelectItem key={agente.id} value={agente.id}>
                                {agente.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* CAMPO DE DEPARTAMENTO */}
              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        // Quando seleciona, salva o UUID ou string vazia
                        field.onChange(val === "__none__" ? "" : val);
                      }}
                      value={field.value || "__none__"} // Se null/vazio, mostra "Nenhum"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {departamentos.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isEditing ? "Salvar Alterações" : "Criar Ticket"}
              </Button>
            </div>
          </form>
        </Form>

        {isEditing && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HistoryIcon className="w-4 h-4" />
                Histórico de Interações
              </div>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {isLoadingHistory ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : history?.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    Nenhuma interação registrada ainda.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history?.map((item) => (
                      <div key={item.id} className="text-xs space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {item.created_by_profile?.nome || "Sistema"}
                          </span>
                          <span>
                            {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>

                        <div className="bg-muted/50 p-2 rounded-sm space-y-1">
                          {item.new_status && item.new_status !== item.old_status && (
                            <div className="flex items-center gap-1">
                              Status: <Badge variant="outline">{getStatusLabel(item.old_status || "")}</Badge>
                              <ArrowRight className="w-3 h-3" />
                              <Badge>{getStatusLabel(item.new_status)}</Badge>
                            </div>
                          )}

                          {item.new_priority && item.new_priority !== item.old_priority && (
                            <div className="flex items-center gap-1">
                              Prioridade: <Badge variant="outline" className="capitalize">{getPriorityLabel(item.old_priority || "")}</Badge>
                              <ArrowRight className="w-3 h-3" />
                              <Badge className="capitalize">{getPriorityLabel(item.new_priority)}</Badge>
                            </div>
                          )}

                          {item.new_assigned_to !== item.old_assigned_to && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span>Atribuição alterada</span>
                            </div>
                          )}

                          {item.note && (
                            <p className="text-foreground italic mt-1 font-medium">
                              "{item.note}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog >
  );
};