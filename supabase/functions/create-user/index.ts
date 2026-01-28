import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS Preflight (OPTIONS request)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Parse do corpo da requisição
    const { email, password, nome, role, permissions, created_by } = await req.json();

    if (!email || !password) {
      throw new Error("Email e senha são obrigatórios.");
    }

    // 3. Criar o usuário no sistema de Autenticação (Auth)
    // DICA: Passamos tudo no user_metadata para que o Trigger 'handle_new_user'
    // já possa preencher a tabela profiles corretamente na hora da criação.
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nome: nome,
        role: role || 'agente',
        permissions: permissions || {},
        created_by: created_by || null
      }
    });

    if (createError) {
      console.error("Erro no Auth:", createError);
      throw createError;
    }

    if (userData.user) {
      const newUserId = userData.user.id;
      console.log(`Usuário criado no Auth: ${newUserId}`);

      // 4. Garantir atualização do Perfil (profiles)
      // Mesmo que o trigger já tenha rodado, fazemos um UPDATE explícito aqui
      // para garantir que role, permissions e created_by fiquem salvos corretamente
      // na tabela profiles, caso o trigger tenha falhado em pegar os metadados.

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          nome: nome,
          role: role || 'agente',       // <--- Agora salvamos direto no profile
          permissions: permissions || {}, // <--- Agora salvamos direto no profile
          created_by: created_by || null,
          ativo: true,
          must_change_password: true // Novos usuários precisam trocar a senha
        })
        .eq("user_id", newUserId);

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError);
        // Não lançamos erro fatal aqui pois o usuário Auth já foi criado, 
        // mas é bom monitorar nos logs.
      }
    }

    // 5. Retorno de Sucesso
    return new Response(
      JSON.stringify({
        success: true,
        user: userData.user,
        message: "Usuário criado e configurado com sucesso."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Erro na Edge Function create-user:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Erro interno ao criar usuário." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});