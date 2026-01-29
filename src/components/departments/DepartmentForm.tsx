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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Ticket, Users, Building2 } from 'lucide-react';

const departmentSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    description: z.string().optional(),
    active: z.boolean().default(true),
    auto_assign_to: z.string().nullable().optional(),
    agents_ids: z.array(z.string()).default([]),
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
        auto_assign_to?: string | null;
        agents_ids?: string[];
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
                agents_ids: department?.agents_ids || [],
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
                .in('role', ['agente', 'supervisor']) // Apenas perfis operacionais conforme solicitado
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
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col max-h-[80vh]">
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-6 pb-4">
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

                                {/* Seção de Equipe do Departamento */}
                                <div className="border rounded-lg p-4 bg-secondary/10 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        <h3 className="text-sm font-semibold text-foreground">Equipe do Departamento</h3>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="agents_ids"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Selecione os atendentes vinculados:</FormLabel>
                                                <div className="grid gap-2 mt-2">
                                                    <div className="h-[150px] overflow-y-auto rounded-md border p-2 bg-background scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                                        {agents.length === 0 ? (
                                                            <p className="text-xs text-muted-foreground text-center py-4 italic">Nenhum agente operacional encontrado</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {agents.map((agent) => (
                                                                    <FormField
                                                                        key={agent.id}
                                                                        control={form.control}
                                                                        name="agents_ids"
                                                                        render={({ field }) => {
                                                                            return (
                                                                                <FormItem
                                                                                    key={agent.id}
                                                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                                                >
                                                                                    <FormControl>
                                                                                        <Checkbox
                                                                                            checked={field.value?.includes(agent.id)}
                                                                                            onCheckedChange={(checked) => {
                                                                                                return checked
                                                                                                    ? field.onChange([...field.value, agent.id])
                                                                                                    : field.onChange(
                                                                                                        field.value?.filter(
                                                                                                            (value) => value !== agent.id
                                                                                                        )
                                                                                                    )
                                                                                            }}
                                                                                        />
                                                                                    </FormControl>
                                                                                    <FormLabel className="font-normal text-xs cursor-pointer">
                                                                                        {agent.nome}
                                                                                    </FormLabel>
                                                                                </FormItem>
                                                                            )
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <FormDescription className="text-[11px]">
                                                    Apenas Agentes e Supervisores podem ser vinculados à equipe.
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Seção de Automação de Tickets */}
                                <div className="border rounded-lg p-4 bg-secondary/10 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Ticket className="w-4 h-4 text-primary" />
                                        <h3 className="text-sm font-semibold text-foreground">Distribuição Automática</h3>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="auto_assign_to"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Responsável padrão (Opcional):</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value || 'none'}
                                                    value={field.value || 'none'}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Selecione um responsável" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none" className="text-xs">
                                                            <span className="text-muted-foreground italic">-- Sem responsável fixo --</span>
                                                        </SelectItem>
                                                        {agents.map((agent) => (
                                                            <SelectItem key={agent.id} value={agent.id} className="text-xs">
                                                                {agent.nome}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription className="text-[11px]">
                                                    Se definido, novos tickets serão atribuídos automaticamente a este atendente específico.
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
                                                <FormLabel className="text-sm">Departamento Ativo</FormLabel>
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
                            </div>
                        </ScrollArea>

                        <div className="flex justify-end gap-3 pt-4 border-t mt-2">
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