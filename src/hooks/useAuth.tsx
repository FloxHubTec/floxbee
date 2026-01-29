import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Definição robusta do Perfil baseada no seu JSON real
export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  avatar_url: string | null;
  telefone: string | null;
  matricula: string | null;
  role: "superadmin" | "admin" | "supervisor" | "agente";
  permissions: Record<string, boolean>;
  ativo: boolean;
  must_change_password: boolean | null;
  // Campos de controle de Tenant
  created_by: string | null;
  owner_id?: string | null; // Caso você tenha adicionado essa coluna explicitamente
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Flags de Permissão (Hierárquicas)
  isSuperadmin: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAgente: boolean;
  // Outros
  mustChangePassword: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Escutar mudanças na autenticação (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Pequeno delay para garantir que triggers de banco (handle_new_user) tenham tempo de rodar em novos cadastros
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 100);
      } else {
        // Logout: Limpa tudo
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Checar sessão inicial ao carregar a página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Busca direta na tabela profiles (Tabela Única)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("❌ Erro ao buscar perfil:", error.message);
      }

      if (data) {
        // --- VERIFICAÇÃO DE STATUS ATIVO ---
        if (data.ativo === false) {
          console.warn("🚫 Usuário inativo. Bloqueando acesso.");
          toast.error("Sua conta está inativa. Entre em contato com o administrador.");
          signOut();
          return;
        }

        // Se tiver owner_id e não for o próprio (herdeiro), verificar se o dono está ativo
        if (data.owner_id && data.owner_id !== data.id) {
          const { data: ownerData } = await supabase
            .from("profiles")
            .select("ativo")
            .eq("id", data.owner_id)
            .maybeSingle();

          if (ownerData && ownerData.ativo === false) {
            console.warn("🚫 Organização inativa. Bloqueando acesso.");
            toast.error("O acesso da sua organização foi suspenso. Entre em contato com o suporte.");
            signOut();
            return;
          }
        }

        // Garantir que permissions seja um objeto, mesmo que venha null
        const safeProfile = {
          ...data,
          permissions: data.permissions || {}
        } as Profile;

        console.log("✅ Perfil carregado:", safeProfile.nome, "| Role:", safeProfile.role);
        setProfile(safeProfile);
      } else {
        console.warn("⚠️ Perfil não encontrado. O trigger pode ter falhado ou demorado.");
      }
    } catch (error) {
      console.error("🚨 Exceção no fetchUserData:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  // --- LÓGICA DE HIERARQUIA DE PERMISSÕES ---
  const currentRole = profile?.role || 'agente';

  // Superadmin: Acesso total
  const isSuperadmin = currentRole === "superadmin";

  // Admin: É Admin OU Superadmin
  const isAdmin = currentRole === "admin" || isSuperadmin;

  // Supervisor: É Supervisor OU Admin OU Superadmin
  const isSupervisor = currentRole === "supervisor" || isAdmin;

  // Agente: Todos são agentes no mínimo
  const isAgente = true;

  const mustChangePassword = profile?.must_change_password ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut,
        isSuperadmin,
        isAdmin,
        isSupervisor,
        isAgente,
        mustChangePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};