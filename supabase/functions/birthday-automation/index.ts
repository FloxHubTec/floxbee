import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BirthdayContact {
  id: string;
  nome: string;
  whatsapp: string;
  data_nascimento: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting birthday automation check...");

    // Get today's date (month and day only)
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();

    console.log(`Checking birthdays for: ${todayMonth}/${todayDay}`);

    // Fetch all contacts with birthdays today
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, nome, whatsapp, data_nascimento")
      .eq("ativo", true)
      .not("data_nascimento", "is", null);

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
      throw contactsError;
    }

    // Filter contacts whose birthday is today
    const birthdayContacts: BirthdayContact[] = (contacts || []).filter((contact) => {
      if (!contact.data_nascimento) return false;
      const birthDate = new Date(contact.data_nascimento + "T00:00:00");
      return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
    });

    console.log(`Found ${birthdayContacts.length} contacts with birthday today`);

    if (birthdayContacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No birthdays today",
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active birthday automation rule
    const { data: rules, error: rulesError } = await supabase
      .from("automation_rules")
      .select("id, nome, mensagem, template_id, message_templates(conteudo)")
      .eq("ativo", true)
      .contains("trigger_config", { type: "birthday" });

    if (rulesError) {
      console.error("Error fetching automation rules:", rulesError);
      throw rulesError;
    }

    if (!rules || rules.length === 0) {
      console.log("No active birthday automation rule found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No active birthday automation rule",
          birthdays_found: birthdayContacts.length,
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rule = rules[0];
    const messageTemplate = rule.mensagem || (rule.message_templates as any)?.conteudo || "Feliz aniversário, {{nome}}! 🎂🎉";

    console.log(`Using automation rule: ${rule.nome}`);

    // Check WhatsApp credentials
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    const results: Array<{ contact_id: string; nome: string; success: boolean; error?: string }> = [];

    for (const contact of birthdayContacts) {
      try {
        // Personalize message
        const personalizedMessage = messageTemplate
          .replace(/\{\{nome\}\}/g, contact.nome.split(" ")[0])
          .replace(/\{\{nome_completo\}\}/g, contact.nome);

        // Check if we've already sent a birthday message today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: existingLog } = await supabase
          .from("automation_logs")
          .select("id")
          .eq("rule_id", rule.id)
          .eq("contact_id", contact.id)
          .gte("created_at", todayStart.toISOString())
          .single();

        if (existingLog) {
          console.log(`Birthday message already sent to ${contact.nome} today`);
          results.push({ contact_id: contact.id, nome: contact.nome, success: true, error: "Already sent today" });
          continue;
        }

        // Send message if WhatsApp is configured
        if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: contact.whatsapp,
                type: "text",
                text: { body: personalizedMessage },
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to send WhatsApp message");
          }

          console.log(`Birthday message sent to ${contact.nome}`);
        } else {
          console.log(`[MOCK] Birthday message would be sent to ${contact.nome}: ${personalizedMessage}`);
        }

        // Log successful automation
        await supabase.from("automation_logs").insert({
          rule_id: rule.id,
          contact_id: contact.id,
          status: "sucesso",
          detalhes: { 
            message: personalizedMessage,
            birthday_date: contact.data_nascimento,
            sent_at: new Date().toISOString(),
          },
        });

        results.push({ contact_id: contact.id, nome: contact.nome, success: true });

        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error sending to ${contact.nome}:`, error);
        
        // Log failed automation
        await supabase.from("automation_logs").insert({
          rule_id: rule.id,
          contact_id: contact.id,
          status: "erro",
          detalhes: { 
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });

        results.push({ 
          contact_id: contact.id, 
          nome: contact.nome, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success && !r.error?.includes("Already sent")).length;
    const alreadySentCount = results.filter(r => r.error?.includes("Already sent")).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`Birthday automation completed: ${successCount} sent, ${alreadySentCount} already sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          total_birthdays: birthdayContacts.length,
          sent: successCount,
          already_sent: alreadySentCount,
          failed: failedCount,
        },
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Birthday automation error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
