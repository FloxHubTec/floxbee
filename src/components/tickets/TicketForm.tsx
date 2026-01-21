import React, { useEffect } from "react";
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
import { Loader2, Clock, History as HistoryIcon, ArrowRight } from "lucide-react";
import { useTicketHistory, type TicketWithRelations } from "@/hooks/useTickets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const ticketSchema = z.object({
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
  contact_id: z.string().optional(),
  assigned_to: z.string().optional(),
});

export type TicketFormValues = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketFormValues) => Promise<void>;
  isLoading?: boolean;
  ticket?: TicketWithRelations | null;
  contacts?: Array<{ id: string; nome: string }>;
  agentes?: Array<{ id: string; nome: string }>;
}


// SLA em horas baseado na prioridade
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberto: "Aberto",
      em_atendimento: "Em Atendimento",
      pendente: "Pendente",
      resolvido: "Resolvido",
      cancelado: "Cancelado"
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
    },
  });

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      form.reset({
        titulo: ticket.titulo,
        descricao: ticket.descricao || "",
        prioridade: ticket.prioridade,
        contact_id: ticket.contact_id || "",
        assigned_to: ticket.assigned_to || "",
      });
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        prioridade: "media",
        contact_id: "",
        assigned_to: "",
      });
    }
  }, [ticket, form]);

  const handleSubmit = async (data: TicketFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  const selectedPriority = form.watch("prioridade");
  const slaHours = SLA_HOURS[selectedPriority];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
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
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
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
                    <FormItem>
                      <FormLabel>Atribuir para</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
