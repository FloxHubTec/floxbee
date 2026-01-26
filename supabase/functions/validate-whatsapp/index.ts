import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface do Payload da Meta
interface MetaContactResponse {
  input: string;
  status: "valid" | "invalid" | "processing";
  wa_id?: string;
}

// Formatação BR padrão (55 + DDD + 9 + XXXX)
function formatBrazilianNumber(number: string): string {
  let cleaned = number.replace(/\D/g, "");
  cleaned = cleaned.replace(/^0+/, ""); // Remove zeros a esquerda

  // Se não tem DDI, assume Brasil (55)
  if (cleaned.length <= 11 && !cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }

  // Tratamento do 9º dígito para celulares
  if (cleaned.length === 12 && cleaned.startsWith("55")) {
    const ddd = parseInt(cleaned.substring(2, 4));
    const firstDigit = parseInt(cleaned.substring(4, 5));
    // DDDs válidos e começa com 6-9 (celular)
    if (ddd >= 11 && ddd <= 99 && firstDigit >= 6) {
      cleaned = cleaned.substring(0, 4) + "9" + cleaned.substring(4);
    }
  }

  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Setup do Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Autenticação e Tenant
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized user");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("owner_id, id")
      .eq("user_id", user.id)
      .single();

    const tenantId = profile?.owner_id || profile?.id;

    // 3. Buscar Credenciais do WhatsApp
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("owner_id", tenantId)
      .eq("integration_type", "whatsapp")
      .eq("is_active", true)
      .single();

    if (!integration || !integration.config) {
      throw new Error("Integração de WhatsApp não configurada ou inativa.");
    }

    const config = typeof integration.config === 'string'
      ? JSON.parse(integration.config)
      : integration.config;

    const { access_token, phone_number_id } = config;

    // 4. Receber números
    const { numbers } = await req.json();
    if (!numbers || !Array.isArray(numbers)) throw new Error("Array 'numbers' obrigatório");

    // Preparar listas para atualização em lote
    const validUpdates: string[] = [];
    const invalidUpdates: string[] = [];

    // 5. Validar na Meta (Loop para lidar com a API)
    // A API aceita validação em lote, mas vamos iterar para ter controle e formatação

    for (const rawNumber of numbers) {
      const formatted = formatBrazilianNumber(rawNumber);

      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phone_number_id}/contacts`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              blocking: "wait",
              contacts: [`+${formatted}`],
              force_check: true,
            }),
          }
        );

        const data = await response.json();
        const contactResult: MetaContactResponse = data.contacts?.[0];

        if (contactResult && contactResult.status === "valid") {
          // É WhatsApp Válido
          validUpdates.push(rawNumber); // Guardamos o número original ou formatado, dependendo de como está no seu banco

          // Se o número no banco for diferente do formatado, talvez precisemos atualizar o próprio número também
          // Para simplificar, vamos atualizar quem tem esse número exato ou formatado
        } else {
          // Não é WhatsApp
          invalidUpdates.push(rawNumber);
        }

      } catch (err) {
        console.error(`Erro ao validar ${formatted}:`, err);
      }
    }

    // 6. Atualizar o Banco de Dados (Em Lote)

    // A. Atualizar VÁLIDOS
    if (validUpdates.length > 0) {
      // Normalizamos a busca: atualizamos onde o whatsapp bater com o numero enviado
      // Nota: Isso assume que o numero no banco é igual ao enviado pelo front.
      // Se o front enviou formatado, e o banco ta sujo, pode falhar. 
      // O ideal é o front enviar os IDs dos contatos, mas vamos usar os números aqui.

      const { error: errorValid } = await supabaseAdmin
        .from("contacts")
        .update({
          whatsapp_validated: true,
          // Remove tag de invalido se existir
          // tags: array_remove(tags, 'whatsapp_invalido') -- (SQL complexo para Edge Function simples)
        })
        .in("whatsapp", validUpdates.map(n => formatBrazilianNumber(n))); // Tenta bater pelo formatado

      // Fallback: Tenta bater pelo número cru também
      await supabaseAdmin
        .from("contacts")
        .update({ whatsapp_validated: true })
        .in("whatsapp", validUpdates);
    }

    // B. Atualizar INVÁLIDOS
    if (invalidUpdates.length > 0) {
      // Para inválidos, marcamos validated = false
      // E idealmente adicionamos uma tag, mas update de array via JS client é chato (precisa ler antes).
      // Vamos apenas setar o validated = false por enquanto.

      await supabaseAdmin
        .from("contacts")
        .update({ whatsapp_validated: false })
        .in("whatsapp", invalidUpdates.map(n => formatBrazilianNumber(n)));

      await supabaseAdmin
        .from("contacts")
        .update({ whatsapp_validated: false })
        .in("whatsapp", invalidUpdates);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          checked: numbers.length,
          valid: validUpdates.length,
          invalid: invalidUpdates.length
        },
        valid_numbers: validUpdates
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro Geral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});