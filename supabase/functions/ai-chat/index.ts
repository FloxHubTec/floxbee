import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    servidor_nome?: string;
    servidor_matricula?: string;
    servidor_secretaria?: string;
    demanda_atual?: string;
  };
  stream?: boolean;
}

const SYSTEM_PROMPT = `Você é a assistente virtual da Secretaria de Administração Municipal. Seu nome é FloxBee.

Suas responsabilidades:
1. Atender servidores públicos com cordialidade e eficiência
2. Responder dúvidas sobre:
   - Segunda via de contracheque e documentos
   - Férias, licenças e afastamentos
   - Progressão de carreira
   - Benefícios e auxílios
   - Prazos e procedimentos administrativos
3. Coletar informações quando necessário (nome, matrícula, secretaria)
4. Encaminhar demandas complexas para atendimento humano

Regras:
- Seja sempre educado e profissional
- Responda em português brasileiro
- Se não souber a resposta, informe que vai encaminhar para um atendente humano
- Nunca invente informações sobre prazos ou valores
- Pergunte a matrícula do servidor para personalizar o atendimento

Quando identificar uma demanda complexa que precisa de atendimento humano, responda com a flag [TRANSFERIR_HUMANO] no início da mensagem.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, stream = false }: ChatRequest = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Build personalized system prompt with context
    let personalizedPrompt = SYSTEM_PROMPT;
    if (context) {
      personalizedPrompt += `\n\nContexto do servidor atual:`;
      if (context.servidor_nome) personalizedPrompt += `\n- Nome: ${context.servidor_nome}`;
      if (context.servidor_matricula) personalizedPrompt += `\n- Matrícula: ${context.servidor_matricula}`;
      if (context.servidor_secretaria) personalizedPrompt += `\n- Secretaria: ${context.servidor_secretaria}`;
      if (context.demanda_atual) personalizedPrompt += `\n- Demanda em andamento: ${context.demanda_atual}`;
    }

    const allMessages = [
      { role: "system", content: personalizedPrompt },
      ...messages,
    ];

    console.log("AI Chat Request (OpenAI):", { messagesCount: messages.length, hasContext: !!context, stream });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: allMessages,
        stream,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key invalid or insufficient credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "";
    
    // Check if transfer to human is needed
    const needsHumanTransfer = assistantMessage.includes("[TRANSFERIR_HUMANO]");
    const cleanMessage = assistantMessage.replace("[TRANSFERIR_HUMANO]", "").trim();

    console.log("OpenAI Response:", { needsHumanTransfer, messageLength: cleanMessage.length });

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        needsHumanTransfer,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
