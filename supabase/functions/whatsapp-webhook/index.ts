import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "location";
  text?: { body: string };
  image?: { id: string; caption?: string };
  audio?: { id: string };
  document?: { id: string; filename: string };
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        contacts?: Array<{ wa_id: string; profile: { name: string } }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Webhook verification (GET request from WhatsApp)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification attempt:", {
      mode,
      receivedToken: token,
      challenge: challenge?.substring(0, 20),
    });

    // Initialize Supabase to get verify token from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch integration config and owner_id
    // We try to find any WhatsApp integration, prioritizing active ones
    const { data: integrations } = await supabase
      .from("integrations")
      .select("config, owner_id, is_active")
      .eq("integration_type", "whatsapp")
      .order("is_active", { ascending: false });

    const integration = integrations?.[0];
    const ownerId = integration?.owner_id;

    const VERIFY_TOKEN = integration?.config?.webhook_verify_token ||
      Deno.env.get("WHATSAPP_VERIFY_TOKEN") ||
      "floxbee_verify_token_2024";

    console.log("Token comparison:", {
      receivedToken: token,
      expectedToken: VERIFY_TOKEN,
      tokensMatch: token === VERIFY_TOKEN,
    });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return new Response(challenge, { status: 200 });
    } else {
      console.error("Webhook verification failed - token mismatch or invalid mode");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Handle incoming messages (POST request)
  if (req.method === "POST") {
    try {
      const payload: WebhookPayload = await req.json();
      console.log("Webhook received:", JSON.stringify(payload, null, 2));

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch integration config and owner_id
      const { data: integrations, error: intError } = await supabase
        .from("integrations")
        .select("config, owner_id, is_active")
        .eq("integration_type", "whatsapp")
        .order("is_active", { ascending: false });

      if (intError) {
        console.error("Error fetching integrations:", intError);
      }

      console.log("Available WhatsApp integrations:", JSON.stringify(integrations));

      const integration = integrations?.[0];
      const ownerId = integration?.owner_id;
      console.log("Resolved owner_id for this session:", ownerId);

      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // Process incoming messages
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              const whatsappContact = value.contacts?.[0];
              const whatsappNumber = message.from;
              const contactName = whatsappContact?.profile?.name || "Contato WhatsApp";

              console.log("Processing message:", {
                from: whatsappNumber,
                type: message.type,
                contactName: contactName,
              });

              let automationTriggered = false;

              // Extract message content
              let messageContent = "";
              let messageType = message.type;
              let attachmentUrl = "";
              let attachmentType = "";

              switch (message.type) {
                case "text":
                  messageContent = message.text?.body || "";
                  break;
                case "image":
                  messageContent = message.image?.caption || "[Imagem recebida]";
                  attachmentType = "image";
                  break;
                case "audio":
                  messageContent = "[Áudio recebido]";
                  attachmentType = "audio";
                  break;
                case "document":
                  messageContent = `[Documento: ${message.document?.filename}]`;
                  attachmentType = "document";
                  break;
                default:
                  messageContent = `[${message.type} recebido]`;
              }

              // ==========================================
              // AUTO-REGISTER CONTACT FROM WHATSAPP
              // ==========================================

              // Check if contact exists
              const { data: existingContact, error: contactError } = await supabase
                .from("contacts")
                .select("id, nome, whatsapp")
                .eq("whatsapp", whatsappNumber)
                .maybeSingle();

              let contactId: string;

              if (contactError) {
                console.error("Error checking contact:", contactError);
                continue;
              }

              if (!existingContact) {
                // Create new contact automatically
                const { data: newContact, error: createError } = await supabase
                  .from("contacts")
                  .insert({
                    nome: contactName,
                    whatsapp: whatsappNumber,
                    whatsapp_validated: true,
                    ativo: true,
                    tags: ["captado_whatsapp"],
                    metadata: {
                      source: "whatsapp_webhook",
                      first_message_at: new Date().toISOString(),
                      wa_profile_name: contactName,
                    },
                    owner_id: ownerId,
                  })
                  .select("id")
                  .single();

                if (createError) {
                  console.error("Error creating contact:", createError);
                  continue;
                }

                contactId = newContact.id;
                console.log("New contact created automatically:", {
                  id: contactId,
                  nome: contactName,
                  whatsapp: whatsappNumber,
                });
              } else {
                contactId = existingContact.id;

                // Update last_message_at for existing contact
                await supabase
                  .from("contacts")
                  .update({
                    last_message_at: new Date().toISOString(),
                    whatsapp_validated: true,
                  })
                  .eq("id", contactId);

                console.log("Existing contact found:", {
                  id: contactId,
                  nome: existingContact.nome,
                });
              }

              // ==========================================
              // CREATE OR GET CONVERSATION
              // ==========================================

              const { data: existingConversation, error: convError } = await supabase
                .from("conversations")
                .select("id, is_bot_active")
                .eq("contact_id", contactId)
                .in("status", ["ativo", "aguardando"])
                .maybeSingle();

              let conversationId: string;
              let isBotActive = true;

              if (convError) {
                console.error("Error checking conversation:", convError);
                continue;
              }

              if (!existingConversation) {
                // Create new conversation
                const { data: newConversation, error: createConvError } = await supabase
                  .from("conversations")
                  .insert({
                    contact_id: contactId,
                    status: "ativo",
                    is_bot_active: true,
                    unread_count: 1,
                    last_message_at: new Date().toISOString(),
                    owner_id: ownerId,
                  })
                  .select("id")
                  .single();

                if (createConvError) {
                  console.error("Error creating conversation:", createConvError);
                  continue;
                }

                conversationId = newConversation.id;
                console.log("New conversation created:", conversationId);
              } else {
                conversationId = existingConversation.id;
                isBotActive = existingConversation.is_bot_active ?? true;

                // Update conversation
                await supabase
                  .from("conversations")
                  .update({
                    last_message_at: new Date().toISOString(),
                    unread_count: 1,
                  })
                  .eq("id", conversationId);
              }

              // ==========================================
              // TRIGGER AUTOMATIONS (Welcome / First Message)
              // ==========================================

              try {
                const isNewContact = !existingContact;
                const isNewConversation = !existingConversation;
                const triggerType = isNewContact ? "new_contact" : (isNewConversation ? "first_message" : null);

                if (triggerType) {
                  // Check if there is an active rule for this trigger type
                  const { data: activeRules } = await supabase
                    .from("automation_rules")
                    .select("id, trigger_config")
                    .eq("ativo", true)
                    .eq("owner_id", ownerId)
                    .or(`trigger_config->>type.eq.new_contact,trigger_config->>type.eq.first_message,trigger_config->>type.eq.keyword`);

                  const matchedRule = activeRules?.find((rule: any) => {
                    const config = rule.trigger_config || {};
                    if (config.type === triggerType) return true;
                    if (config.type === "keyword" && messageContent) {
                      const keywords = config.keywords || [];
                      const normalizedMsg = messageContent.toLowerCase();
                      return keywords.some((kw: string) => normalizedMsg.includes(kw.toLowerCase()));
                    }
                    return false;
                  });

                  if (matchedRule) {
                    const finalTriggerType = (matchedRule.trigger_config as any).type;
                    console.log(`Triggering automation: ${finalTriggerType} (Rule: ${matchedRule.id})`);
                    // We don't await this to avoid delaying the webhook response
                    fetch(`${supabaseUrl}/functions/v1/welcome-automation`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${supabaseKey}`,
                      },
                      body: JSON.stringify({
                        contact_id: contactId,
                        trigger_type: finalTriggerType,
                        conversation_id: conversationId,
                        rule_id: matchedRule.id,
                      }),
                    }).catch(err => console.error("Error triggering automation:", err));

                    automationTriggered = true;
                  }
                } else if (messageContent) {
                  // If no welcome/first_message, still check for keywords
                  const { data: keywordRules } = await supabase
                    .from("automation_rules")
                    .select("id, trigger_config")
                    .eq("ativo", true)
                    .eq("owner_id", ownerId)
                    .contains("trigger_config", { type: "keyword" });

                  const matchedRule = keywordRules?.find((rule: any) => {
                    const keywords = (rule.trigger_config as any).keywords || [];
                    const normalizedMsg = messageContent.toLowerCase();
                    return keywords.some((kw: string) => normalizedMsg.includes(kw.toLowerCase()));
                  });

                  if (matchedRule) {
                    console.log(`Triggering keyword automation: ${matchedRule.id}`);
                    fetch(`${supabaseUrl}/functions/v1/welcome-automation`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${supabaseKey}`,
                      },
                      body: JSON.stringify({
                        contact_id: contactId,
                        trigger_type: "keyword",
                        conversation_id: conversationId,
                        rule_id: matchedRule.id,
                      }),
                    }).catch(err => console.error("Error triggering automation:", err));

                    automationTriggered = true;
                  }
                }
              } catch (autoErr) {
                console.error("Error checking/triggering automations:", autoErr);
              }

              // ==========================================
              // SAVE INCOMING MESSAGE
              // ==========================================

              const { error: msgError } = await supabase
                .from("messages")
                .insert({
                  conversation_id: conversationId,
                  content: messageContent,
                  sender_type: "servidor",
                  message_type: messageType,
                  whatsapp_message_id: message.id,
                  attachment_type: attachmentType || null,
                  metadata: {
                    wa_timestamp: message.timestamp,
                    wa_contact_name: contactName,
                  },
                });

              if (msgError) {
                console.error("Error saving message:", msgError);
              } else {
                console.log("Message saved successfully");
              }

              // ==========================================
              // TRIGGER AI RESPONSE IF BOT IS ACTIVE
              // ==========================================

              if (isBotActive && message.type === "text" && messageContent && !automationTriggered) {
                try {
                  // Fetch conversation history
                  const { data: history } = await supabase
                    .from("messages")
                    .select("content, sender_type")
                    .eq("conversation_id", conversationId)
                    .order("created_at", { ascending: false })
                    .limit(10);

                  const formattedHistory = (history || [])
                    .reverse()
                    .map((msg: any) => ({
                      role: msg.sender_type === "servidor" ? "user" : "assistant",
                      content: msg.content,
                    }));

                  // If history is empty (shouldn't be as we just saved the current message), 
                  // or just contains the current message, use just the current message.
                  // Actually, ai-chat might benefit from knowing the full history.

                  const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify({
                      messages: formattedHistory.length > 0 ? formattedHistory : [{ role: "user", content: messageContent }],
                      context: {
                        servidor_nome: contactName,
                        owner_id: ownerId,
                      },
                    }),
                  });

                  if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    console.log("AI Response generated:", {
                      needsHumanTransfer: aiData.needsHumanTransfer,
                      messagePreview: aiData.message?.substring(0, 100),
                    });

                    // Save AI response as message
                    if (aiData.message) {
                      await supabase
                        .from("messages")
                        .insert({
                          conversation_id: conversationId,
                          content: aiData.message,
                          sender_type: "ia",
                          message_type: "text",
                          status: "pending",
                        });

                      // Send AI response via WhatsApp
                      const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${supabaseKey}`,
                        },
                        body: JSON.stringify({
                          to: whatsappNumber,
                          message: aiData.message,
                          owner_id: ownerId,
                        }),
                      });

                      if (sendResponse.ok) {
                        console.log("AI response sent via WhatsApp");
                      } else {
                        console.error("Failed to send AI response:", await sendResponse.text());
                      }

                      // If needs human transfer, update conversation
                      if (aiData.needsHumanTransfer) {
                        await supabase
                          .from("conversations")
                          .update({
                            is_bot_active: false,
                            status: "aguardando",
                          })
                          .eq("id", conversationId);

                        console.log("Conversation transferred to human agent");
                      }
                    }
                  }
                } catch (aiError) {
                  console.error("Error calling AI:", aiError);
                }
              }
            }
          }

          // Process message status updates
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              console.log("Status update:", {
                message_id: status.id,
                status: status.status,
                recipient: status.recipient_id,
              });

              // TODO: Update message status in database
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
