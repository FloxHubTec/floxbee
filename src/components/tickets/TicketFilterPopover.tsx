import React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TicketFilters {
    prioridade: 'all' | 'urgente' | 'alta' | 'media' | 'baixa';
    categoria: string; // 'all' ou nome da categoria
    agente: string; // 'all', 'unassigned', ou ID do agente
    sla: 'all' | 'ok' | 'warning' | 'expired';
}

interface TicketFilterPopoverProps {
    filters: TicketFilters;
    onFiltersChange: (filters: TicketFilters) => void;
    agentes?: Array<{ id: string; nome: string }>;
    categorias?: string[];
}

export const TicketFilterPopover: React.FC<TicketFilterPopoverProps> = ({
    filters,
    onFiltersChange,
    agentes = [],
    categorias = [],
}) => {
    const hasActiveFilters =
        filters.prioridade !== 'all' ||
        filters.categoria !== 'all' ||
        filters.agente !== 'all' ||
        filters.sla !== 'all';

    const handleFilterChange = (key: keyof TicketFilters, value: string) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        });
    };

    const clearFilters = () => {
        onFiltersChange({
            prioridade: 'all',
            categoria: 'all',
            agente: 'all',
            sla: 'all',
        });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="default" className="relative gap-2">
                    <Filter className="w-4 h-4" />
                    Filtrar
                    {hasActiveFilters && (
                        <Badge
                            variant="default"
                            className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                        >
                            <span className="sr-only">Filtros ativos</span>
                            •
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Filtros</h4>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-auto p-1 text-xs"
                            >
                                <X className="w-3 h-3 mr-1" />
                                Limpar
                            </Button>
                        )}
                    </div>

                    <Separator />

                    {/* Filtro de Prioridade */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Prioridade</Label>
                        <RadioGroup
                            value={filters.prioridade}
                            onValueChange={(value) => handleFilterChange('prioridade', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="prioridade-all" />
                                <Label htmlFor="prioridade-all" className="font-normal cursor-pointer">
                                    Todas
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="urgente" id="prioridade-urgente" />
                                <Label htmlFor="prioridade-urgente" className="font-normal cursor-pointer">
                                    🔴 Urgente
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="alta" id="prioridade-alta" />
                                <Label htmlFor="prioridade-alta" className="font-normal cursor-pointer">
                                    🟠 Alta
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="media" id="prioridade-media" />
                                <Label htmlFor="prioridade-media" className="font-normal cursor-pointer">
                                    🟡 Média
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="baixa" id="prioridade-baixa" />
                                <Label htmlFor="prioridade-baixa" className="font-normal cursor-pointer">
                                    🟢 Baixa
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Separator />

                    {/* Filtro de Agente */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Agente</Label>
                        <RadioGroup
                            value={filters.agente}
                            onValueChange={(value) => handleFilterChange('agente', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="agente-all" />
                                <Label htmlFor="agente-all" className="font-normal cursor-pointer">
                                    Todos
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="unassigned" id="agente-unassigned" />
                                <Label htmlFor="agente-unassigned" className="font-normal cursor-pointer">
                                    Não Atribuídos
                                </Label>
                            </div>
                            {agentes.map((agente) => (
                                <div key={agente.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={agente.id} id={`agente-${agente.id}`} />
                                    <Label htmlFor={`agente-${agente.id}`} className="font-normal cursor-pointer">
                                        {agente.nome}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <Separator />

                    {/* Filtro de SLA */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Status SLA</Label>
                        <RadioGroup
                            value={filters.sla}
                            onValueChange={(value) => handleFilterChange('sla', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="sla-all" />
                                <Label htmlFor="sla-all" className="font-normal cursor-pointer">
                                    Todos
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ok" id="sla-ok" />
                                <Label htmlFor="sla-ok" className="font-normal cursor-pointer">
                                    ✅ No Prazo
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="warning" id="sla-warning" />
                                <Label htmlFor="sla-warning" className="font-normal cursor-pointer">
                                    ⚠️ Próximo do Vencimento (\u003c2h)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="expired" id="sla-expired" />
                                <Label htmlFor="sla-expired" className="font-normal cursor-pointer">
                                    ❌ Expirado
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Filtro de Categoria */}
                    {categorias.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Categoria</Label>
                                <RadioGroup
                                    value={filters.categoria}
                                    onValueChange={(value) => handleFilterChange('categoria', value)}
                                    className="max-h-40 overflow-y-auto"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="all" id="categoria-all" />
                                        <Label htmlFor="categoria-all" className="font-normal cursor-pointer">
                                            Todas
                                        </Label>
                                    </div>
                                    {categorias.map((cat) => (
                                        <div key={cat} className="flex items-center space-x-2">
                                            <RadioGroupItem value={cat} id={`categoria-${cat}`} />
                                            <Label htmlFor={`categoria-${cat}`} className="font-normal cursor-pointer">
                                                {cat}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        </>
                    )}

                    {/* Resumo dos filtros ativos */}
                    {hasActiveFilters && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Filtros ativos:</p>
                                <div className="flex flex-wrap gap-1">
                                    {filters.prioridade !== 'all' && (
                                        <Badge variant="secondary" className="text-xs capitalize">
                                            {filters.prioridade}
                                        </Badge>
                                    )}
                                    {filters.agente !== 'all' && (
                                        <Badge variant="secondary" className="text-xs">
                                            {filters.agente === 'unassigned'
                                                ? 'Não Atribuído'
                                                : agentes.find((a) => a.id === filters.agente)?.nome || 'Agente'}
                                        </Badge>
                                    )}
                                    {filters.categoria !== 'all' && (
                                        <Badge variant="secondary" className="text-xs">
                                            {filters.categoria}
                                        </Badge>
                                    )}
                                    {filters.sla !== 'all' && (
                                        <Badge variant="secondary" className="text-xs">
                                            SLA: {filters.sla === 'ok' ? 'OK' : filters.sla === 'warning' ? 'Aviso' : 'Expirado'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
