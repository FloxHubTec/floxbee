import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  ticket_id: string;
  event_type: "created" | "updated" | "resolved";
  old_status?: string;
  new_status?: string;
}

const STATUS_LABELS: Record<string, string> = {
  aberto_ia: "Aberto (IA)",
  em_analise: "Em Análise",
  pendente: "Pendente",
  concluido: "Concluído",
};

const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ticket_id, event_type, old_status, new_status }: TicketNotificationRequest = await req.json();

    console.log("Ticket notification triggered:", { ticket_id, event_type, old_status, new_status });

    // Get ticket with contact info
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`
        id, titulo, descricao, status, prioridade, categoria, 
        created_at, resolved_at, protocolo,
        contacts(id, nome, whatsapp, email)
      `)
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError);
      return new Response(
        JSON.stringify({ success: false, error: "Ticket not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contact = ticket.contacts as any;
    if (!contact || !contact.whatsapp) {
      console.log("No contact or WhatsApp for this ticket");
      return new Response(
        JSON.stringify({ success: true, message: "No contact to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active ticket notification automation rule
    const { data: rules, error: rulesError } = await supabase
      .from("automation_rules")
      .select("id, nome, mensagem, template_id, trigger_config, message_templates(conteudo)")
      .eq("ativo", true)
      .contains("trigger_config", { type: "ticket_created" });

    if (rulesError) {
      console.error("Error fetching automation rules:", rulesError);
    }

    // Build notification message based on event type
    let message: string;
    const protocolo = ticket.protocolo || ticket.id.substring(0, 8).toUpperCase();
    const statusLabel = STATUS_LABELS[ticket.status] || ticket.status;
    const priorityLabel = PRIORITY_LABELS[ticket.prioridade] || ticket.prioridade;

    switch (event_type) {
      case "created":
        // Check if there's a custom template
        const createRule = rules?.find((r: any) => r.trigger_config?.event === "created");
        if (createRule?.mensagem) {
          message = createRule.mensagem;
        } else {
          message = `📋 *Ticket Aberto*\n\n` +
            `Olá {{nome}}!\n\n` +
            `Sua demanda foi registrada com sucesso.\n\n` +
            `*Protocolo:* ${protocolo}\n` +
            `*Assunto:* ${ticket.titulo}\n` +
            `*Prioridade:* ${priorityLabel}\n` +
            `*Status:* ${statusLabel}\n\n` +
            `Acompanhe o andamento por este canal. Responderemos em breve!`;
        }
        break;

      case "updated":
        message = `🔄 *Atualização de Ticket*\n\n` +
          `Olá {{nome}}!\n\n` +
          `Seu ticket foi atualizado.\n\n` +
          `*Protocolo:* ${protocolo}\n` +
          `*Assunto:* ${ticket.titulo}\n` +
          `*Status anterior:* ${STATUS_LABELS[old_status || ""] || old_status}\n` +
          `*Novo status:* ${statusLabel}\n\n` +
          `Continuamos trabalhando na sua demanda!`;
        break;

      case "resolved":
        message = `✅ *Ticket Concluído*\n\n` +
          `Olá {{nome}}!\n\n` +
          `Temos boas notícias! Sua demanda foi concluída.\n\n` +
          `*Protocolo:* ${protocolo}\n` +
          `*Assunto:* ${ticket.titulo}\n` +
          `*Status:* Concluído\n\n` +
          `Caso tenha alguma dúvida ou precise de mais ajuda, é só nos chamar!`;
        break;

      default:
        message = `📢 *Notificação de Ticket*\n\n` +
          `Protocolo: ${protocolo}\n` +
          `Status: ${statusLabel}`;
    }

    // Personalize message
    const personalizedMessage = message
      .replace(/\{\{nome\}\}/g, contact.nome?.split(" ")[0] || "")
      .replace(/\{\{nome_completo\}\}/g, contact.nome || "")
      .replace(/\{\{protocolo\}\}/g, protocolo)
      .replace(/\{\{titulo\}\}/g, ticket.titulo || "")
      .replace(/\{\{status\}\}/g, statusLabel);

    // Check WhatsApp credentials
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    let sendSuccess = false;
    let sendError: string | undefined;

    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
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
          console.log(`Ticket notification sent to ${contact.nome}`);
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
      console.log(`[MOCK] Ticket notification would be sent to ${contact.nome}: ${personalizedMessage}`);
    }

    // Log the notification
    if (rules && rules.length > 0) {
      await supabase.from("automation_logs").insert({
        rule_id: rules[0].id,
        contact_id: contact.id,
        status: sendSuccess ? "enviado" : "erro",
        mensagem_enviada: personalizedMessage,
        erro: sendError,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_sent: sendSuccess,
        event_type,
        contact: contact.nome,
        error: sendError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Ticket notification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
