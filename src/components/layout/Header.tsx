import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Settings,
    LogOut,
    User,
    ChevronDown,
    Search,
    Menu
} from 'lucide-react';
import FloxBeeLogo from '../FloxBeeLogo';
import { useAuth } from '@/hooks/useAuth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NotificationBell from './NotificationBell';

interface HeaderProps {
    onOpenMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenMenu }) => {
    const { signOut, profile, isAdmin, isSuperadmin, isSupervisor } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/auth');
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
    };

    let currentRole = 'Agente';
    if (isSuperadmin) currentRole = 'Super Admin';
    else if (isAdmin) currentRole = 'Administrador';
    else if (isSupervisor) currentRole = 'Supervisor';

    return (
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0 z-40">
            <div className="flex items-center gap-2">
                {/* Menu Hambúrguer (Mobile) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onOpenMenu}
                >
                    <Menu className="w-5 h-5 text-muted-foreground" />
                </Button>

                <div className="md:hidden">
                    <FloxBeeLogo size={24} />
                </div>

                {/* Barra de Busca (Desktop) */}
                <div className="hidden md:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full w-64 border border-border focus-within:border-primary transition-colors">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar..."
                        className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-xs"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 ml-auto">
                <NotificationBell />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-muted/50">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/20">
                                {profile?.nome?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="hidden md:flex flex-col items-start gap-0.5">
                                <span className="text-sm font-medium leading-none">{profile?.nome || 'Usuário'}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{currentRole}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground mr-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-2">
                        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer gap-2">
                            <User className="w-4 h-4" />
                            <span>Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer gap-2 text-primary">
                            <Settings className="w-4 h-4" />
                            <span>Configurações</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50">
                            <LogOut className="w-4 h-4" />
                            <span>Sair do FloxBee</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};

export default Header;
