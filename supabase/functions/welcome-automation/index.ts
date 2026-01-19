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

    const { contact_id, trigger_type } = await req.json();

    console.log("Welcome automation triggered:", { contact_id, trigger_type });

    // Get contact info
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, nome, whatsapp, email, matricula, secretaria")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      console.error("Contact not found:", contactError);
      return new Response(
        JSON.stringify({ success: false, error: "Contact not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active welcome automation rule
    const { data: rules, error: rulesError } = await supabase
      .from("automation_rules")
      .select("id, nome, mensagem, template_id, message_templates(conteudo)")
      .eq("ativo", true)
      .or(`trigger_config->type.eq.new_contact,trigger_config->type.eq.first_message`);

    if (rulesError) {
      console.error("Error fetching automation rules:", rulesError);
      throw rulesError;
    }

    // Filter by exact trigger type
    const matchingRules = rules?.filter((rule: any) => {
      try {
        const config = rule.trigger_config || {};
        return config.type === trigger_type;
      } catch {
        return false;
      }
    }) || [];

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
    const personalizedMessage = messageTemplate
      .replace(/\{\{nome\}\}/g, contact.nome?.split(" ")[0] || "")
      .replace(/\{\{nome_completo\}\}/g, contact.nome || "")
      .replace(/\{\{matricula\}\}/g, contact.matricula || "")
      .replace(/\{\{secretaria\}\}/g, contact.secretaria || "")
      .replace(/\{\{email\}\}/g, contact.email || "");

    // Check if we've already sent a welcome message to this contact
    const { data: existingLog } = await supabase
      .from("automation_logs")
      .select("id")
      .eq("rule_id", rule.id)
      .eq("contact_id", contact.id)
      .single();

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

    // Check WhatsApp credentials
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    let sendSuccess = false;
    let sendError: string | undefined;

    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID && contact.whatsapp) {
      // Clean phone number
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
          sendError = JSON.stringify(errorData);
          console.error("WhatsApp API error:", errorData);
        }
      } catch (error: any) {
        sendError = error?.message || String(error);
        console.error("Error sending WhatsApp message:", error);
      }
    } else {
      // Mock send for testing
      sendSuccess = true;
      console.log(`[MOCK] Welcome message would be sent to ${contact.nome}: ${personalizedMessage}`);
    }

    // Log the automation
    await supabase.from("automation_logs").insert({
      rule_id: rule.id,
      contact_id: contact.id,
      status: sendSuccess ? "enviado" : "erro",
      mensagem_enviada: personalizedMessage,
      erro: sendError,
    });

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
