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

        console.log("Checking for 'No Response' automations...");

        // 1. Fetch active 'no_response' rules
        const { data: rules, error: rulesError } = await supabase
            .from("automation_rules")
            .select("id, nome, mensagem, template_id, message_templates(conteudo), trigger_config, owner_id")
            .eq("ativo", true)
            .eq("trigger_config->>type", "no_response");

        if (rulesError) {
            console.error("Error fetching rules:", rulesError);
            throw rulesError;
        }

        if (!rules || rules.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No active 'no_response' rules" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Found ${rules.length} active no_response rules`);
        const results = [];

        for (const rule of rules) {
            const config = rule.trigger_config as any;
            const delayMinutes = parseInt(config.delay_minutes || "15");
            const ownerId = rule.owner_id;

            console.log(`Processing rule: ${rule.nome} (Delay: ${delayMinutes}m, Owner: ${ownerId})`);

            // Find conversations for this owner that are active/waiting and need a response
            const cutoffTime = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString();

            const { data: conversations, error: convError } = await supabase
                .from("conversations")
                .select("id, contact_id, last_message_at, contacts(nome, whatsapp)") // Added contacts for personalization & number
                .eq("owner_id", ownerId)
                .eq("status", "ativo")
                .lt("last_message_at", cutoffTime);

            if (convError) {
                console.error(`Error fetching conversations for rule ${rule.id}:`, convError);
                continue;
            }

            console.log(`Found ${conversations?.length || 0} eligible conversations for rule ${rule.id}`);

            for (const conv of (conversations || [])) {
                // Double check: Was the last message truly from the customer?
                const { data: lastMessages } = await supabase
                    .from("messages")
                    .select("sender_type")
                    .eq("conversation_id", conv.id)
                    .order("created_at", { ascending: false })
                    .limit(1);

                const lastMessage = lastMessages?.[0];

                // If there is a last message and it's older than delay
                if (lastMessage) {

                    // Check how many times we've already sent a 'no_response' automation for this rule/conversation
                    const maxAttempts = parseInt(config.max_attempts || "1");

                    const { count: attemptCount, error: countError } = await supabase
                        .from("automation_logs")
                        .select("id", { count: 'exact', head: true })
                        .eq("rule_id", rule.id)
                        .eq("conversation_id", conv.id);

                    if (countError) {
                        console.error(`Error checking attempts for conv ${conv.id}:`, countError);
                    }

                    if (attemptCount && attemptCount >= maxAttempts) {
                        console.log(`Max attempts reached (${attemptCount}/${maxAttempts}) for conversation ${conv.id}`);
                        continue;
                    }

                    console.log(`Triggering 'no_response' for conversation ${conv.id}`);

                    // Fetch credentials
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

                    const contact = (conv.contacts as any);
                    const firstName = contact.nome?.split(" ")[0] || "";
                    const messageTemplate = rule.mensagem || (rule.message_templates as any)?.conteudo || "Ainda está aí? Como posso te ajudar?";
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
                        // Log to messages table
                        await supabase.from("messages").insert({
                            conversation_id: conv.id,
                            content: personalizedMessage,
                            sender_type: "ia",
                            message_type: "text",
                        });

                        // Log to automation_logs with error catching
                        const { error: logError } = await supabase.from("automation_logs").insert({
                            rule_id: rule.id,
                            contact_id: conv.contact_id,
                            conversation_id: conv.id,
                            status: "sucesso",
                            owner_id: ownerId,
                            detalhes: { message: personalizedMessage, attempt_time: new Date().toISOString() }
                        });

                        if (logError) {
                            console.error(`Error logging success for conv ${conv.id}:`, logError);
                        }

                        results.push({ conversation_id: conv.id, success: true });
                    } else {
                        const errorText = await waResponse.text();
                        console.error(`WhatsApp error for conv ${conv.id}:`, errorText);

                        // Log failure to automation_logs too
                        await supabase.from("automation_logs").insert({
                            rule_id: rule.id,
                            contact_id: conv.contact_id,
                            conversation_id: conv.id,
                            status: "erro",
                            owner_id: ownerId,
                            detalhes: { error: errorText }
                        });
                    }
                } else {
                    console.log(`Skipping conv ${conv.id}: No last message found`);
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Automation error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
