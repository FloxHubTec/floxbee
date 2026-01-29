import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Starting inactivity check...");

        // 1. Get all active conversations where bot is DISABLED
        const { data: conversations, error: convError } = await supabase
            .from("conversations")
            .select("id, last_message_at, owner_id, contact_id")
            .eq("is_bot_active", false)
            .eq("status", "ativo");

        if (convError) throw convError;

        console.log(`Found ${conversations?.length || 0} candidate conversations.`);

        for (const conv of conversations || []) {
            // 2. Fetch tenant config for this owner
            const { data: settings } = await supabase
                .from("system_settings")
                .select("value")
                .eq("owner_id", conv.owner_id)
                .eq("key", "tenant_config")
                .maybeSingle();

            const aiConfig = settings?.value?.ai || {};
            const timeoutMinutes = aiConfig.agentInactivityTimeoutMinutes || 0;

            if (timeoutMinutes <= 0) continue;

            const lastMsgDate = new Date(conv.last_message_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - lastMsgDate.getTime()) / (1000 * 60);

            if (diffMinutes >= timeoutMinutes) {
                console.log(`Conversation ${conv.id} inactive for ${Math.round(diffMinutes)} mins. Re-activating bot.`);

                // 3. Reactivate bot
                await supabase
                    .from("conversations")
                    .update({
                        is_bot_active: true,
                        assigned_to: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", conv.id);

                // 4. Add system/internal message
                await supabase
                    .from("messages")
                    .insert({
                        conversation_id: conv.id,
                        content: `[Sistema]: Atendimento devolvido para a IA por inatividade do atendente (${timeoutMinutes}min).`,
                        sender_type: "servidor",
                        metadata: { type: "system_notification" }
                    });

                // 5. (Optional) Could trigger AI to send a polite "are you still there?" 
                // but reactivation is enough for now.
            }
        }

        return new Response(JSON.stringify({ success: true, checked: conversations?.length || 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Inactivity check error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
