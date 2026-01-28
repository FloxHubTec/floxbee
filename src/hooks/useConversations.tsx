import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// --- TIPOS ---

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

export interface ConversationWithContact extends ConversationRow {
  contact: ContactRow | null;
}

export interface MessageWithSender extends MessageRow {
  // Tornamos opcional e removemos a dependência estrita do banco
  sender_profile?: {
    nome: string | null;
  } | null;
}

// --- 1. HOOK DE CONVERSAS (LISTA LATERAL) ---
export const useConversations = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          contact:contacts(*)
        `)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar conversas:", error);
        throw error;
      }

      return data as ConversationWithContact[];
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("public:conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// --- 2. HOOK DE MENSAGENS (CHAT) - CORRIGIDO ---
export const useMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      // CORREÇÃO: Removemos o join "sender_profile:sender_id(nome)" 
      // pois o sender_id não tem FK estrita no banco (pode ser contato ou profile).
      // Isso resolve o erro PGRST200.
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Buscar nomes dos perfis para mensagens de agentes
      const agentIds = [...new Set(data
        .filter(m => m.sender_type === 'user' || m.sender_type === 'agente')
        .map(m => m.sender_id)
        .filter(Boolean)
      )];

      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", agentIds);

        const profileMap = Object.fromEntries(
          (profiles || []).map(p => [p.id, p.nome])
        );

        return data.map(m => ({
          ...m,
          sender_profile: m.sender_id && profileMap[m.sender_id]
            ? { nome: profileMap[m.sender_id] }
            : null
        })) as MessageWithSender[];
      }

      return data as MessageWithSender[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          await queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
};

// --- 3. ENVIAR MENSAGEM ---
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      senderType,
      senderId,
      attachmentUrl,
      attachmentType,
      attachmentName,
    }: {
      conversationId: string;
      content: string;
      senderType: string;
      senderId?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
    }) => {
      const messageData: any = {
        conversation_id: conversationId,
        content,
        sender_type: senderType,
        sender_id: senderId,
        status: "sent",
        message_type: attachmentUrl ? "attachment" : "text",
      };

      if (attachmentUrl) {
        messageData.metadata = {
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_name: attachmentName,
        };
      }

      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert(messageData)
        .select()
        .single();

      if (messageError) throw messageError;

      // --- INTEGRAÇÃO WHATSAPP ---
      if (['user', 'agente'].includes(senderType)) {
        try {
          // 1. Busca a conversa para pegar o telefone e owner_id
          const { data: conv } = await supabase
            .from("conversations")
            .select("owner_id, contact:contacts(whatsapp)")
            .eq("id", conversationId)
            .single();

          const to = (conv?.contact as any)?.whatsapp;
          const owner_id = conv?.owner_id;

          if (to) {
            // 2. Chama a Edge Function whatsapp-send
            await supabase.functions.invoke("whatsapp-send", {
              body: {
                to,
                message: content,
                owner_id,
                type: "text"
              },
            });
          }
        } catch (wsError) {
          console.error("Erro ao disparar WhatsApp:", wsError);
          // Opcional: toast.error("Mensagem salva, mas erro ao enviar para WhatsApp");
        }
      }

      const updateData: any = {
        last_message_at: new Date().toISOString(),
      };

      if (['user', 'agente', 'ia'].includes(senderType)) {
        updateData.unread_count = 0;
      }

      const { error: convError } = await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", conversationId);

      if (convError) throw convError;

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    }
  });
};

// --- 4. ENVIAR MENSAGEM DA IA ---
export const useSendAIMessage = () => {
  const sendMessage = useSendMessage();

  return useMutation({
    mutationFn: async ({ conversationId, userMessage, context }: any) => {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{ role: "user", content: userMessage }],
          context
        },
      });

      if (error) throw error;

      await sendMessage.mutateAsync({
        conversationId,
        content: data.message || "Sem resposta da IA",
        senderType: "ia",
      });

      return data;
    },
    onError: (error) => {
      toast.error("Erro na resposta da IA: " + error.message);
    }
  });
};

// --- 5. RESOLVER CONVERSA ---
export const useResolveConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({
          status: "concluido",
          resolved_at: new Date().toISOString()
        })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa finalizada!");
    },
    onError: (error) => {
      toast.error("Erro ao finalizar: " + error.message);
    }
  });
};

// --- 6. REABRIR CONVERSA ---
export const useReopenConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({
          status: "ativo",
          resolved_at: null
        })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa reaberta!");
    },
    onError: (error) => {
      toast.error("Erro ao reabrir: " + error.message);
    }
  });
};

// --- 7. TRANSFERIR CONVERSA ---
export const useTransferConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, assignTo }: { conversationId: string; assignTo: string | null }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_to: assignTo })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa transferida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao transferir: " + error.message);
    }
  });
};

// --- 8. MARCAR COMO LIDA ---
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// --- 9. ATIVAR/DESATIVAR IA (BOT) ---
export const useToggleBotStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, isActive }: { conversationId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ is_bot_active: isActive })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(variables.isActive ? "IA ativada" : "IA pausada");
    },
    onError: (error) => {
      toast.error("Erro ao alterar status da IA: " + error.message);
    }
  });
};

// --- 10. DELETAR CONVERSA ---
export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir conversa: " + error.message);
    }
  });
};