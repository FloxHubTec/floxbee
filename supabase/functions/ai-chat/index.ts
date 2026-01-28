import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    servidor_nome?: string;
    servidor_matricula?: string;
    servidor_secretaria?: string;
    demanda_atual?: string;
    contact_id?: string;
    conversation_id?: string;
    owner_id?: string;
    whatsapp_number?: string;
  };
  stream?: boolean;
}

const SYSTEM_PROMPT = `Você é a assistente virtual da Secretaria de Administração Municipal. Seu nome é FloxBee.

Suas responsabilidades:
1. Atender servidores públicos com cordialidade e eficiência.
2. Responder dúvidas sobre: contracheque, férias, licenças, carreira e benefícios.
3. Coletar e atualizar informações (nome, matrícula, secretaria).
4. Abrir tickets de suporte quando o problema não puder ser resolvido imediatamente.
5. Adicionar tags para categorizar o perfil ou o interesse do servidor.
6. Encaminhar para atendimento humano quando solicitado ou em demandas complexas.

Regras:
- Seja sempre educado e profissional.
- Se não souber a resposta, use a ferramenta de transferência ou sugira abrir um ticket.
- Nunca invente informações sobre prazos ou valores.
- Use as ferramentas disponíveis sempre que uma ação for necessária.`;

