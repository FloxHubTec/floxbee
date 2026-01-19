import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

// Definindo tipos baseados no Supabase
export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

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
      // O RLS do banco já filtra automaticamente o que o usuário pode ver.
      // Não precisamos filtrar por owner_id aqui.
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
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
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          ...contact,
          ativo: true // Garante que nasce ativo por padrão
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contato criado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 3. ATUALIZAR CONTATO
  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
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
      toast({ title: "Contato atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
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
      toast({ title: "Contato excluído com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    contacts,
    isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
  };
};

// --- HOOK DE IMPORTAÇÃO (CSV/EXCEL) ---
export const useImportContacts = () => {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const importContacts = async (file: File) => {
    setIsImporting(true);

    try {
      const fileName = file.name.toLowerCase();
      const isCSV = fileName.endsWith(".csv");
      const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
      const isODS = fileName.endsWith(".ods");

      let data: string[][];

      // Lógica de Parsing (CSV vs Excel)
      if (isCSV) {
        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim());
        data = lines.map(line => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if ((char === ',' || char === ';') && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        });
      } else if (isExcel || isODS) {
        // Importação dinâmica do XLSX para não pesar o bundle inicial
        const XLSX = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      } else {
        throw new Error("Formato não suportado. Use CSV, XLSX, XLS ou ODS");
      }

      if (data.length < 2) {
        throw new Error("Arquivo vazio ou sem dados válidos");
      }

      // Mapeamento de Colunas (Headers)
      const headers = data[0].map((h) => String(h || "").trim().toLowerCase());

      const nameIndex = headers.findIndex((h) =>
        ["nome", "name", "servidor", "funcionario", "funcionário", "cliente"].includes(h)
      );
      const whatsappIndex = headers.findIndex((h) =>
        ["whatsapp", "telefone", "celular", "phone", "tel", "fone"].includes(h)
      );
      const emailIndex = headers.findIndex((h) => ["email", "e-mail", "e_mail"].includes(h));
      
      // Colunas opcionais (Verifique se existem no seu banco)
      const secretariaIndex = headers.findIndex((h) => ["secretaria", "setor", "lotação"].includes(h));
      const matriculaIndex = headers.findIndex((h) => ["matricula", "matrícula", "id"].includes(h));
      const cargoIndex = headers.findIndex((h) => ["cargo", "função"].includes(h));
      const nascimentoIndex = headers.findIndex((h) => ["nascimento", "data_nascimento", "dt_nasc"].includes(h));

      if (nameIndex === -1 || whatsappIndex === -1) {
        throw new Error("O arquivo deve ter colunas 'nome' e 'whatsapp/telefone'");
      }

      const contactsToInsert: ContactInsert[] = [];

      for (let i = 1; i < data.length; i++) {
        const values = data[i].map((v) => String(v || "").trim());

        if (!values[nameIndex] || !values[whatsappIndex]) continue;

        // Limpeza e Formatação do WhatsApp (BR)
        let whatsapp = values[whatsappIndex].replace(/\D/g, "");
        if (whatsapp.length === 11) {
          whatsapp = `55${whatsapp}`; // Ex: 11999998888 -> 5511999998888
        } else if (whatsapp.length === 10) {
          whatsapp = `55${whatsapp.slice(0, 2)}9${whatsapp.slice(2)}`; // Ex: 1188887777 -> 5511988887777
        }
        
        // Pula números inválidos
        if (whatsapp.length < 10) continue;

        // Formatação de Data
        let dataNascimento: string | null = null;
        if (nascimentoIndex !== -1 && values[nascimentoIndex]) {
          const dateValue = values[nascimentoIndex];
          const dateMatch = dateValue.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, "0");
            const month = dateMatch[2].padStart(2, "0");
            let year = dateMatch[3];
            if (year.length === 2) year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
            dataNascimento = `${year}-${month}-${day}`;
          }
        }

        // Construção do Objeto
        // Nota: O cast 'as any' é usado aqui caso seu banco ainda não tenha matricula/secretaria
        // Se já tiver criado essas colunas, pode remover o 'as any'.
        const newContact: any = {
          nome: values[nameIndex],
          whatsapp,
          email: emailIndex !== -1 ? values[emailIndex] || null : null,
          ativo: true, // Importante: Marca como ativo
          tags: ["importado"],
          // Campos opcionais mapeados dinamicamente
          ...(secretariaIndex !== -1 && { secretaria: values[secretariaIndex] }),
          ...(matriculaIndex !== -1 && { matricula: values[matriculaIndex] }),
          ...(cargoIndex !== -1 && { cargo: values[cargoIndex] }),
          ...(dataNascimento && { data_nascimento: dataNascimento }),
        };

        contactsToInsert.push(newContact);
      }

      if (contactsToInsert.length === 0) {
        throw new Error("Nenhum contato válido encontrado no arquivo");
      }

      // Inserção em Lotes (Batches) para performance
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const batch = contactsToInsert.slice(i, i + batchSize);
        
        // Upsert usando WhatsApp como chave única para evitar duplicados
        const { error } = await supabase.from("contacts").upsert(batch, {
          onConflict: "whatsapp",
          ignoreDuplicates: false, 
        });

        if (error) throw error;
        inserted += batch.length;
      }

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      toast({
        title: "Importação concluída!",
        description: `${inserted} contatos importados com sucesso.`,
      });

      return { success: true, count: inserted };

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsImporting(false);
    }
  };

  return { importContacts, isImporting };
};

// --- HOOK DE VALIDAÇÃO DE WHATSAPP ---
export const useValidateWhatsApp = () => {
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);

  const validateNumbers = async (numbers: string[]) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-whatsapp", {
        body: { numbers },
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Erro na validação",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const validateAndUpdateContacts = async (contactIds: string[]) => {
    setIsValidating(true);
    try {
      const { data: contacts, error: fetchError } = await supabase
        .from("contacts")
        .select("id, whatsapp")
        .in("id", contactIds);

      if (fetchError) throw fetchError;
      if (!contacts || contacts.length === 0) throw new Error("Nenhum contato encontrado");

      const numbers = contacts.map((c) => c.whatsapp);

      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        "validate-whatsapp",
        { body: { numbers } }
      );

      if (validationError) throw validationError;

      const results = validationData.results;
      let updatedCount = 0;

      for (const result of results) {
        const contact = contacts.find((c) => c.whatsapp === result.formatted || c.whatsapp === result.number);
        if (contact && result.valid) {
            // Verifica se a tabela tem a coluna whatsapp_validated antes de atualizar
            // Se não tiver, você deve criar ou remover essa linha
            await supabase
            .from("contacts")
            .update({
              whatsapp: result.formatted,
              // whatsapp_validated: true, // Descomente se tiver essa coluna
            } as any) 
            .eq("id", contact.id);
          updatedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast({
        title: "Validação concluída!",
        description: `${updatedCount} contatos atualizados.`,
      });

      return validationData;
    } catch (error: any) {
      toast({
        title: "Erro na validação",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  return { validateNumbers, validateAndUpdateContacts, isValidating };
};