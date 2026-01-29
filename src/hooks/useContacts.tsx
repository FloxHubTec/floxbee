import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // Ajuste o import conforme seu projeto (sonner ou use-toast)

// Tipos manuais baseados no banco
export interface Contact {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  matricula: string | null;
  cargo: string | null;
  secretaria: string | null;
  department_id: string | null;
  tags: string[];
  whatsapp_validated: boolean;
  ativo: boolean;
  created_at: string;
  // Campos relacionais
  department?: { id: string; name: string } | null;
}

export interface ContactInsert {
  nome: string;
  whatsapp: string;
  email?: string | null;
  matricula?: string | null;
  cargo?: string | null;
  secretaria?: string | null;
  department_id?: string | null;
  tags?: string[];
  data_nascimento?: string | null;
}

export const useContacts = () => {
  const queryClient = useQueryClient();

  // 1. LISTAR CONTATOS
  const {
    data: contacts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          department:department_id(id, name)
        `)
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao buscar contatos:", error);
        throw error;
      }
      return data as Contact[];
    },
  });

  // 2. CRIAR CONTATO
  const createContact = useMutation({
    mutationFn: async (newContact: ContactInsert) => {
      // Buscar o profile do usuário logado para obter o owner_id (Tenant)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, owner_id")
        .eq("user_id", user.id)
        .single();

      const owner_id = profile?.owner_id || profile?.id;

      const { data, error } = await supabase
        .from("contacts")
        .insert({
          ...newContact,
          owner_id: owner_id,
          ativo: true,
          whatsapp_validated: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato criado com sucesso!");
    },
    onError: (error: any) => {
      if (error?.code === "42501" && error?.message?.includes("row-level security")) {
        toast.error(
          "Não foi possível adicionar o contato devido à política de segurança da tabela (RLS). " +
          "Verifique se você tem permissão ou se o contato está vinculado a outros dados (departamento, proprietário, etc)."
        );
      } else {
        toast.error("Erro ao criar contato: " + (error.message || "Erro desconhecido"));
      }
    },
  });

  // 3. ATUALIZAR CONTATO
  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContactInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // 4. EXCLUIR CONTATO
  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato excluído!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  // 5. ATUALIZAR TAGS (Utilizado no Inbox)
  const updateContactTags = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update({ tags })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar tags: " + error.message);
    },
  });

  return {
    contacts,
    isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
    updateContactTags,
  };
};

// --- HOOK DE IMPORTAÇÃO (CORRIGIDO) ---
export const useImportContacts = () => {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const importContacts = async (file: File) => {
    setIsImporting(true);
    try {
      // 1. Importar dinamicamente a lib xlsx para economizar bundle se não for usada
      const XLSX = await import('xlsx');

      // 2. Ler o arquivo
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Pegar a primeira planilha
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("O arquivo está vazio.");
      }

      console.log(`Processando ${jsonData.length} linhas do arquivo...`);

      // 3. Mapear campos (Aceita cabeçalhos em português e inglês, maiúsculos/minúsculos)
      const mappedContacts = jsonData.map(row => {
        // Normaliza as chaves para facilitar a busca
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = row[key];
        });

        return {
          nome: normalizedRow.nome || normalizedRow.name || "Sem Nome",
          whatsapp: String(normalizedRow.whatsapp || normalizedRow.telefone || normalizedRow.phone || "").replace(/\D/g, ""),
          email: normalizedRow.email || null,
          matricula: String(normalizedRow.matricula || normalizedRow.id || "").trim() || null,
          secretaria: normalizedRow.secretaria || normalizedRow.departamento || normalizedRow.department || null,
          cargo: normalizedRow.cargo || normalizedRow.role || null,
          tags: normalizedRow.tags ? String(normalizedRow.tags).split(',').map(t => t.trim()) : ["importado"]
        };
      }).filter(c => c.whatsapp.length >= 8); // Filtro básico para números válidos

      if (mappedContacts.length === 0) {
        throw new Error("Nenhum contato válido encontrado (verifique se a coluna 'WhatsApp' está preenchida).");
      }

      // 3.1 Buscar owner_id para garantir multi-tenancy correto na importação
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from('profiles')
        .select('owner_id, id')
        .eq('user_id', user.id)
        .single();

      const owner_id = profile?.owner_id || profile?.id;

      // 4. Invocar Edge Function com owner_id
      const { data: importResult, error: importError } = await supabase.functions.invoke(
        "import-contacts",
        { body: { contacts: mappedContacts, owner_id, update_existing: true } }
      );

      if (importError) throw importError;

      // 5. Sucesso
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      const { success, total, failed } = importResult;
      toast.success(`Importação concluída! ${success} contatos salvos.`);

      if (failed > 0) {
        toast.warning(`${failed} contatos falharam na importação.`);
      }

      return { success: true, ...importResult };

    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error("Erro ao importar: " + (error.message || "Erro interno"));
      return { success: false, error: error.message };
    } finally {
      setIsImporting(false);
    }
  };

  return { importContacts, isImporting };
};

// --- HOOK DE VALIDAÇÃO (CORRIGIDO) ---
export const useValidateWhatsApp = () => {
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);

  const validateAndUpdateContacts = async (contactIds: string[]) => {
    setIsValidating(true);
    try {
      // 1. Busca os números do banco
      const { data: contacts, error: fetchError } = await supabase
        .from("contacts")
        .select("id, whatsapp")
        .in("id", contactIds);

      if (fetchError) throw fetchError;
      if (!contacts || contacts.length === 0) throw new Error("Nenhum contato selecionado");

      const numbers = contacts.map((c) => c.whatsapp);

      // 2. Chama a Edge Function
      // A Edge Function AGORA ATUALIZA O BANCO SOZINHA

      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("owner_id, id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const owner_id = creatorProfile?.owner_id || creatorProfile?.id;

      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        "validate-whatsapp",
        { body: { numbers, owner_id } }
      );

      if (validationError) throw validationError;

      // 3. Atualiza a tela (Não precisamos fazer loop de update aqui)
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      // Exibe resumo
      const summary = validationData.summary;
      if (summary) {
        if (summary.valid > 0) {
          toast.success(`${summary.valid} contatos validados com sucesso!`);
        } else {
          toast.warning(`Validação concluída: ${summary.invalid} inválidos.`);
        }
      }

      return validationData;

    } catch (error: any) {
      console.error(error);
      toast.error("Erro na validação: " + (error.message || "Erro desconhecido"));
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  return { validateAndUpdateContacts, isValidating };
};