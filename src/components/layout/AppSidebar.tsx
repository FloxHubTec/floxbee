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
import NotificationBell from './NotificationBell';
import { useTenant } from '@/hooks/useTenant';
import { TenantFeatures } from '@/config/tenant';

// Tipagem alinhada com o banco de dados
export type AppRole = 'superadmin' | 'admin' | 'supervisor' | 'agente';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: AppRole[];
  feature?: keyof TenantFeatures;
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
    path: '/tickets',
    feature: 'enableTickets'
  },
  {
    icon: Megaphone,
    label: 'Campanhas',
    path: '/campaigns',
    roles: ['superadmin', 'admin', 'supervisor'],
    feature: 'enableCampaigns'
  },
  {
    icon: QrCode,
    label: 'QR Codes',
    path: '/qr-codes',
    roles: ['superadmin', 'admin', 'supervisor'],
    feature: 'enablePublicRegister'
  },
  {
    icon: FileText,
    label: 'Landing Pages',
    path: '/landing-pages',
    roles: ['superadmin', 'admin', 'supervisor'],
    feature: 'enablePublicRegister'
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
    roles: ['superadmin', 'admin'],
    feature: 'enableTickets'
  },
  {
    icon: Bot,
    label: 'Automações',
    path: '/automations',
    roles: ['superadmin', 'admin'],
    feature: 'enableAutomations'
  },
  {
    icon: Sparkles,
    label: 'IA Atendimento',
    path: '/ai-service',
    roles: ['superadmin', 'admin'],
    feature: 'enableAI'
  },
  {
    icon: Code,
    label: 'API Docs',
    path: '/api-docs',
    roles: ['superadmin', 'admin'],
    feature: 'enableAPIAccess'
  },
];

interface AppSidebarProps {
  className?: string;
  isMobile?: boolean; // Nova prop para ajustes específicos
}

const AppSidebar: React.FC<AppSidebarProps> = ({ className, isMobile }) => {
  const { signOut, isAdmin, isSuperadmin, isSupervisor, profile } = useAuth();
  const { config } = useTenant();

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
    // 1. Filtragem por Role
    if (item.roles && !item.roles.includes(currentRole)) return false;

    // 2. Filtragem por Módulo (Feature flag)
    if (item.feature && !config.features[item.feature]) return false;

    return true;
  });

  return (
    <aside className={cn("h-full w-64 flex-col bg-card border-r border-border shadow-sm z-50 transition-all duration-300", className)}>

      {/* HEADER DA SIDEBAR - Escondido no mobile para não duplicar com o Header fixo */}
      {!isMobile && (
        <div className="p-6 flex items-center gap-3">
          <FloxBeeLogo size={32} />
        </div>
      )}

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

      {/* FOOTER - OPCIONAL / ESPAÇO EXTRA */}
      <div className="p-4 mt-auto">
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