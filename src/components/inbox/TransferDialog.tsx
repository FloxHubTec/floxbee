import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, UserX } from 'lucide-react';
import { useUsers, ROLE_LABELS, ROLE_COLORS } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

interface TransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentAssignedTo?: string | null;
    onTransfer: (userId: string | null) => void;
    isLoading?: boolean;
}

export const TransferDialog: React.FC<TransferDialogProps> = ({
    open,
    onOpenChange,
    currentAssignedTo,
    onTransfer,
    isLoading = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const { users, isLoading: loadingUsers } = useUsers();

    // Filtrar apenas usuários ativos
    const activeUsers = users.filter((user) => user.ativo);

    // Aplicar filtro de busca
    const filteredUsers = activeUsers.filter((user) =>
        user.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleTransfer = () => {
        onTransfer(selectedUserId);
        setSelectedUserId(null);
        setSearchQuery('');
        onOpenChange(false);
    };

    const handleUnassign = () => {
        onTransfer(null);
        setSelectedUserId(null);
        setSearchQuery('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Transferir Conversa</DialogTitle>
                    <DialogDescription>
                        Escolha um agente, supervisor ou admin para assumir esta conversa
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Campo de busca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou email..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Lista de usuários */}
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {loadingUsers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Nenhum usuário encontrado
                            </div>
                        ) : (
                            filteredUsers.map((user) => {
                                const isCurrentlyAssigned = user.id === currentAssignedTo;
                                const isSelected = user.id === selectedUserId;

                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUserId(user.id)}
                                        disabled={isCurrentlyAssigned}
                                        className={cn(
                                            'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                                            isSelected && 'bg-primary/5 border-primary',
                                            !isSelected && !isCurrentlyAssigned && 'hover:bg-secondary border-border',
                                            isCurrentlyAssigned && 'opacity-50 cursor-not-allowed border-border'
                                        )}
                                    >
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                {user.nome.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm truncate">
                                                    {user.nome}
                                                </p>
                                                {isCurrentlyAssigned && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Atual
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {user.email || 'Sem email'}
                                                </p>
                                            </div>
                                        </div>

                                        <Badge className={cn('text-xs', ROLE_COLORS[user.role])}>
                                            {ROLE_LABELS[user.role]}
                                        </Badge>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Opção de remover atribuição */}
                    {currentAssignedTo && (
                        <button
                            onClick={() => setSelectedUserId(null)}
                            className={cn(
                                'w-full flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors',
                                selectedUserId === null
                                    ? 'bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-700'
                                    : 'border-dashed hover:bg-secondary'
                            )}
                        >
                            <UserX className="w-4 h-4" />
                            <span className="text-sm font-medium">Remover Atribuição</span>
                        </button>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSelectedUserId(null);
                            setSearchQuery('');
                            onOpenChange(false);
                        }}
                    >
                        Cancelar
                    </Button>

                    {selectedUserId === null && currentAssignedTo ? (
                        <Button
                            onClick={handleUnassign}
                            disabled={isLoading}
                            variant="destructive"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Remover Atribuição
                        </Button>
                    ) : (
                        <Button
                            onClick={handleTransfer}
                            disabled={!selectedUserId || isLoading}
                        >
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Transferir
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
