import React, { useState } from 'react';
import { 
  Users, Shield, Crown, UserCheck, Search, ShieldAlert, Briefcase, 
  MoreVertical, Pencil, Trash2, Key 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUsers, ROLE_LABELS, ROLE_COLORS, UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CreateUserDialog from './CreateUserDialog';

type AppRole = 'admin' | 'supervisor' | 'agente';

// Lista de Permissões Granulares (Sincronizada com o CreateUserDialog)
const AVAILABLE_PERMISSIONS = [
  { id: 'can_delete_tickets', label: 'Excluir Tickets' },
  { id: 'can_delete_contacts', label: 'Excluir Contatos' },
  { id: 'can_export_data', label: 'Exportar Relatórios' },
  { id: 'can_manage_tags', label: 'Gerenciar Tags' },
];

const UserManagement: React.FC = () => {
  const { users, isLoading, updateRole, toggleUserStatus, stats, refetch } = useUsers();
  const { user: currentUser, profile: currentProfile, isAdmin, isSuperadmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para Modais de Edição e Exclusão
  const [activeTab, setActiveTab] = useState(isSuperadmin ? 'admins' : 'team');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Estado do formulário de edição
  const [editForm, setEditForm] = useState({
    nome: '',
    permissions: {} as Record<string, boolean>
  });

  // Proteção de Acesso
  if (!isAdmin && !isSuperadmin) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <ShieldAlert className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          Apenas gestores podem acessar este painel.
        </AlertDescription>
      </Alert>
    );
  }

  // --- LÓGICA DE FILTRAGEM ---
  const filterUsers = (list: UserWithRole[]) => {
    return list.filter((user) =>
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // 1. Lista de Admins (Para Superadmin ver seus clientes)
  const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'superadmin');

  // 2. Lista Operacional (Para Superadmin ver APENAS sua equipe)
  const operationalUsers = users.filter(u => {
    // É operacional?
    const isOp = u.role === 'agente' || u.role === 'supervisor';
    
    if (!isOp) return false;

    // Se sou Superadmin, só mostro quem EU criei (minha equipe direta)
    if (isSuperadmin) {
      return u.created_by === currentProfile?.id;
    }
    
    // Se sou Admin comum, vejo todos operacionais (pois a RLS já filtra por tenant/owner se configurado, 
    // ou assumimos que o Admin vê tudo abaixo dele)
    return true;
  });

  // --- AÇÕES DO CRUD ---

  const handleEditClick = (user: UserWithRole) => {
    setEditingUser(user);
    setEditForm({
      nome: user.nome,
      // Garante que permissions seja um objeto, mesmo que venha null do banco
      permissions: (user.permissions as Record<string, boolean>) || {}
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (user: UserWithRole) => {
    setDeleteUser(user);
    setIsDeleteOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      // 1. Atualizar Profile (Nome)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome: editForm.nome })
        .eq('user_id', editingUser.user_id);

      if (profileError) throw profileError;

      // 2. Atualizar Permissões na tabela user_roles
      // Nota: role é atualizado pelo Select direto na lista, aqui focamos em permissions
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ permissions: editForm.permissions })
        .eq('user_id', editingUser.user_id); // A chave é user_id na tabela user_roles

      if (roleError) throw roleError;

      toast.success("Usuário atualizado com sucesso!");
      setIsEditOpen(false);
      refetch(); // Recarrega a lista
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao atualizar usuário", { description: error.message });
    }
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;

    try {
      // Chamar Edge Function para deletar usuário do Auth (Supabase Admin API)
      // Por segurança, apenas deletamos o profile/role lógico aqui se não tiver edge function,
      // mas o ideal é remover do Auth. Vamos assumir uma chamada de API ou Soft Delete.
      
      // Opção A: Soft Delete (Desativar) - Mais seguro para integridade
      // toggleUserStatus.mutate({ id: deleteUser.id, ativo: false });
      
      // Opção B: Delete Real (Requer Edge Function 'delete-user' ou cascade)
      // Para este exemplo, vamos desativar e limpar dados sensíveis via update, 
      // ou chamar a função se existir.
      
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteUser.user_id }
      });

      if (error) throw error;

      toast.success("Usuário excluído com sucesso!");
      setIsDeleteOpen(false);
      refetch();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao excluir usuário", { description: "Talvez você precise desativá-lo em vez de excluir." });
    }
  };

  const handleTogglePermission = (permId: string) => {
    setEditForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permId]: !prev.permissions[permId]
      }
    }));
  };

  // --- RENDERIZADORES AUXILIARES ---

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'admin': return <Shield className="w-3 h-3" />;
      case 'supervisor': return <UserCheck className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  const handleRoleChange = (targetUser: UserWithRole, newRole: string) => {
    if (targetUser.role === 'superadmin' && !isSuperadmin) return;
    updateRole.mutate({ userId: targetUser.user_id, newRole: newRole as AppRole });
  };

  const handleToggleStatus = (targetUser: UserWithRole) => {
    if (targetUser.role === 'superadmin' && !isSuperadmin) return;
    if (targetUser.user_id === currentUser?.id) return; 
    toggleUserStatus.mutate({ id: targetUser.id, ativo: !targetUser.ativo });
  };

  const UserList = ({ data }: { data: UserWithRole[] }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Nenhum usuário encontrado nesta categoria.</p>
        </div>
      ) : (
        data.map((user) => {
          const isTargetSuperadmin = user.role === 'superadmin';
          const canEdit = isSuperadmin || (!isTargetSuperadmin && isAdmin);
          const isSelf = user.user_id === currentUser?.id;

          return (
            <div
              key={user.id}
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all ${
                user.ativo ? 'bg-card hover:border-primary/30' : 'bg-muted/30 opacity-70'
              }`}
            >
              {/* Info do Usuário */}
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/5 text-primary font-medium">
                    {getInitials(user.nome)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{user.nome}</p>
                    {!user.ativo && <Badge variant="secondary" className="h-5 text-[10px]">Inativo</Badge>}
                    {isSelf && <Badge variant="outline" className="h-5 text-[10px] border-primary/40 text-primary">Você</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{user.email}</span>
                    {user.created_by && isSuperadmin && (
                      <span className="text-[10px] bg-muted px-1.5 rounded" title="ID do Criador">
                        Criado por: {user.created_by === currentProfile?.id ? 'Mim' : 'Outro Admin'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-3 justify-end w-full md:w-auto">
                {canEdit ? (
                  <Select
                    value={user.role}
                    onValueChange={(val) => handleRoleChange(user, val)}
                    disabled={isSelf}
                  >
                    <SelectTrigger className={`w-[140px] h-9 ${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]} border-0`}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {isSuperadmin && <SelectItem value="admin">Administrador</SelectItem>}
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="agente">Agente</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]} px-3 py-1.5 h-9`}>
                    {getRoleIcon(user.role)} {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                  </Badge>
                )}

                <div className="h-4 w-px bg-border mx-1" />

                <div className="flex items-center gap-2">
                  <Switch
                    checked={user.ativo ?? false}
                    onCheckedChange={() => handleToggleStatus(user)}
                    disabled={!canEdit || isSelf}
                    title={user.ativo ? "Desativar acesso" : "Ativar acesso"}
                  />
                </div>

                {canEdit && !isSelf && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEditClick(user)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar Dados
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(user)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir Usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {/* Modais (Dialogs) */}
      
      {/* 1. Modal de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Alterar dados e permissões de {editingUser?.nome}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                value={editForm.nome} 
                onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Permissões Especiais</Label>
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-md bg-muted/10">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`edit-${perm.id}`} 
                      checked={!!editForm.permissions[perm.id]}
                      onCheckedChange={() => handleTogglePermission(perm.id)}
                    />
                    <label
                      htmlFor={`edit-${perm.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Modal de Exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o acesso de <strong>{deleteUser?.nome}</strong> e não pode ser desfeita. 
              Histórico de conversas e tickets serão mantidos, mas desvinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conteúdo Principal da Página */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg"><Users className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gerenciamento de Acessos</CardTitle>
              <CardDescription>
                {isSuperadmin 
                  ? "Visão global de clientes e controle de sua equipe interna." 
                  : "Gerencie os membros da sua equipe."}
              </CardDescription>
            </div>
            <CreateUserDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou email..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isSuperadmin ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="admins" className="gap-2 h-10">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-semibold">Meus Clientes (Admins)</span>
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-2 h-10">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold">Minha Equipe Operacional</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="admins" className="mt-0">
                <UserList data={filterUsers(adminUsers)} />
              </TabsContent>
              <TabsContent value="team" className="mt-0">
                <UserList data={filterUsers(operationalUsers)} />
              </TabsContent>
            </Tabs>
          ) : (
            <UserList data={filterUsers(users)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;