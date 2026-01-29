import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import AppSidebar, { navItems, AppRole } from './AppSidebar'; // Importando a lista e tipos
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Menu, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'; // Importando Sheet
import FloxBeeLogo from '../FloxBeeLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import NotificationBell from './NotificationBell';

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
      <AppSidebar />

      {/* HEADER MOBILE (Só aparece em telas pequenas) */}
      {isMobile && (
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 md:hidden">
          <div className="flex items-center gap-2">
            <FloxBeeLogo size={24} />
            {/*<span className="font-bold text-lg text-primary">FloxBee</span>*/}
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell />

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              {/* CONTEÚDO DO MENU MOBILE */}
              <SheetContent side="left" className="p-0 w-72 bg-card border-r flex flex-col">
                {/* Cabeçalho do Sheet (Acessibilidade) */}
                <SheetHeader className="px-6 py-4 text-left shrink-0">
                  <SheetTitle className="flex items-center gap-2">
                    <FloxBeeLogo size={28} />
                    <span className="text-primary">Menu</span>
                  </SheetTitle>
                </SheetHeader>

                {/* Área scrollável com altura calculada */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full px-4">
                    <div className="flex flex-col min-h-full pb-6">
                      <nav className="flex flex-col gap-2 pt-2 pb-4">
                        {filteredNavItems.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setOpen(false)} // FECHA O MENU AO CLICAR
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              )
                            }
                          >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </NavLink>
                        ))}
                      </nav>

                      {/* Rodapé do Menu Mobile - Dentro do ScrollArea */}
                      <div className="mt-auto pt-4 border-t">
                        <div className="mb-4 px-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {profile?.nome?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{profile?.nome || 'Usuário'}</p>
                            <p className="text-xs text-muted-foreground capitalize">{currentRole}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <NavLink
                            to="/settings"
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"
                              )
                            }
                          >
                            <Settings className="w-4 h-4" />
                            <span>Configurações</span>
                          </NavLink>

                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sair</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 h-full overflow-hidden relative w-full bg-background">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;