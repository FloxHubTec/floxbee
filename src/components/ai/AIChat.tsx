import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  needsHumanTransfer?: boolean;
  actionTaken?: string;
}

interface AIContext {
  servidor_nome?: string;
  servidor_matricula?: string;
  servidor_secretaria?: string;
  demanda_atual?: string;
}

interface AIChatProps {
  context?: AIContext;
  onHumanTransferRequest?: () => void;
  className?: string;
}

export const AIChat: React.FC<AIChatProps> = ({
  context,
  onHumanTransferRequest,
  className
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Add initial greeting
  useEffect(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `Olá${context?.servidor_nome ? `, ${context.servidor_nome}` : ""}! 👋 Sou a FloxBee, assistente virtual da Secretaria de Administração. Como posso ajudar você hoje?`,
      timestamp: new Date(),
    }]);
  }, [context?.servidor_nome]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare conversation history for API
      const apiMessages = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      apiMessages.push({ role: "user", content: userMessage.content });

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: apiMessages,
          context,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message || "Desculpe, não consegui processar sua mensagem.",
        timestamp: new Date(),
        needsHumanTransfer: data.needsHumanTransfer,
        actionTaken: data.actionTaken, // Adicionando feedback de ação
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Notify about human transfer if needed
      if (data.needsHumanTransfer) {
        toast({
          title: "Transferência solicitada",
          description: "Esta demanda será encaminhada para um atendente humano.",
        });
        onHumanTransferRequest?.();
      }
    } catch (error) {
      console.error("AI Chat error:", error);

      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      if (errorMessage.includes("429") || errorMessage.includes("Rate limit")) {
        toast({
          title: "Limite de requisições",
          description: "Aguarde um momento antes de enviar outra mensagem.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("402")) {
        toast({
          title: "Créditos insuficientes",
          description: "Entre em contato com o administrador.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao enviar mensagem",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
      }

      // Add error message to chat
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Desculpe, ocorreu um erro. Por favor, tente novamente ou aguarde um atendente humano.",
        timestamp: new Date(),
        needsHumanTransfer: true,
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          FloxBee IA
          <Badge variant="secondary" className="ml-auto">
            Assistente Virtual
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className={cn(
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  )}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2",
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-sm"
                    : "bg-background border border-border rounded-tl-sm"
                )}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                  {message.actionTaken && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-dashed border-primary/20 text-[10px] text-primary font-medium">
                      <Zap className="w-3 h-3" />
                      {message.actionTaken}
                    </div>
                  )}

                  {message.needsHumanTransfer && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-current/20 text-[10px] opacity-80 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Transferindo para atendente humano
                    </div>
                  )}

                  <p className={cn(
                    "text-[10px] mt-1.5 opacity-50",
                    message.role === "user" ? "text-right" : "text-left"
                  )}>
                    {message.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-secondary">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Digitando...
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
