import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contact_id, trigger_type, conversation_id, rule_id } = await req.json();

    console.log("Welcome automation triggered:", { contact_id, trigger_type });

    // Get contact info
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, nome, whatsapp, email, matricula, secretaria, owner_id")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      console.error("Contact not found:", contactError);
      return new Response(
        JSON.stringify({ success: false, error: "Contact not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerId = contact.owner_id;

    // Find active automation rule for this owner
    let ruleQuery = supabase
      .from("automation_rules")
      .select("id, nome, mensagem, template_id, message_templates(conteudo), trigger_config")
      .eq("ativo", true)
      .eq("owner_id", ownerId);

    if (rule_id) {
      ruleQuery = ruleQuery.eq("id", rule_id);
    } else {
      ruleQuery = ruleQuery.or(`trigger_config->>type.eq.new_contact,trigger_config->>type.eq.first_message,trigger_config->>type.eq.keyword`);
    }

    const { data: rules, error: rulesError } = await ruleQuery;

    if (rulesError || !rules) {
      console.error("Error fetching automation rules:", rulesError);
      throw rulesError;
    }

    // Filter by exact trigger type in the JSONB config
    const matchingRules = rules.filter((rule: any) => {
      const config = rule.trigger_config || {};
      return config.type === trigger_type;
    });

    if (matchingRules.length === 0) {
      console.log("No active welcome automation rule found for trigger:", trigger_type);
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active welcome automation rule",
          trigger_type
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rule = matchingRules[0];
    const messageTemplate = rule.mensagem || (rule.message_templates as any)?.conteudo ||
      "Olá {{nome}}! Seja bem-vindo(a) ao nosso atendimento. Como posso ajudá-lo(a) hoje?";

    console.log(`Using automation rule: ${rule.nome}`);

    // Personalize message
    const firstName = contact.nome?.split(" ")[0] || "";
    const personalizedMessage = messageTemplate
      .replace(/\{\{nome\}\}/g, firstName)
      .replace(/\{\{nome_completo\}\}/g, contact.nome || "")
      .replace(/\{\{matricula\}\}/g, contact.matricula || "")
      .replace(/\{\{secretaria\}\}/g, contact.secretaria || "")
      .replace(/\{\{email\}\}/g, contact.email || "");

    // Check if we've already sent a welcome message to this contact for THIS rule
    const { data: existingLog } = await supabase
      .from("automation_logs")
      .select("id")
      .eq("rule_id", rule.id)
      .eq("contact_id", contact.id)
      .maybeSingle();

    if (existingLog) {
      console.log(`Welcome message already sent to ${contact.nome}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Welcome already sent",
          contact_id: contact.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch WhatsApp credentials for this tenant
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("config")
      .eq("owner_id", ownerId)
      .eq("integration_type", "whatsapp")
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      console.error(`WhatsApp integration not found or inactive for tenant ${ownerId}`);
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp integration not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = typeof integration.config === 'string'
      ? JSON.parse(integration.config)
      : integration.config;

    const WHATSAPP_TOKEN = config.access_token;
    const PHONE_NUMBER_ID = config.phone_number_id;

    let sendSuccess = false;
    let sendError: string | undefined;

    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID && contact.whatsapp) {
      const cleanPhone = contact.whatsapp.replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      try {
        const whatsappResponse = await fetch(
          `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: phoneWithCountry,
              type: "text",
              text: { body: personalizedMessage },
            }),
          }
        );

        if (whatsappResponse.ok) {
          sendSuccess = true;
          console.log(`Welcome message sent to ${contact.nome}`);
        } else {
          const errorData = await whatsappResponse.json();
          sendError = errorData.error?.message || JSON.stringify(errorData);
          console.error("WhatsApp API error:", errorData);
        }
      } catch (error: any) {
        sendError = error?.message || String(error);
        console.error("Error sending WhatsApp message:", error);
      }
    }

    // Log the automation
    await supabase.from("automation_logs").insert({
      rule_id: rule.id,
      contact_id: contact.id,
      status: sendSuccess ? "enviado" : "erro",
      owner_id: ownerId,
      detalhes: {
        message: personalizedMessage,
        error: sendError,
        sent_at: new Date().toISOString(),
      }
    });

    // Also log to regular messages table if we have a conversation_id
    if (sendSuccess && conversation_id) {
      await supabase.from("messages").insert({
        conversation_id,
        content: personalizedMessage,
        sender_type: "ia", // Log as IA so it's included in chat history
        message_type: "text",
        status: "sent"
      });
      console.log(`Log message inserted into conversation ${conversation_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_sent: sendSuccess,
        contact: contact.nome,
        error: sendError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Welcome automation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
