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
  owner_id: string;
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
      .select("id, nome, whatsapp, data_nascimento, owner_id") // Added owner_id to select
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

    // Group contacts by owner_id to process each tenant's rules and credentials
    const contactsByOwner: Record<string, BirthdayContact[]> = {};
    birthdayContacts.forEach(contact => {
      if (contact.owner_id) {
        if (!contactsByOwner[contact.owner_id]) contactsByOwner[contact.owner_id] = [];
        contactsByOwner[contact.owner_id].push(contact);
      }
    });

    const results: Array<{ contact_id: string; nome: string; success: boolean; error?: string }> = [];

    // Process each tenant (owner)
    for (const ownerId of Object.keys(contactsByOwner)) {
      console.log(`Processing birthdays for tenant: ${ownerId}`);

      // 1. Find active birthday automation rule for this tenant
      const { data: rules, error: rulesError } = await supabase
        .from("automation_rules")
        .select("id, nome, mensagem, template_id, message_templates(conteudo)")
        .eq("ativo", true)
        .eq("owner_id", ownerId)
        .or(`trigger_config->>type.eq.birthday,trigger_config->>type.eq.aniversario`);

      if (rulesError) {
        console.error(`Error fetching automation rules for tenant ${ownerId}:`, rulesError);
        continue;
      }
      if (!rules || rules.length === 0) {
        console.log(`No active birthday rule found for tenant ${ownerId}`);
        continue;
      }

      const rule = rules[0];
      const messageTemplate = rule.mensagem || (rule.message_templates as any)?.conteudo || "Feliz aniversário, {{nome}}! 🎂🎉";

      console.log(`Using automation rule for tenant ${ownerId}: ${rule.nome}`);

      // 2. Fetch WhatsApp credentials for this tenant
      const { data: integration, error: intError } = await supabase
        .from("integrations")
        .select("config")
        .eq("owner_id", ownerId)
        .eq("integration_type", "whatsapp")
        .eq("is_active", true)
        .single();

      if (intError) {
        console.error(`Error fetching WhatsApp integration for tenant ${ownerId}:`, intError);
        continue;
      }
      if (!integration) {
        console.log(`WhatsApp integration not found or inactive for tenant ${ownerId}`);
        continue;
      }

      const config = typeof integration.config === 'string'
        ? JSON.parse(integration.config)
        : integration.config;

      const WHATSAPP_TOKEN = config.access_token;
      const PHONE_NUMBER_ID = config.phone_number_id;

      if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.log(`Incomplete WhatsApp credentials for tenant ${ownerId}`);
        continue;
      }

      // 3. Process contacts for this tenant
      for (const contact of contactsByOwner[ownerId]) {
        try {
          // Personalize message
          const firstName = contact.nome.split(" ")[0];
          const personalizedMessage = messageTemplate
            .replace(/\{\{nome\}\}/g, firstName)
            .replace(/\{\{nome_completo\}\}/g, contact.nome);

          // Check if we've already sent a birthday message today to this contact for this rule
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const { data: existingLog } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("rule_id", rule.id)
            .eq("contact_id", contact.id)
            .gte("created_at", todayStart.toISOString())
            .maybeSingle(); // Changed to maybeSingle()

          if (existingLog) {
            console.log(`Birthday message already sent to ${contact.nome} today`);
            results.push({ contact_id: contact.id, nome: contact.nome, success: true, error: "Already sent today" });
            continue;
          }

          // Send message via WhatsApp API
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
            throw new Error(errorData.error?.message || `WhatsApp API error: ${response.status}`); // Improved error message
          }

          console.log(`Birthday message sent to ${contact.nome}`);

          // Log successful automation
          await supabase.from("automation_logs").insert({
            rule_id: rule.id,
            contact_id: contact.id,
            status: "sucesso",
            owner_id: ownerId, // Important for multi-tenancy
            detalhes: {
              message: personalizedMessage,
              birthday_date: contact.data_nascimento,
              sent_at: new Date().toISOString(),
            },
          });

          results.push({ contact_id: contact.id, nome: contact.nome, success: true });

          // Small delay between messages to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 250)); // Changed delay to 250ms
        } catch (error) {
          console.error(`Error sending to ${contact.nome}:`, error);

          // Log failed automation
          await supabase.from("automation_logs").insert({
            rule_id: rule.id,
            contact_id: contact.id,
            status: "erro",
            owner_id: ownerId, // Important for multi-tenancy
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
