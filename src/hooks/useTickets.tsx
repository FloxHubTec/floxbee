import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface TicketWithRelations extends Ticket {
  contact: Contact | null;
  assignee_profile: Profile | null;
}

// SLA em horas baseado na prioridade
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

  // Realtime subscription
  React.useEffect(() => {
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: {
      titulo: string;
      descricao?: string;
      categoria?: string;
      prioridade?: "baixa" | "media" | "alta" | "urgente";
      contact_id?: string;
      assigned_to?: string;
    }) => {
      const prioridade = ticket.prioridade || "media";
      const slaDeadline = calculateSLADeadline(prioridade);

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          titulo: ticket.titulo,
          descricao: ticket.descricao,
          categoria: ticket.categoria,
          prioridade: prioridade,
          contact_id: ticket.contact_id || null,
          assigned_to: ticket.assigned_to || null,
          status: ticket.assigned_to ? "em_analise" : "aberto_ia",
          sla_deadline: slaDeadline,
        })
        .select()
        .single();

      if (error) throw error;

      // Send ticket notification if contact exists
      if (ticket.contact_id) {
        try {
          await supabase.functions.invoke("ticket-notification", {
            body: {
              ticket_id: data.id,
              event_type: "created",
            },
          });
        } catch (notifError) {
          console.error("Error sending ticket notification:", notifError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      data,
    }: {
      ticketId: string;
      data: {
        titulo: string;
        descricao?: string;
        categoria?: string;
        prioridade?: "baixa" | "media" | "alta" | "urgente";
        contact_id?: string | null;
        assigned_to?: string | null;
      };
    }) => {
      const updateData: Record<string, unknown> = { ...data };

      // Recalculate SLA if priority changed
      if (data.prioridade) {
        updateData.sla_deadline = calculateSLADeadline(data.prioridade);
      }

      // If assigning to someone, move to em_analise
      if (data.assigned_to) {
        updateData.status = "em_analise";
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket"] });
    },
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      status,
      assignedTo,
      oldStatus,
      contactId,
    }: {
      ticketId: string;
      status: "aberto_ia" | "em_analise" | "pendente" | "concluido";
      assignedTo?: string;
      oldStatus?: string;
      contactId?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };

      if (assignedTo !== undefined) {
        updateData.assigned_to = assignedTo;
      }

      if (status === "concluido") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      // Send notification for status change
      if (oldStatus && oldStatus !== status && contactId) {
        try {
          const eventType = status === "concluido" ? "resolved" : "updated";
          await supabase.functions.invoke("ticket-notification", {
            body: {
              ticket_id: ticketId,
              event_type: eventType,
              old_status: oldStatus,
              new_status: status,
            },
          });
        } catch (notifError) {
          console.error("Error sending ticket notification:", notifError);
        }
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
    mutationFn: async ({
      ticketId,
      assignedTo,
    }: {
      ticketId: string;
      assignedTo: string;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({
          assigned_to: assignedTo,
          status: "em_analise",
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useDeleteTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};

export const useAgentes = () => {
  return useQuery({
    queryKey: ["agentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("ativo", true);

      if (error) throw error;
      return data;
    },
  });
};

export const useContacts = () => {
  return useQuery({
    queryKey: ["contacts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });
};
