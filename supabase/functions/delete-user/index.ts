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
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { user_id } = await req.json();

        if (!user_id) {
            throw new Error("ID do usuário é obrigatório.");
        }

        // 1. Buscar informações do usuário antes de qualquer ação
        const { data: profile, error: profileFetchError } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("user_id", user_id)
            .maybeSingle();

        if (profileFetchError) {
            throw profileFetchError;
        }

        if (!profile) {
            throw new Error("Perfil não encontrado.");
        }

        if (profile.role === 'admin') {
            console.log(`Deletando Admin e dados vinculados para: ${user_id}`);

            // 2. Com CASCADE configurado no banco, deletar o perfil já limpa quase tudo.
            // Deletamos o profile primeiro (que referencia o Auth).
            const { error: profileDeleteError } = await supabaseAdmin
                .from("profiles")
                .delete()
                .eq("user_id", user_id);

            if (profileDeleteError) {
                console.error("Erro ao deletar perfil:", profileDeleteError);
                throw profileDeleteError;
            }

            // 3. Deletar o usuário do Auth agora que o perfil (FK) se foi
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

            if (authDeleteError) {
                console.error("Erro ao deletar usuário no Auth:", authDeleteError);
                throw authDeleteError;
            }

            return new Response(
                JSON.stringify({ success: true, message: "Admin e todos os dados vinculados foram excluídos com sucesso." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        } else {
            console.log(`Desativando usuário operacional: ${user_id}`);

            // Apenas desativar usuários que não são Admin
            const { error: updateError } = await supabaseAdmin
                .from("profiles")
                .update({ ativo: false })
                .eq("user_id", user_id);

            if (updateError) throw updateError;

            return new Response(
                JSON.stringify({ success: true, message: "Usuário desativado com sucesso. Reativação permitida apenas por Superadmin." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        }

    } catch (error: any) {
        console.error("Erro na Edge Function delete-user:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Erro interno ao processar exclusão." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
