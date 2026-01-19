import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const DEFAULT_PASSWORD = 'FloxBee@2026';

const createUserSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.string(),
});

const AVAILABLE_PERMISSIONS = [
  { id: 'can_delete_tickets', label: 'Excluir Tickets' },
  { id: 'can_delete_contacts', label: 'Excluir Contatos' },
  { id: 'can_export_data', label: 'Exportar Relatórios' },
  { id: 'can_manage_tags', label: 'Gerenciar Tags' },
];

const CreateUserDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('agente');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  // Pegamos o isSuperadmin para decidir quais roles mostrar
  const { profile: currentProfile, isSuperadmin } = useAuth();
  const queryClient = useQueryClient();

  const togglePermission = (id: string) => {
    setPermissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = createUserSchema.safeParse({ nome, email, role });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!currentProfile?.id) {
      toast.error("Erro de sessão. Recarregue a página.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          nome,
          email,
          password: DEFAULT_PASSWORD,
          role,
          permissions,
          created_by: currentProfile.id,
          must_change_password: true
        },
      });

      if (error) throw error;

      toast.success(`Usuário criado com sucesso!`, {
        description: `Login: ${email} | Senha: ${DEFAULT_PASSWORD}`,
        duration: 6000,
      });

      setNome('');
      setEmail('');
      setRole('agente');
      setPermissions({});
      setOpen(false);

      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Usuário</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          <DialogDescription>
            {isSuperadmin
              ? "Crie um novo Administrador (Cliente) ou Agente."
              : "Adicione um membro à sua equipe."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="nome"
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função (Role)</Label>
              <Select value={role} onValueChange={setRole} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>

                  {/* AQUI ESTÁ O SEGREDO: Só Superadmin vê a opção de criar Admin */}
                  {isSuperadmin && (
                    <SelectItem value="admin" className="font-semibold text-primary">
                      Administrador (Gestor)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email de Acesso</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase text-muted-foreground font-semibold">
              <ShieldCheck className="w-3 h-3" />
              Permissões Granulares
            </Label>
            <div className="grid grid-cols-2 gap-3 p-3 border rounded-md bg-muted/20">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <div key={perm.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={perm.id}
                    checked={!!permissions[perm.id]}
                    onCheckedChange={() => togglePermission(perm.id)}
                    disabled={loading}
                  />
                  <label
                    htmlFor={perm.id}
                    className="text-sm leading-none cursor-pointer"
                  >
                    {perm.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Senha Provisória</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={DEFAULT_PASSWORD}
                className="pl-10 bg-muted text-muted-foreground"
                disabled
                readOnly
              />
            </div>
            <p className="text-xs text-muted-foreground">O usuário deverá trocar a senha no primeiro login.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;