import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

// Tipos derivados do Banco de Dados
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

// Interfaces Extendidas para Joins
export interface ConversationWithContact extends ConversationRow {
  contact: ContactRow | null;
}

export interface MessageWithSender extends MessageRow {
  sender_name?: string;
}

// --- 1. HOOK DE CONVERSAS (LISTAGEM) ---
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
    // Atualiza periodicamente para garantir sincronia
    refetchInterval: 60000,
  });

  // Realtime Subscription (Escuta mudanças na lista)
  useEffect(() => {
    const channel = supabase
      .channel("conversations-list-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          console.log("Realtime update:", payload);
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

// --- 2. HOOK DE MENSAGENS (CHAT) ---
export const useMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MessageRow[];
    },
    enabled: !!conversationId,
  });

  // Realtime para Mensagens Novas
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Adiciona a nova mensagem ao cache imediatamente
          queryClient.setQueryData(
            ["messages", conversationId],
            (old: MessageRow[] | undefined) => [...(old || []), payload.new as MessageRow]
          );
          // Invalida para garantir consistência
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
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
      senderType, // 'user' (agente) ou 'contact' (cliente)
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
      // 1. Preparar payload da mensagem
      const messageData: any = {
        conversation_id: conversationId,
        content,
        sender_type: senderType,
        sender_id: senderId,
        status: "sent",
        message_type: attachmentUrl ? "attachment" : "text",
      };

      // Adicionar metadados se for anexo
      if (attachmentUrl) {
        messageData.metadata = {
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_name: attachmentName,
        };
      }

      // 2. Inserir Mensagem
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert(messageData)
        .select()
        .single();

      if (messageError) throw messageError;

      // 3. Atualizar Conversa (última mensagem e contador)
      // Se quem enviou foi o Agente ('user'), zera o contador de não lidas
      const updateData: any = {
        last_message_at: new Date().toISOString(),
      };

      if (senderType === 'user' || senderType === 'agente') {
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
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

// --- 4. ENVIAR MENSAGEM VIA IA ---
export const useSendAIMessage = () => {
  const sendMessage = useSendMessage();

  return useMutation({
    mutationFn: async ({
      conversationId,
      userMessage,
      context,
    }: {
      conversationId: string;
      userMessage: string;
      context?: any;
    }) => {
      // Chama a Edge Function
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{ role: "user", content: userMessage }],
          context,
        },
      });

      if (error) throw error;

      // Salva a resposta da IA como mensagem
      await sendMessage.mutateAsync({
        conversationId,
        content: data.message || "Sem resposta da IA",
        senderType: "ia",
      });

      return data;
    },
    onError: (error) => {
      toast({
        title: "Erro na IA",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

// --- 5. RESOLVER/CONCLUIR CONVERSA ---
export const useResolveConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // Pegamos o usuário atual para log (opcional, se tiver coluna resolved_by)
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("conversations")
        .update({
          status: "concluido", // ou 'resolvido', dependendo do seu check constraint
          resolved_at: new Date().toISOString(),
          // resolved_by: user?.id, // Descomente APENAS se tiver criado essa coluna no banco
        })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({ title: "Conversa finalizada!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao finalizar",
        description: error.message,
        variant: "destructive",
      });
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
          resolved_at: null,
        })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({ title: "Conversa reaberta com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao reabrir conversa",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};

// --- 7. TRANSFERIR CONVERSA ---
export const useTransferConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      assignTo,
    }: {
      conversationId: string;
      assignTo: string | null; // Pode ser null para "não atribuído"
    }) => {
      const { error } = await supabase
        .from("conversations")
        .update({
          assigned_to: assignTo,
          // Se transferiu para um humano, desativa bot se houver
          // is_bot_active: false, 
        })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({ title: "Conversa transferida com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao transferir",
        description: error.message,
        variant: "destructive",
      });
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

// --- 9. ATIVAR/DESATIVAR IA ---
export const useToggleBotStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      isActive,
    }: {
      conversationId: string;
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ is_bot_active: isActive })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: variables.isActive ? "IA ativada!" : "IA desativada!",
        description: variables.isActive
          ? "A IA responderá automaticamente às mensagens."
          : "A IA não responderá mais automaticamente."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao alterar status da IA",
        description: error.message,
        variant: "destructive",
      });
    }
  });
};