const tools = [
  {
    type: "function",
    function: {
      name: "cadastrar_ticket",
      description: "Abre um novo ticket de suporte/atendimento para o servidor.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título resumido da solicitação" },
          descricao: { type: "string", description: "Descrição detalhada do problema ou pedido" },
          prioridade: { type: "string", enum: ["baixa", "media", "alta", "urgente"], default: "media" },
          department_id: { type: "string", description: "ID do departamento (opcional)" }
        },
        required: ["titulo", "descricao"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "adicionar_tag",
      description: "Adiciona uma etiqueta (tag) ao contato para segmentação.",
      parameters: {
        type: "object",
        properties: {
          tag_name: { type: "string", description: "Nome da tag a ser adicionada" }
        },
        required: ["tag_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "atualizar_contato",
      description: "Atualiza os dados cadastrais do servidor no banco de dados.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          email: { type: "string" },
          matricula: { type: "string" },
          secretaria: { type: "string" },
          data_nascimento: { type: "string", description: "Data de nascimento no formato YYYY-MM-DD" },
          cargo: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transferir_atendimento",
      description: "Transfere a conversa para um atendente humano e desativa o bot.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Breve motivo da transferência" }
        },
        required: ["motivo"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ChatRequest = await req.json();
    const { messages, context, stream = false } = body;

    // Detect owner_id
    let ownerId = context?.owner_id;
    if (!ownerId) {
      const authParts = authHeader.split(' ');
      const token = authParts.length > 1 ? authParts[1].trim() : authParts[0].trim();
      if (token !== supabaseServiceKey) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('owner_id').eq('user_id', user.id).maybeSingle();
          ownerId = profile?.owner_id;
        }
      }
    }

    // System Prompt and AI Model Customization
    let personalizedPrompt = SYSTEM_PROMPT;
    let aiModel = "gpt-4o-mini"; // Default

    if (ownerId) {
      // Fetch both tenant_config and system_preferences
      const { data: allSettings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['tenant_config', 'system_preferences'])
        .eq('owner_id', ownerId);

      const tenantConfig = allSettings?.find(s => s.key === 'tenant_config')?.value;
      const systemPreferences = allSettings?.find(s => s.key === 'system_preferences')?.value;

      // Update AI Model if available
      if (systemPreferences?.aiModel) {
        aiModel = systemPreferences.aiModel;
      } else if (tenantConfig?.ai?.model) {
        aiModel = tenantConfig.ai.model;
      }

      if (tenantConfig?.ai) {
        const aiConfig = tenantConfig.ai;
        const entityConfig = tenantConfig.entity || {};

        personalizedPrompt = aiConfig.systemPromptTemplate || SYSTEM_PROMPT;

        // Process helpTopics loop if present
        if (personalizedPrompt.includes('{{#helpTopics}}') && Array.isArray(aiConfig.helpTopics)) {
          const helpTopicsList = aiConfig.helpTopics.map((topic: string) => `   - ${topic}`).join('\n');
          const loopRegex = /\{\{#helpTopics\}\}[\s\S]*?\{\{\/helpTopics\}\}/g;
          personalizedPrompt = personalizedPrompt.replace(loopRegex, helpTopicsList);
        }

        // Replace all variables
        const replacements: Record<string, string> = {
          '{{aiName}}': aiConfig.aiName || "FloxBee",
          '{{aiRole}}': aiConfig.aiRole || "assistente virtual",
          '{{aiOrganization}}': aiConfig.aiOrganization || "Secretaria de Administração",
          '{{entityName}}': entityConfig.entityName || "servidor",
          '{{entityNamePlural}}': entityConfig.entityNamePlural || "servidores",
        };

        Object.entries(replacements).forEach(([key, value]) => {
          personalizedPrompt = personalizedPrompt.replaceAll(key, value);
        });
      }
    }

    // Enriquecer contexto com dados do contato
    if (context?.contact_id) {
      const { data: contact } = await supabase.from('contacts').select('*').eq('id', context.contact_id).maybeSingle();
      if (contact) {
        personalizedPrompt += `\n\n--- DADOS DO CADASTRO ATUAL ---\nVocê tem acesso aos dados abaixo e DEVE utilizá-los para confirmar informações com o próprio servidor se ele solicitar.
- Nome: ${contact.nome}
- Matrícula: ${contact.matricula || 'Não informada'}
- E-mail: ${contact.email || 'Não informado'}
- Data de Nascimento: ${contact.data_nascimento || 'Não informada'}
- Secretaria: ${contact.secretaria || 'Não informada'}
- Cargo: ${contact.cargo || 'Não informado'}
- Tags: ${contact.tags?.join(', ') || 'Nenhuma'}
------------------------------`;
      }
    }

    // Assistant Prompt Instructions
    personalizedPrompt += `\n\nIMPORTANTE: Quando usar uma ferramenta (tool), NÃO descreva a ação tecnicamente (ex: não diga "[Ação: Ticket criado]"). Em vez disso, responda naturalmente confirmando que a solicitação foi processada ou que o servidor será atendido.`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const openaiRequest = {
      model: aiModel,
      messages: [{ role: "system", content: personalizedPrompt }, ...messages],
      tools: tools,
      tool_choice: "auto",
      max_tokens: 1000,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(openaiRequest),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    const assistantResponse = data.choices[0].message;

    let finalMessage = assistantResponse.content || "";
    let needsHumanTransfer = false;
    const internalActions: string[] = [];

    // Handle Tool Calls
    if (assistantResponse.tool_calls) {
      for (const toolCall of assistantResponse.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`Executing tool: ${functionName}`, args);

        if (functionName === "cadastrar_ticket" && context?.contact_id) {
          await supabase.from('tickets').insert({
            contact_id: context.contact_id,
            owner_id: ownerId,
            titulo: args.titulo,
            descricao: args.descricao,
            prioridade: args.prioridade,
            department_id: args.department_id,
            status: 'aberto'
          });
          internalActions.push(`Ticket criado: ${args.titulo}`);
        }

        if (functionName === "adicionar_tag" && context?.contact_id) {
          const { data: contact } = await supabase.from('contacts').select('tags').eq('id', context.contact_id).single();
          const currentTags = contact?.tags || [];
          if (!currentTags.includes(args.tag_name)) {
            await supabase.from('contacts').update({ tags: [...currentTags, args.tag_name] }).eq('id', context.contact_id);
          }
          internalActions.push(`Tag adicionada: ${args.tag_name}`);
        }

        if (functionName === "atualizar_contato" && context?.contact_id) {
          await supabase.from('contacts').update(args).eq('id', context.contact_id);
          internalActions.push(`Contato atualizado`);
        }

        if (functionName === "transferir_atendimento" && context?.conversation_id) {
          await supabase.from('conversations').update({ is_bot_active: false, status: 'aguardando' }).eq('id', context.conversation_id);
          needsHumanTransfer = true;
          internalActions.push(`Transferido: ${args.motivo}`);
        }
      }

      // Se a IA não gerou uma resposta textual junto com a ferramenta, geramos uma confirmação educada.
      if (!finalMessage) {
        if (needsHumanTransfer) {
          finalMessage = "Compreendo. Estou transferindo seu atendimento para um de nossos atendentes agora mesmo. Por favor, aguarde um momento.";
        } else if (internalActions.length > 0) {
          finalMessage = "Pronto! Já realizei o procedimento solicitado. Posso ajudar com mais alguma coisa?";
        }
      }
    }

    console.log("Actions taken:", internalActions);

    // --- NEW: Sanitize and Send to WhatsApp ---
    let cleanMessage = finalMessage.replace(/\[TRANSFERIR_HUMANO\]/g, '').trim();

    // If the message is only whitespace after removing the tag, and it was a transfer, 
    // we already have a courtesy message set in the tool handling block.
    if (!cleanMessage && needsHumanTransfer) {
      cleanMessage = "Compreendo. Estou transferindo seu atendimento para um de nossos atendentes agora mesmo. Por favor, aguarde um momento.";
    }

    if (cleanMessage && context?.whatsapp_number && ownerId) {
      try {
        // Save AI response as message first
        await supabase.from('messages').insert({
          conversation_id: context.conversation_id,
          content: cleanMessage,
          sender_type: "ia",
          message_type: "text",
          status: "sent"
        });

        // Call whatsapp-send function
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: context.whatsapp_number,
            message: cleanMessage,
            owner_id: ownerId,
          }),
        });

        if (!sendResponse.ok) {
          console.error("Failed to send WhatsApp message from AI Chat:", await sendResponse.text());
        } else {
          console.log("AI message sent successfully via WhatsApp");
        }
      } catch (sendErr) {
        console.error("Error sending response to WhatsApp:", sendErr);
      }
    }

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        needsHumanTransfer: needsHumanTransfer || finalMessage.includes("[TRANSFERIR_HUMANO]"),
        usage: data.usage
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
