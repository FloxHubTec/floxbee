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
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConversationFilters {
    status: 'all' | 'ativo' | 'pendente' | 'concluido';
    assignment: 'all' | 'mine' | 'unassigned';
    botStatus: 'all' | 'active' | 'inactive';
}

interface FilterPopoverProps {
    filters: ConversationFilters;
    onFiltersChange: (filters: ConversationFilters) => void;
    currentUserId?: string;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
    filters,
    onFiltersChange,
    currentUserId,
}) => {
    const hasActiveFilters =
        filters.status !== 'all' ||
        filters.assignment !== 'all' ||
        filters.botStatus !== 'all';

    const handleFilterChange = (key: keyof ConversationFilters, value: string) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        });
    };

    const clearFilters = () => {
        onFiltersChange({
            status: 'all',
            assignment: 'all',
            botStatus: 'all',
        });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Filter className="w-5 h-5" />
                    {hasActiveFilters && (
                        <Badge
                            variant="default"
                            className="absolute -top-1 -right-1 w-2 h-2 p-0 flex items-center justify-center rounded-full"
                        >
                            <span className="sr-only">Filtros ativos</span>
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

                    {/* Filtro de Status */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <RadioGroup
                            value={filters.status}
                            onValueChange={(value) => handleFilterChange('status', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="status-all" />
                                <Label htmlFor="status-all" className="font-normal cursor-pointer">
                                    Todas
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ativo" id="status-ativo" />
                                <Label htmlFor="status-ativo" className="font-normal cursor-pointer">
                                    Ativas
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pendente" id="status-pendente" />
                                <Label htmlFor="status-pendente" className="font-normal cursor-pointer">
                                    Pendentes
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="concluido" id="status-concluido" />
                                <Label htmlFor="status-concluido" className="font-normal cursor-pointer">
                                    Concluídas
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Filtro de Atribuição */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Atribuição</Label>
                        <RadioGroup
                            value={filters.assignment}
                            onValueChange={(value) => handleFilterChange('assignment', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="assignment-all" />
                                <Label htmlFor="assignment-all" className="font-normal cursor-pointer">
                                    Todas
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="mine" id="assignment-mine" />
                                <Label htmlFor="assignment-mine" className="font-normal cursor-pointer">
                                    Minhas Conversas
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="unassigned" id="assignment-unassigned" />
                                <Label htmlFor="assignment-unassigned" className="font-normal cursor-pointer">
                                    Não Atribuídas
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Filtro de IA */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Inteligência Artificial</Label>
                        <RadioGroup
                            value={filters.botStatus}
                            onValueChange={(value) => handleFilterChange('botStatus', value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="bot-all" />
                                <Label htmlFor="bot-all" className="font-normal cursor-pointer">
                                    Todas
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="active" id="bot-active" />
                                <Label htmlFor="bot-active" className="font-normal cursor-pointer">
                                    IA Ativa
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="inactive" id="bot-inactive" />
                                <Label htmlFor="bot-inactive" className="font-normal cursor-pointer">
                                    IA Inativa
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Resumo dos filtros ativos */}
                    {hasActiveFilters && (
                        <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Filtros ativos:</p>
                            <div className="flex flex-wrap gap-1">
                                {filters.status !== 'all' && (
                                    <Badge variant="secondary" className="text-xs">
                                        Status: {filters.status === 'ativo' ? 'Ativas' : filters.status === 'pendente' ? 'Pendentes' : 'Concluídas'}
                                    </Badge>
                                )}
                                {filters.assignment !== 'all' && (
                                    <Badge variant="secondary" className="text-xs">
                                        {filters.assignment === 'mine' ? 'Minhas' : 'Não atribuídas'}
                                    </Badge>
                                )}
                                {filters.botStatus !== 'all' && (
                                    <Badge variant="secondary" className="text-xs">
                                        IA {filters.botStatus === 'active' ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
