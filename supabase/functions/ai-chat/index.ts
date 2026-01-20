import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Robust Authentication Extraction
    const authParts = authHeader.split(' ');
    const token = authParts.length > 1 ? authParts[1].trim() : authParts[0].trim();

    // Bypass check for Service Role (Internal calls)
    const isServiceCall = token === supabaseServiceKey;
    let user = null;
    let fallbackOwnerId = null;

    if (!isServiceCall) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authUser) {
        console.error("Auth validation error:", authError);
        return new Response(
          JSON.stringify({ error: `Auth validation failed: ${authError?.message || 'Invalid token'}` }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      user = authUser;

      // Get profile for the authenticated user to find owner_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('owner_id')
        .eq('user_id', user.id)
        .single();
      fallbackOwnerId = profile?.owner_id;
    }

    const body = await req.json();
    const { messages, context, stream = false }: ChatRequest & { context?: { owner_id?: string } } = body;
    const ownerId = context?.owner_id || fallbackOwnerId;

    // Fetch Personalized Prompt from Database
    let personalizedPrompt = SYSTEM_PROMPT;
    if (ownerId) {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'tenant_config')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (settings?.value?.ai) {
        const config = settings.value;
        const ai = config.ai;
        let template = ai.systemPromptTemplate || SYSTEM_PROMPT;

        // Simple Template Parsing
        template = template
          .replace(/{{aiName}}/g, ai.aiName || "FloxBee")
          .replace(/{{aiRole}}/g, ai.aiRole || "assistente virtual")
          .replace(/{{aiOrganization}}/g, ai.aiOrganization || "Secretaria de Administração Municipal")
          .replace(/{{entityNamePlural}}/g, config.entity?.entityNamePlural || "servidores");

        // Handle Topics List
        if (ai.helpTopics && Array.isArray(ai.helpTopics)) {
          const topicsList = ai.helpTopics.map((t: string) => `   - ${t}`).join('\n');
          template = template.replace(/{{#helpTopics}}[\s\S]*?{{\/helpTopics}}/, topicsList);
        }

        personalizedPrompt = template;
        console.log("Using customized prompt from database for owner:", ownerId);
      }
    }

    // Add context to prompt
    if (context) {
      personalizedPrompt += `\n\nContexto atual:`;
      if (context.servidor_nome) personalizedPrompt += `\n- Nome: ${context.servidor_nome}`;
      if (context.servidor_matricula) personalizedPrompt += `\n- Matrícula: ${context.servidor_matricula}`;
      if (context.servidor_secretaria) personalizedPrompt += `\n- Secretaria: ${context.servidor_secretaria}`;
      if (context.demanda_atual) personalizedPrompt += `\n- Demanda: ${context.demanda_atual}`;
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: personalizedPrompt },
          ...messages,
        ],
        stream,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "";
    const needsHumanTransfer = assistantMessage.includes("[TRANSFERIR_HUMANO]");
    const cleanMessage = assistantMessage.replace("[TRANSFERIR_HUMANO]", "").trim();

    return new Response(
      JSON.stringify({ message: cleanMessage, needsHumanTransfer, usage: data.usage }),
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
