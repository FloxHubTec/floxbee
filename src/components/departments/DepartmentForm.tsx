import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query'; // Import necessário para buscar usuários
import { supabase } from '@/integrations/supabase/client'; // Import do supabase
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Ticket, User } from 'lucide-react';

const departmentSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    description: z.string().optional(),
    active: z.boolean().default(true),
    auto_assign_to: z.string().nullable().optional(), // Novo campo no schema
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: DepartmentFormValues) => Promise<void>;
    isLoading?: boolean;
    department?: {
        id: string;
        name: string;
        description: string | null;
        active: boolean | null;
        auto_assign_to?: string | null; // Tipagem atualizada
    } | null;
}

export const DepartmentForm: React.FC<DepartmentFormProps> = ({
    open,
    onOpenChange,
    onSubmit,
    isLoading,
    department,
}) => {
    const isEditing = !!department;

    const form = useForm<DepartmentFormValues>({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            name: department?.name || '',
            description: department?.description || '',
            active: department?.active ?? true,
            auto_assign_to: department?.auto_assign_to || 'none', // 'none' para tratar o null no Select
        },
    });

    // Reset form when department changes
    React.useEffect(() => {
        if (open) {
            form.reset({
                name: department?.name || '',
                description: department?.description || '',
                active: department?.active ?? true,
                auto_assign_to: department?.auto_assign_to || 'none',
            });
        }
    }, [department, open, form]);

    // Buscar lista de Agentes/Admins para o Select
    const { data: agents = [] } = useQuery({
        queryKey: ['profiles-agents'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nome, email')
                .in('role', ['agente', 'supervisor', 'admin', 'superadmin']) // Filtra quem pode receber tickets
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;
            return data;
        },
        enabled: open // Só busca quando o modal abre
    });

    const handleSubmit = (data: DepartmentFormValues) => {
        // Converte 'none' de volta para null antes de enviar
        const finalData = {
            ...data,
            auto_assign_to: data.auto_assign_to === 'none' ? null : data.auto_assign_to
        };
        onSubmit(finalData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                        {/* Seção Principal */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Departamento</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Suporte Técnico" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descreva a função deste departamento..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Seção de Automação de Tickets */}
                        <div className="border rounded-lg p-4 bg-secondary/10 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Ticket className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-semibold text-foreground">Automação de Tickets</h3>
                            </div>

                            <FormField
                                control={form.control}
                                name="auto_assign_to"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Ao criar ticket, atribuir para:</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value || 'none'}
                                            value={field.value || 'none'}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um responsável" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    <span className="text-muted-foreground italic">-- Não atribuir (Manual) --</span>
                                                </SelectItem>
                                                {agents.map((agent) => (
                                                    <SelectItem key={agent.id} value={agent.id}>
                                                        {agent.nome}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription className="text-[11px]">
                                            Novos tickets abertos para este departamento serão automaticamente atribuídos a este usuário.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Switch Ativo */}
                        <FormField
                            control={form.control}
                            name="active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Departamento Ativo</FormLabel>
                                        <FormDescription>
                                            Departamentos inativos não aparecem nas opções de filtro
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {isEditing ? 'Salvar Alterações' : 'Criar Departamento'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};