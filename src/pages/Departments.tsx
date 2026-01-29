import React, { useState } from 'react';
import {
    Plus,
    Search,
    MoreHorizontal,
    Building2,
    Users,
    Edit,
    Trash2,
    Loader2,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    useDepartmentsWithStats,
    useCreateDepartment,
    useUpdateDepartment,
    useDeleteDepartment,
    useToggleDepartmentStatus,
    type DepartmentWithStats,
} from '@/hooks/useDepartments';
import { DepartmentForm, type DepartmentFormValues } from '@/components/departments/DepartmentForm';

const Departments: React.FC = () => {
    const { data: departments = [], isLoading } = useDepartmentsWithStats();
    const createDepartment = useCreateDepartment();
    const updateDepartment = useUpdateDepartment();
    const deleteDepartment = useDeleteDepartment();
    const toggleStatus = useToggleDepartmentStatus();

    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<DepartmentWithStats | null>(null);
    const [deletingDepartment, setDeletingDepartment] = useState<DepartmentWithStats | null>(null);

    // Filter departments
    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dept.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    const activeDepartments = filteredDepartments.filter(d => d.active);
    const inactiveDepartments = filteredDepartments.filter(d => !d.active);

    // Handle form open
    const handleOpenForm = (department?: DepartmentWithStats) => {
        setEditingDepartment(department || null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingDepartment(null);
    };

    // Handle form submit
    const handleSubmitForm = async (data: DepartmentFormValues) => {
        try {
            if (editingDepartment) {
                await updateDepartment.mutateAsync({
                    id: editingDepartment.id,
                    ...data,
                });
                toast.success('Departamento atualizado com sucesso');
            } else {
                await createDepartment.mutateAsync(data);
                toast.success('Departamento criado com sucesso');
            }
            handleCloseForm();
        } catch (error) {
            toast.error(editingDepartment ? 'Erro ao atualizar departamento' : 'Erro ao criar departamento');
        }
    };

    // Handle toggle status
    const handleToggleStatus = async (department: DepartmentWithStats) => {
        try {
            await toggleStatus.mutateAsync({
                id: department.id,
                active: !department.active,
            });
            toast.success(`Departamento ${department.active ? 'desativado' : 'ativado'} com sucesso`);
        } catch (error) {
            toast.error('Erro ao alterar status do departamento');
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deletingDepartment) return;

        try {
            await deleteDepartment.mutateAsync(deletingDepartment.id);
            toast.success('Departamento excluído com sucesso');
            setDeletingDepartment(null);
        } catch (error) {
            toast.error('Erro ao excluir departamento');
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="p-6 border-b border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">Departamentos</h1>
                        <p className="text-sm text-muted-foreground">
                            Gerencie os departamentos/secretarias da organização
                        </p>
                    </div>
                    <Button className="gap-2" onClick={() => handleOpenForm()}>
                        <Plus className="w-4 h-4" />
                        Novo Departamento
                    </Button>
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar departamentos..."
                        className="pl-10 bg-secondary border-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-6 border-b border-border bg-muted/30">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{departments.length}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <ToggleRight className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeDepartments.length}</p>
                                <p className="text-xs text-muted-foreground">Ativos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {departments.reduce((sum, d) => sum + (d.contacts_count || 0), 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Contatos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Department List */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredDepartments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Building2 className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum departamento encontrado</p>
                        <p className="text-sm">Crie seu primeiro departamento para começar</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Active Departments */}
                        {activeDepartments.length > 0 && (
                            <div>
                                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                                    ATIVOS ({activeDepartments.length})
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {activeDepartments.map((department) => (
                                        <Card key={department.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10">
                                                            <Building2 className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-foreground">{department.name}</h3>
                                                            <Badge variant="secondary" className="mt-1">
                                                                <Users className="w-3 h-3 mr-1" />
                                                                {department.contacts_count || 0} contatos
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleOpenForm(department)}>
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(department)}>
                                                                <ToggleLeft className="w-4 h-4 mr-2" />
                                                                Desativar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeletingDepartment(department)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Excluir
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                {department.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                                        {department.description}
                                                    </p>
                                                )}

                                                {department.agents_names && department.agents_names.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-border">
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            Equipe:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {department.agents_names.map((name, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-[10px] py-0 px-1 bg-muted/50">
                                                                    {name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inactive Departments */}
                        {inactiveDepartments.length > 0 && (
                            <div>
                                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                                    INATIVOS ({inactiveDepartments.length})
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {inactiveDepartments.map((department) => (
                                        <Card key={department.id} className="opacity-60 hover:opacity-100 transition-opacity">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-muted">
                                                            <Building2 className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-foreground">{department.name}</h3>
                                                            <Badge variant="outline" className="mt-1">
                                                                <Users className="w-3 h-3 mr-1" />
                                                                {department.contacts_count || 0} contatos
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(department)}>
                                                                <ToggleRight className="w-4 h-4 mr-2" />
                                                                Ativar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenForm(department)}>
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeletingDepartment(department)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Excluir
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                {department.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                                        {department.description}
                                                    </p>
                                                )}

                                                {department.agents_names && department.agents_names.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-border">
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            Equipe:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {department.agents_names.map((name, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-[10px] py-0 px-1 bg-muted/50">
                                                                    {name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Form Dialog */}
            <DepartmentForm
                open={isFormOpen}
                onOpenChange={handleCloseForm}
                onSubmit={handleSubmitForm}
                isLoading={createDepartment.isPending || updateDepartment.isPending}
                department={editingDepartment}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingDepartment} onOpenChange={() => setDeletingDepartment(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir departamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O departamento será permanentemente removido.
                            {deletingDepartment && deletingDepartment.contacts_count! > 0 && (
                                <span className="block mt-2 text-destructive font-medium">
                                    ⚠️ Este departamento possui {deletingDepartment.contacts_count} contato(s) vinculado(s).
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteDepartment.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Excluir'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Departments;
