import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface TicketWithRelations extends Ticket {
  contact: Contact | null;
  assignee_profile: Profile | null;
}

const SLA_HOURS: Record<string, number> = {
  urgente: 4,
  alta: 8,
  media: 24,
  baixa: 72,
};

const calculateSLADeadline = (prioridade: string): string => {
  const hours = SLA_HOURS[prioridade] || 24;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline.toISOString();
};

export const useTickets = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          contact:contacts(*),
          assignee_profile:profiles!tickets_assigned_to_fkey(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TicketWithRelations[];
    },
  });

  React.useEffect(() => {
    const channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
};

export const useTicket = (ticketId: string | null) => {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          contact:contacts(*),
          assignee_profile:profiles!tickets_assigned_to_fkey(*)
        `)
        .eq("id", ticketId)
        .maybeSingle();

      if (error) throw error;
      return data as TicketWithRelations | null;
    },
    enabled: !!ticketId,
  });
};

// --- CRIAÇÃO DE TICKET ---
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: {
      titulo: string;
      descricao?: string;
      prioridade?: "baixa" | "media" | "alta" | "urgente";
      contact_id?: string | null;
      assigned_to?: string | null;
      department_id?: string | null; // Tipagem simples
    }) => {
      const prioridade = ticket.prioridade || "media";
      
      console.log("Criando Ticket - Payload:", ticket); // Debug: Verifique no console se department_id tem valor

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          titulo: ticket.titulo,
          descricao: ticket.descricao,
          prioridade: prioridade,
          contact_id: ticket.contact_id,
          assigned_to: ticket.assigned_to,
          department_id: ticket.department_id, // Envia direto o que recebeu
          status: ticket.assigned_to ? "em_analise" : "aberto_ia",
          sla_deadline: calculateSLADeadline(prioridade)
        })
        .select()
        .single();

      if (error) {
        console.error("Erro Supabase Create:", error);
        throw error;
      }

      if (ticket.contact_id) {
        try {
          await supabase.functions.invoke("ticket-notification", {
            body: { ticket_id: data.id, event_type: "created" },
          });
        } catch (e) { console.error(e); }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar ticket: " + error.message);
    }
  });
};

const logTicketHistory = async (params: {
  ticketId: string;
  oldStatus?: string; newStatus?: string;
  oldPriority?: string; newPriority?: string;
  oldAssignedTo?: string; newAssignedTo?: string;
  note?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();

  await supabase.from("ticket_history").insert({
    ticket_id: params.ticketId,
    created_by: profile?.id,
    old_status: params.oldStatus, new_status: params.newStatus,
    old_priority: params.oldPriority, new_priority: params.newPriority,
    old_assigned_to: params.oldAssignedTo, new_assigned_to: params.newAssignedTo,
    note: params.note,
  });
};

// --- ATUALIZAÇÃO DE TICKET ---
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, data }: {
      ticketId: string;
      data: {
        titulo: string;
        descricao?: string;
        prioridade?: "baixa" | "media" | "alta" | "urgente";
        contact_id?: string | null;
        assigned_to?: string | null;
        department_id?: string | null;
      };
    }) => {
      console.log("Atualizando Ticket - Payload:", data); // Debug

      const updateData: any = { ...data };
      
      if (data.prioridade) {
        updateData.sla_deadline = calculateSLADeadline(data.prioridade);
      }
      if (data.assigned_to) {
        updateData.status = "em_analise";
      }

      const { data: oldTicket } = await supabase
        .from("tickets")
        .select("status, prioridade, assigned_to")
        .eq("id", ticketId)
        .single();

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      await logTicketHistory({
        ticketId,
        oldStatus: oldTicket?.status,
        newStatus: updateData.status || oldTicket?.status,
        oldPriority: oldTicket?.prioridade,
        newPriority: data.prioridade || oldTicket?.prioridade,
        oldAssignedTo: oldTicket?.assigned_to,
        newAssignedTo: data.assigned_to || oldTicket?.assigned_to,
        note: "Dados do ticket atualizados",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket"] });
      toast.success("Ticket atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    }
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, status, assignedTo, oldStatus, contactId }: {
      ticketId: string;
      status: "aberto_ia" | "em_analise" | "pendente" | "concluido";
      assignedTo?: string; oldStatus?: string; contactId?: string;
    }) => {
      const updateData: any = { status };
      if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
      if (status === "concluido") updateData.resolved_at = new Date().toISOString();

      const { data: oldTicket } = await supabase.from("tickets").select("status, assigned_to").eq("id", ticketId).single();
      const { error } = await supabase.from("tickets").update(updateData).eq("id", ticketId);

      if (error) throw error;

      await logTicketHistory({
        ticketId,
        oldStatus: oldTicket?.status, newStatus: status,
        oldAssignedTo: oldTicket?.assigned_to, newAssignedTo: assignedTo || oldTicket?.assigned_to,
        note: `Status alterado de ${oldTicket?.status} para ${status}`,
      });

      if (oldStatus && oldStatus !== status && contactId) {
        try {
          const eventType = status === "concluido" ? "resolved" : "updated";
          await supabase.functions.invoke("ticket-notification", {
            body: { ticket_id: ticketId, event_type: eventType, old_status: oldStatus, new_status: status },
          });
        } catch (e) { console.error(e); }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useAssignTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, assignedTo }: { ticketId: string; assignedTo: string }) => {
      const { error } = await supabase.from("tickets").update({ assigned_to: assignedTo, status: "em_analise" }).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); },
  });
};

export const useDeleteTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); toast.success("Ticket excluído!"); },
  });
};

export const useAgentes = () => {
  return useQuery({
    queryKey: ["agentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });
};

export const useContacts = () => {
  return useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });
};

export const useTicketHistory = (ticketId: string | null) => {
  return useQuery({
    queryKey: ["ticket-history", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_history")
        .select(`*, created_by_profile:profiles!ticket_history_created_by_fkey(nome)`)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
};