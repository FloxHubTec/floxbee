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
import { Loader2, Clock } from "lucide-react";
import type { TicketWithRelations } from "@/hooks/useTickets";

const ticketSchema = z.object({
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
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

const categorias = [
  "Acesso/Login",
  "Contracheque",
  "Férias",
  "Licença",
  "Benefícios",
  "Atualização Cadastral",
  "Reclamação",
  "Sugestão",
  "Outros",
];

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

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      categoria: "",
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
        categoria: ticket.categoria || "",
        prioridade: ticket.prioridade,
        contact_id: ticket.contact_id || "",
        assigned_to: ticket.assigned_to || "",
      });
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        categoria: "",
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
      </DialogContent>
    </Dialog>
  );
};
