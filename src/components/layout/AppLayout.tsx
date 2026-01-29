import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import AppSidebar, { AppRole, navItems } from './AppSidebar';
import Header from './Header';

const AppLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false); // Estado para controlar o menu mobile
  const { signOut, isAdmin, isSuperadmin, isSupervisor, profile } = useAuth();
  const location = useLocation();

  // Lógica de Role (Replicada para o Mobile garantir segurança visual)
  let currentRole: AppRole = 'agente';
  if (isSuperadmin) currentRole = 'superadmin';
  else if (isAdmin) currentRole = 'admin';
  else if (isSupervisor) currentRole = 'supervisor';

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  });

  const handleLogout = async () => {
    try {
      await signOut();
      setOpen(false);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background fixed inset-0 flex-col md:flex-row">

      {/* SIDEBAR DESKTOP */}
      <AppSidebar className="hidden md:flex" />

      {/* CONTEÚDO PRINCIPAL (HEADER + OUTLET) */}
      <main className="flex-1 h-full overflow-hidden relative w-full bg-background flex flex-col">
        {/* HEADER GLOBAL (Desktop e Mobile) */}
        <Header onOpenMenu={() => setOpen(true)} />

        {/* ÁREA DE CONTEÚDO SCROLLÁVEL */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-muted/20">
          <Outlet />
        </div>

        {/* MENU MOBILE (Drawer/Sheet) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r">
            <AppSidebar className="flex w-full" isMobile />
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
};

export default AppLayout;