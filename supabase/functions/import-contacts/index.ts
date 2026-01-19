import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactImport {
  nome: string;
  whatsapp: string;
  matricula?: string;
  secretaria?: string;
  email?: string;
  tags?: string[];
}

serve(async (req) => {
  // Tratamento do CORS (Preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contacts, update_existing = true } = await req.json();

    if (!contacts || !Array.isArray(contacts)) {
      throw new Error("Formato inválido. Esperado um array de contatos.");
    }

    console.log(`Iniciando importação de ${contacts.length} contatos...`);

    const results = {
      total: contacts.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Processamento em lotes para evitar timeout ou estouro de memória
    // O Supabase suporta upsert, o que facilita muito
    const batchSize = 100;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize).map((c: ContactImport) => {
        // Limpeza básica do WhatsApp (apenas números)
        const cleanPhone = c.whatsapp.replace(/\D/g, "");

        return {
          nome: c.nome,
          whatsapp: cleanPhone,
          matricula: c.matricula || null,
          secretaria: c.secretaria || null,
          email: c.email || null,
          tags: c.tags || ["importado"],
          ativo: true,
          whatsapp_validated: false, // Será validado no primeiro envio
        };
      });

      // Upsert: Se o whatsapp já existir, atualiza os dados se update_existing for true
      // Caso contrário, ignora (onConflict)
      const { error } = await supabase
        .from("contacts")
        .upsert(batch, {
          onConflict: "whatsapp",
          ignoreDuplicates: !update_existing
        });

      if (error) {
        console.error(`Erro no lote ${i}:`, error);
        results.failed += batch.length;
        results.errors.push(`Erro no lote iniciado em ${i}: ${error.message}`);
      } else {
        results.success += batch.length;
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});