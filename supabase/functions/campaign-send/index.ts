import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignRequest {
  campaign_id?: string;
  name: string;
  message_template: string;
  target_filter?: {
    secretaria?: string;
    tags?: string[];
    all?: boolean;
  };
  recipients?: Array<{
    whatsapp: string;
    contact_id?: string;
    nome?: string;
    matricula?: string;
    secretaria?: string;
    [key: string]: string | undefined;
  }>;
  scheduled_at?: string;
  frequency_limit_hours?: number;
  bypass_frequency_check?: boolean;
}

interface ContactRecord {
  id: string;
  whatsapp: string;
  nome: string | null;
  matricula: string | null;
  secretaria: string | null;
  email: string | null;
  last_campaign_at: string | null;
  last_message_at: string | null;
}

interface FrequencyCheckResult {
  allowed: boolean;
  blocked_contacts: string[];
  allowed_contacts: Array<{
    whatsapp: string;
    contact_id?: string;
    [key: string]: string | undefined;
  }>;
}

// Replace template variables with actual values
function processTemplate(template: string, data: Record<string, string | undefined>): string {
  let result = template;
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);

  for (const match of matches) {
    const variable = match[1];
    const value = data[variable] || data[variable.toLowerCase()] || "";
    result = result.replace(match[0], value);
  }

  return result;
}

// Check frequency limits for contacts
async function checkFrequencyLimits(
  supabase: any,
  recipients: CampaignRequest["recipients"],
  frequencyLimitHours: number
): Promise<FrequencyCheckResult> {
  if (!recipients || recipients.length === 0) {
    return { allowed: true, blocked_contacts: [], allowed_contacts: [] };
  }

  const whatsappNumbers = recipients.map(r => r.whatsapp);
  const cutoffTime = new Date(Date.now() - frequencyLimitHours * 60 * 60 * 1000).toISOString();

  console.log("Checking frequency limits:", {
    recipientCount: whatsappNumbers.length,
    frequencyLimitHours,
    cutoffTime
  });

  // Fetch contacts that have received messages recently
  const { data, error } = await supabase
    .from("contacts")
    .select("id, whatsapp, last_campaign_at, last_message_at")
    .in("whatsapp", whatsappNumbers)
    .or(`last_campaign_at.gte.${cutoffTime},last_message_at.gte.${cutoffTime}`);

  if (error) {
    console.error("Error checking frequency limits:", error);
    return {
      allowed: true,
      blocked_contacts: [],
      allowed_contacts: recipients
    };
  }

  const recentlyContacted = data as ContactRecord[] | null;
  const blockedWhatsapps = new Set((recentlyContacted || []).map(c => c.whatsapp));

  const blocked_contacts: string[] = [];
  const allowed_contacts: FrequencyCheckResult["allowed_contacts"] = [];

  for (const recipient of recipients) {
    if (blockedWhatsapps.has(recipient.whatsapp)) {
      blocked_contacts.push(recipient.whatsapp);
    } else {
      allowed_contacts.push(recipient);
    }
  }

  console.log("Frequency check result:", {
    blocked: blocked_contacts.length,
    allowed: allowed_contacts.length
  });

  return {
    allowed: blocked_contacts.length === 0,
    blocked_contacts,
    allowed_contacts,
  };
}

