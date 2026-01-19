import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  to: string; // WhatsApp number with country code (e.g., "5511999999999")
  message: string;
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
  type?: "text" | "template";
  template?: SendMessageRequest["template"];
  delay_ms?: number; // Delay between messages to avoid rate limiting
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      console.error("WhatsApp credentials not configured");
      return new Response(
        JSON.stringify({
          error: "WhatsApp not configured",
          details: "WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required",
          mock: true // Indicate this is a mock response
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const isBulk = url.pathname.endsWith("/bulk");

    if (isBulk) {
      // Handle bulk sending
      const { recipients, message, type = "text", template, delay_ms = 100 }: SendBulkRequest = await req.json();

      console.log("Bulk send request:", { recipientCount: recipients.length, type });

      const results = [];
      for (const recipient of recipients) {
        try {
          const result = await sendWhatsAppMessage(WHATSAPP_TOKEN, PHONE_NUMBER_ID, {
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
      const { to, message, type = "text", template }: SendMessageRequest = await req.json();

      console.log("Send message request:", { to, type, messageLength: message?.length });

      const result = await sendWhatsAppMessage(WHATSAPP_TOKEN, PHONE_NUMBER_ID, { to, message, type, template });

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
