import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Ticket,
  Megaphone,
  QrCode,
  FileText,
  Bot,
  Sparkles,
  Settings,
  LogOut,
  Code,
  Building2
} from 'lucide-react';
import FloxBeeLogo from '../FloxBeeLogo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Tipagem alinhada com o banco de dados
export type AppRole = 'superadmin' | 'admin' | 'supervisor' | 'agente';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: AppRole[];
}

// Definição dos menus e permissões
export const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/'
  },
  {
    icon: MessageSquare,
    label: 'Inbox',
    path: '/inbox'
  },
  {
    icon: Users,
    label: 'Contatos',
    path: '/contacts'
  },
  {
    icon: Ticket,
    label: 'Tickets',
    path: '/tickets'
  },
  {
    icon: Megaphone,
    label: 'Campanhas',
    path: '/campaigns',
    roles: ['superadmin', 'admin', 'supervisor']
  },
  {
    icon: QrCode,
    label: 'QR Codes',
    path: '/qr-codes',
    roles: ['superadmin', 'admin', 'supervisor']
  },
  {
    icon: FileText,
    label: 'Landing Pages',
    path: '/landing-pages',
    roles: ['superadmin', 'admin', 'supervisor']
  },
  {
    icon: FileText,
    label: 'Templates',
    path: '/templates',
    roles: ['superadmin', 'admin', 'supervisor']
  },
  {
    icon: Building2,
    label: 'Departamentos',
    path: '/departments',
    roles: ['superadmin', 'admin']
  },
  {
    icon: Bot,
    label: 'Automações',
    path: '/automations',
    roles: ['superadmin', 'admin']
  },
  {
    icon: Sparkles,
    label: 'IA Atendimento',
    path: '/ai-service',
    roles: ['superadmin', 'admin']
  },
  {
    icon: Code,
    label: 'API Docs',
    path: '/api-docs',
    roles: ['superadmin', 'admin']
  },
];

const AppSidebar: React.FC = () => {
  const { signOut, isAdmin, isSuperadmin, isSupervisor, profile } = useAuth();

  // Determina a role string atual com base nas flags hierárquicas do useAuth
  let currentRole: AppRole = 'agente';
  if (isSuperadmin) currentRole = 'superadmin';
  else if (isAdmin) currentRole = 'admin';
  else if (isSupervisor) currentRole = 'supervisor';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  // Filtra os itens baseado na role atual
  const filteredNavItems = navItems.filter((item) => {
    // Se não tiver restrição de roles, mostra para todos
    if (!item.roles) return true;
    // Verifica se a role atual está na lista permitida
    return item.roles.includes(currentRole);
  });

  return (
    <aside className="hidden md:flex h-full w-64 flex-col bg-card border-r border-border shadow-sm z-50 transition-all duration-300">

      {/* HEADER DA SIDEBAR */}
      <div className="p-6 flex items-center gap-3">
        <FloxBeeLogo size={32} />
      </div>

      {/* ÁREA DE NAVEGAÇÃO COM SCROLL */}
      <ScrollArea className="flex-1 px-4">
        <nav className="flex flex-col gap-1.5 pb-4">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>

              {/* Indicador visual de item restrito (apenas para admins/supervisores saberem) */}
              {item.roles && !item.roles.includes('agente') && (
                <span className="ml-auto w-1.5 h-1.5 bg-yellow-500 rounded-full opacity-50" title="Acesso Restrito" />
              )}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* FOOTER / PERFIL */}
      <div className="p-4 mt-auto">
        <Separator className="mb-4" />

        <div className="mb-4 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {profile?.nome?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate" title={profile?.nome}>
              {profile?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {ROLE_LABELS_PT[currentRole]}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )
            }
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

// Map simples para exibição bonita do cargo
const ROLE_LABELS_PT: Record<AppRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agente: 'Agente'
};

export default AppSidebar;