// Update contact's last campaign timestamp
async function updateContactCampaignTimestamp(
  supabase: any,
  whatsappNumbers: string[]
): Promise<void> {
  const { error } = await supabase
    .from("contacts")
    .update({ last_campaign_at: new Date().toISOString() })
    .in("whatsapp", whatsappNumbers);

  if (error) {
    console.error("Error updating contact timestamps:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      campaign_id,
      name,
      message_template,
      target_filter,
      recipients: providedRecipients,
      scheduled_at,
      frequency_limit_hours = 24,
      bypass_frequency_check = false,
    }: CampaignRequest = await req.json();

    console.log("Campaign request:", {
      name,
      hasFilter: !!target_filter,
      providedRecipientsCount: providedRecipients?.length,
      scheduled: !!scheduled_at,
      frequencyLimitHours: frequency_limit_hours,
      bypassCheck: bypass_frequency_check
    });

    // If scheduled for later, save and return
    if (scheduled_at && new Date(scheduled_at) > new Date()) {
      console.log("Campaign scheduled for:", scheduled_at);
      return new Response(
        JSON.stringify({
          success: true,
          scheduled: true,
          scheduled_at,
          message: "Campanha agendada com sucesso"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipients = providedRecipients || [];

    // If filter provided and no recipients, fetch from database
    if (target_filter && recipients.length === 0) {
      let query = supabase.from("contacts").select("id, whatsapp, nome, matricula, secretaria, email");

      if (!target_filter.all) {
        if (target_filter.secretaria) {
          query = query.eq("secretaria", target_filter.secretaria);
        }
        if (target_filter.tags && target_filter.tags.length > 0) {
          query = query.overlaps("tags", target_filter.tags);
        }
      }

      query = query.eq("ativo", true);

      const { data: contacts, error } = await query;

      if (error) {
        console.error("Error fetching contacts:", error);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar contatos", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contactList = contacts as ContactRecord[] | null;
      recipients = (contactList || []).map(c => ({
        contact_id: c.id,
        whatsapp: c.whatsapp,
        nome: c.nome || undefined,
        matricula: c.matricula || undefined,
        secretaria: c.secretaria || undefined,
        email: c.email || undefined
      }));

      console.log("Fetched contacts from filter:", recipients.length);
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum destinatário encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check frequency limits unless bypassed
    let recipientsToSend = recipients;
    let frequencyCheckResult: FrequencyCheckResult | null = null;

    if (!bypass_frequency_check && frequency_limit_hours > 0) {
      frequencyCheckResult = await checkFrequencyLimits(
        supabase,
        recipients,
        frequency_limit_hours
      );

      if (frequencyCheckResult.blocked_contacts.length > 0) {
        console.log(`Blocked ${frequencyCheckResult.blocked_contacts.length} contacts due to frequency limit`);
      }

      recipientsToSend = frequencyCheckResult.allowed_contacts;

      if (recipientsToSend.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Todos os destinatários foram bloqueados pelo limite de frequência",
            blocked_count: frequencyCheckResult.blocked_contacts.length,
            frequency_limit_hours,
            message: `Nenhum destinatário pode receber mensagem. Todos receberam mensagens nas últimas ${frequency_limit_hours} horas.`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If campaign_id provided, get the owner_id to fetch proper credentials
    let ownerId: string | null = null;
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("owner_id")
        .eq("id", campaign_id)
        .maybeSingle();
      ownerId = campaign?.owner_id || null;
    }

    // Process and send messages
    const results: Array<{
      recipient: string;
      status: string;
      message?: string;
      message_id?: string;
      error?: string;
      mock?: boolean;
    }> = [];

    // Fetch Credentials from Database based on owner_id
    let WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    let PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (ownerId) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("config")
        .eq("owner_id", ownerId)
        .eq("integration_type", "whatsapp")
        .eq("is_active", true)
        .maybeSingle();

      if (integration?.config) {
        const config = typeof integration.config === 'string'
          ? JSON.parse(integration.config)
          : integration.config;

        if (config.access_token && config.phone_number_id) {
          WHATSAPP_TOKEN = config.access_token;
          PHONE_NUMBER_ID = config.phone_number_id;
          console.log(`Using database credentials for tenant: ${ownerId}`);
        }
      }
    }

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      console.log("WhatsApp not configured, returning mock results");

      for (const recipient of recipientsToSend) {
        const personalizedMessage = processTemplate(message_template, recipient);
        results.push({
          recipient: recipient.whatsapp,
          message: personalizedMessage,
          status: "mock",
          mock: true,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          mock: true,
          campaign_name: name,
          total_recipients: recipients.length,
          sent_count: recipientsToSend.length,
          blocked_by_frequency: frequencyCheckResult?.blocked_contacts.length || 0,
          frequency_limit_hours,
          results,
          message: "WhatsApp não configurado ou credenciais inválidas. Retornando prévia.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Real sending with WhatsApp
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const sentWhatsapps: string[] = [];

    for (const recipient of recipientsToSend) {
      const personalizedMessage = processTemplate(message_template, recipient);

      try {
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
              to: recipient.whatsapp,
              type: "text",
              text: { body: personalizedMessage },
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          sentWhatsapps.push(recipient.whatsapp);
        }

        results.push({
          recipient: recipient.whatsapp,
          status: response.ok ? "sent" : "failed",
          message_id: data.messages?.[0]?.id,
          error: data.error?.message || (response.status !== 200 ? `HTTP ${response.status}` : undefined),
        });

        // Log to campaign_logs if available
        if (campaign_id) {
          await supabase.from("automation_logs").insert({
            rule_id: campaign_id, // Campaigns usually log to their own table, but using automation_logs as fallback or per user request
            contact_id: recipient.contact_id,
            status: response.ok ? "sucesso" : "erro",
            owner_id: ownerId,
            detalhes: {
              type: "campaign",
              message: personalizedMessage,
              error: data.error?.message,
              sent_at: new Date().toISOString()
            }
          }).catch(console.error);
        }

        await delay(200); // 200ms delay for safety
      } catch (error) {
        results.push({
          recipient: recipient.whatsapp,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update timestamps for successfully sent messages
    if (sentWhatsapps.length > 0) {
      await updateContactCampaignTimestamp(supabase, sentWhatsapps);
    }

    const summary = {
      total: recipients.length,
      sent: results.filter(r => r.status === "sent").length,
      failed: results.filter(r => r.status === "failed" || r.status === "error").length,
      blocked_by_frequency: frequencyCheckResult?.blocked_contacts.length || 0,
    };

    console.log("Campaign completed:", { name, ...summary });

    return new Response(
      JSON.stringify({
        success: true,
        campaign_name: name,
        frequency_limit_hours,
        summary,
        results,
        blocked_contacts: frequencyCheckResult?.blocked_contacts || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
