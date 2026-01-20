import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  to: string;
  message: string;
  owner_id?: string;
  type?: "text" | "template";
  template?: {
    name: string;
    language: string;
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string }>;
    }>;
  };
}

interface SendBulkRequest {
  recipients: string[];
  message: string;
  owner_id?: string;
  type?: "text" | "template";
  template?: SendMessageRequest["template"];
  delay_ms?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Robust Authentication Extraction
    const authParts = authHeader.split(' ');
    const token = authParts.length > 1 ? authParts[1].trim() : authParts[0].trim();

    // Bypass check for Service Role (Internal/External backend calls)
    const isServiceCall = token === supabaseServiceKey;
    let fallbackOwnerId = null;

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!isServiceCall) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("Auth validation error:", authError);
        return new Response(
          JSON.stringify({ error: `Auth validation failed: ${authError?.message || 'Invalid token'}` }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get profile for the authenticated user to find owner_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('owner_id')
        .eq('user_id', user.id)
        .single();
      fallbackOwnerId = profile?.owner_id;
    }

    const body = await req.json();
    const url = new URL(req.url);
    const isBulk = url.pathname.endsWith("/bulk");
    const ownerId = body.owner_id || fallbackOwnerId;

    // Fetch Credentials from Database
    let whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    let phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (ownerId) {
      const { data: integrations } = await supabase
        .from("integrations")
        .select("config, is_active")
        .eq("integration_type", "whatsapp")
        .eq("owner_id", ownerId)
        .order("is_active", { ascending: false });

      const integration = integrations?.[0];
      if (integration?.config?.access_token && integration?.config?.phone_number_id) {
        whatsappToken = integration.config.access_token;
        phoneNumberId = integration.config.phone_number_id;
        console.log("Using database credentials for owner:", ownerId);
      } else {
        console.warn("No valid WhatsApp integration found for owner, using env fallback:", ownerId);
      }
    }

    if (!whatsappToken || !phoneNumberId) {
      console.error("WhatsApp credentials not configured (tried DB and ENV)");
      return new Response(
        JSON.stringify({
          error: "WhatsApp not configured",
          details: "Missing access token or phone number ID"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isBulk) {
      // Handle bulk sending
      const { recipients, message, type = "text", template, delay_ms = 100 }: SendBulkRequest = body;

      console.log("Bulk send request:", { recipientCount: recipients.length, type, ownerId });

      const results = [];
      for (const recipient of recipients) {
        try {
          const result = await sendWhatsAppMessage(whatsappToken, phoneNumberId, {
            to: recipient,
            message,
            type,
            template,
          });
          results.push({ recipient, success: true, messageId: result.messages?.[0]?.id });

          // Add delay between messages
          if (delay_ms > 0) {
            await new Promise(resolve => setTimeout(resolve, delay_ms));
          }
        } catch (error) {
          results.push({ recipient, success: false, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log("Bulk send completed:", { total: recipients.length, success: successCount });

      return new Response(
        JSON.stringify({ results, summary: { total: recipients.length, success: successCount, failed: recipients.length - successCount } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Handle single message
      const { to, message, type = "text", template }: SendMessageRequest = body;

      console.log("Send message request:", { to, type, ownerId });

      const result = await sendWhatsAppMessage(whatsappToken, phoneNumberId, { to, message, type, template });

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendWhatsAppMessage(
  token: string,
  phoneNumberId: string,
  request: SendMessageRequest
) {
  const { to, message, type, template } = request;

  let body: Record<string, unknown>;

  if (type === "template" && template) {
    body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        components: template.components,
      },
    };
  } else {
    body = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("WhatsApp API error:", errorData);
    throw new Error(errorData.error?.message || "Failed to send WhatsApp message");
  }

  return response.json();
}
