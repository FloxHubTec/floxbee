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
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log("Checking for 'Schedule' automations...");

        // 1. Fetch active 'schedule' rules where schedule_at has passed
        const now = new Date().toISOString();

        // Note: This assumes trigger_config contains 'schedule_at'
        const { data: rules, error: rulesError } = await supabase
            .from("automation_rules")
            .select("id, nome, mensagem, template_id, message_templates(conteudo), trigger_config, owner_id")
            .eq("ativo", true)
            .eq("trigger_config->>type", "schedule")
            .lt("trigger_config->>schedule_at", now);

        if (rulesError) {
            console.error("Error fetching rules:", rulesError);
            throw rulesError;
        }

        if (!rules || rules.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No pending scheduled automations" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const results = [];

        for (const rule of rules) {
            const ownerId = rule.owner_id;

            // Check if already executed (to avoid duplicate sends if cron runs frequently)
            const { data: existingLog } = await supabase
                .from("automation_logs")
                .select("id")
                .eq("rule_id", rule.id)
                .maybeSingle();

            if (existingLog) continue;

            console.log(`Executing scheduled rule: ${rule.nome} (${rule.id})`);

            // 2. Fetch WhatsApp credentials
            const { data: integration } = await supabase
                .from("integrations")
                .select("config")
                .eq("owner_id", ownerId)
                .eq("integration_type", "whatsapp")
                .eq("is_active", true)
                .single();

            if (!integration) continue;
            const intConfig = typeof integration.config === 'string' ? JSON.parse(integration.config) : integration.config;

            const WHATSAPP_TOKEN = intConfig.access_token;
            const PHONE_NUMBER_ID = intConfig.phone_number_id;

            if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) continue;

            // 3. Find targets (for schedule, we might target all contacts with a certain tag or explicit list)
            const config = rule.trigger_config as any;
            const targetTag = config.target_tag;

            let contactQuery = supabase.from("contacts").select("id, nome, whatsapp").eq("owner_id", ownerId).eq("ativo", true);

            if (targetTag) {
                contactQuery = contactQuery.contains("tags", [targetTag]);
            }

            const { data: contacts } = await contactQuery;

            for (const contact of (contacts || [])) {
                const firstName = contact.nome?.split(" ")[0] || "";
                const messageTemplate = rule.mensagem || (rule.message_templates as any)?.conteudo || "";
                if (!messageTemplate) continue;

                const personalizedMessage = messageTemplate.replace(/\{\{nome\}\}/g, firstName);

                // Send WhatsApp
                const waResponse = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
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
                });

                if (waResponse.ok) {
                    // Log execution
                    await supabase.from("automation_logs").insert({
                        rule_id: rule.id,
                        contact_id: contact.id,
                        status: "sucesso",
                        owner_id: ownerId,
                        detalhes: { message: personalizedMessage, trigger: 'schedule' }
                    });
                    results.push({ contact_id: contact.id, success: true });
                }
            }

            // Mark rule as inactive if it was a one-time schedule? 
            // Or just rely on the log to prevent re-execution.
        }

        return new Response(JSON.stringify({ success: true, processed_contacts: results.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Schedule automation error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
