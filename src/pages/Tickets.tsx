import React, { useState, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult
} from '@hello-pangea/dnd';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Clock,
  User,
  Bot,
  CheckCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  AlertTriangle,
  Loader2,
  Trash2,
  GripVertical,
  Edit,
  AlertCircle,
  ArrowUpDown,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useTickets,
  useCreateTicket,
  useUpdateTicket,
  useUpdateTicketStatus,
  useDeleteTicket,
  useAgentes,
  useContacts,
  type TicketWithRelations
} from '@/hooks/useTickets';
import { useActiveDepartments } from '@/hooks/useDepartments';
import { TicketForm, type TicketFormValues } from '@/components/tickets/TicketForm';
import { TicketFilterPopover, type TicketFilters } from '@/components/tickets/TicketFilterPopover';
import { toast } from 'sonner';

const columns = [
  { id: 'aberto_ia', title: 'Aberto (IA)', icon: Bot, color: 'bg-primary' },
  { id: 'em_analise', title: 'Em Análise', icon: User, color: 'bg-accent' },
  { id: 'pendente', title: 'Pendente', icon: Clock, color: 'bg-status-away' },
  { id: 'concluido', title: 'Concluído', icon: CheckCircle, color: 'bg-status-online' },
];

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'urgente':
      return { label: 'Urgente', icon: AlertTriangle, color: 'text-destructive bg-destructive/10' };
    case 'alta':
      return { label: 'Alta', icon: ArrowUp, color: 'text-priority-high bg-priority-high/10' };
    case 'media':
      return { label: 'Média', icon: ArrowRight, color: 'text-priority-medium bg-priority-medium/10' };
    case 'baixa':
      return { label: 'Baixa', icon: ArrowDown, color: 'text-priority-low bg-priority-low/10' };
    default:
      return { label: 'Média', icon: ArrowRight, color: 'text-priority-medium bg-priority-medium/10' };
  }
};

interface TicketCardProps {
  ticket: TicketWithRelations;
  index: number;
  onEdit: (ticket: TicketWithRelations) => void;
  onStatusChange: (ticketId: string, status: string) => void;
  onAssign: (ticketId: string, userId: string) => void;
  onDelete: (ticketId: string) => void;
  agentes: Array<{ id: string; nome: string }>;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  index,
  onEdit,
  onStatusChange,
  onAssign,
  onDelete,
  agentes
}) => {
  const priorityConfig = getPriorityConfig(ticket.prioridade);
  const PriorityIcon = priorityConfig.icon;

  const isOverdue = ticket.sla_deadline && isPast(new Date(ticket.sla_deadline)) && ticket.status !== 'concluido';
  const slaText = ticket.sla_deadline
    ? formatDistanceToNow(new Date(ticket.sla_deadline), { locale: ptBR, addSuffix: true })
    : null;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Agora';
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffHours < 48) return 'Ontem';
    return format(d, 'dd/MM', { locale: ptBR });
  };

  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "bg-card rounded-lg border border-border p-4 shadow-sm transition-all cursor-grab group",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/50 rotate-2",
            isOverdue && "border-destructive/50 bg-destructive/5"
          )}
          onClick={() => onEdit(ticket)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                {...provided.dragHandleProps}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">#{ticket.numero}</span>
              {isOverdue && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>SLA expirado {slaText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(ticket); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, 'aberto_ia'); }}>
                  <Bot className="w-4 h-4 mr-2" />
                  Mover para Aberto (IA)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, 'em_analise'); }}>
                  <User className="w-4 h-4 mr-2" />
                  Mover para Análise
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, 'pendente'); }}>
                  <Clock className="w-4 h-4 mr-2" />
                  Mover para Pendente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, 'concluido'); }}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar como Concluído
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {agentes.map((agente) => (
                  <DropdownMenuItem key={agente.id} onClick={(e) => { e.stopPropagation(); onAssign(ticket.id, agente.id); }}>
                    Atribuir a {agente.nome}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h4 className="font-medium text-foreground mb-2 line-clamp-2">{ticket.titulo}</h4>
          {ticket.descricao && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{ticket.descricao}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ticket.contact && (
                <>
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {ticket.contact.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {ticket.contact.nome}
                  </span>
                </>
              )}
            </div>

            <Badge className={cn("text-xs gap-1", priorityConfig.color)}>
              <PriorityIcon className="w-3 h-3" />
              {priorityConfig.label}
            </Badge>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</span>
              {slaText && !isOverdue && ticket.status !== 'concluido' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {slaText}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const Tickets: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketWithRelations | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  // Estado de filtros
  const [filters, setFilters] = useState<TicketFilters & { departamento: string }>({
    prioridade: 'all',
    agente: 'all',
    sla: 'all',
    departamento: 'all',
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      prioridade: 'all',
      agente: 'all',
      sla: 'all',
      departamento: 'all',
    });
  };

  const hasActiveFilters = searchQuery !== '' ||
    filters.prioridade !== 'all' ||
    filters.agente !== 'all' ||
    filters.sla !== 'all' ||
    filters.departamento !== 'all';

  // Buscar departamentos ativos
  const { data: departamentos = [] } = useActiveDepartments ? useActiveDepartments() : { data: [] };

  // Estado de ordenação por coluna
  const [columnSort, setColumnSort] = useState<Record<string, 'priority' | 'sla' | 'date' | 'name'>>({});

  const { data: tickets = [], isLoading } = useTickets();
  const { data: agentes = [] } = useAgentes();
  const { data: contacts = [] } = useContacts();
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteTicket();

  // Função para determinar status SLA
  const getSLAStatus = (ticket: TicketWithRelations): 'ok' | 'warning' | 'expired' => {
    if (!ticket.sla_deadline || ticket.status === 'concluido') return 'ok';

    const now = new Date();
    const deadline = new Date(ticket.sla_deadline);
    const hoursRemaining = differenceInHours(deadline, now);

    if (hoursRemaining < 0) return 'expired';
    if (hoursRemaining < 2) return 'warning';
    return 'ok';
  };


  // Filtragem e ordenação de tickets
  const getTicketsByStatus = useMemo(() => {
    return (status: string) => {
      let filtered = tickets.filter(ticket => {
        // Filtro de status (coluna)
        if (ticket.status !== status) return false;

        // Filtro de busca
        if (searchQuery) {
          const matchesSearch =
            ticket.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.contact?.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(ticket.numero).includes(searchQuery);
          if (!matchesSearch) return false;
        }

        // Filtro de prioridade
        if (filters.prioridade !== 'all' && ticket.prioridade !== filters.prioridade) {
          return false;
        }

        // Filtro de agente
        if (filters.agente !== 'all') {
          if (filters.agente === 'unassigned' && ticket.assigned_to) return false;
          if (filters.agente !== 'unassigned' && ticket.assigned_to !== filters.agente) return false;
        }

        // Filtro de SLA
        if (filters.sla !== 'all') {
          const slaStatus = getSLAStatus(ticket);
          if (slaStatus !== filters.sla) return false;
        }

        // Filtro de departamento
        if (filters.departamento !== 'all') {
          if ((ticket as any).department_id !== filters.departamento) return false;
        }

        return true;
      });

      // Ordenação
      const sortType = columnSort[status] || 'date';

      filtered.sort((a, b) => {
        switch (sortType) {
          case 'priority':
            const priorityOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
            return priorityOrder[a.prioridade] - priorityOrder[b.prioridade];

          case 'sla':
            if (!a.sla_deadline) return 1;
            if (!b.sla_deadline) return -1;
            return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();

          case 'name':
            return a.titulo.localeCompare(b.titulo);

          case 'date':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });

      return filtered;
    };
  }, [tickets, searchQuery, filters, columnSort]);


  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as "aberto_ia" | "em_analise" | "pendente" | "concluido";

    try {
      await updateStatus.mutateAsync({
        ticketId: draggableId,
        status: newStatus
      });
      toast.success(`Ticket movido para ${columns.find(c => c.id === newStatus)?.title}`);
    } catch (error) {
      toast.error('Erro ao mover ticket');
    }
  };

  const handleOpenForm = (ticket?: TicketWithRelations) => {
    setEditingTicket(ticket || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTicket(null);
  };

  const handleSubmitForm = async (data: any) => { // Recebe 'any' pois já vem formatado do TicketForm
    try {
      if (editingTicket) {
        await updateTicket.mutateAsync({
          ticketId: editingTicket.id,
          data
        });
      } else {
        await createTicket.mutateAsync(data);
      }
      handleCloseForm();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({
        ticketId,
        status: status as "aberto_ia" | "em_analise" | "pendente" | "concluido"
      });
      toast.success('Status atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAssign = async (ticketId: string, userId: string) => {
    try {
      await updateStatus.mutateAsync({
        ticketId,
        status: 'em_analise',
        assignedTo: userId
      });
      toast.success('Ticket atribuído');
    } catch (error) {
      toast.error('Erro ao atribuir ticket');
    }
  };

  const handleDelete = async () => {
    if (!ticketToDelete) return;

    try {
      await deleteTicket.mutateAsync(ticketToDelete);
      toast.success('Ticket excluído');
      setTicketToDelete(null);
    } catch (error) {
      toast.error('Erro ao excluir ticket');
    }
  };

  // Stats
  const totalTickets = tickets.length;
  const overdueTickets = tickets.filter(t => t.sla_deadline && isPast(new Date(t.sla_deadline)) && t.status !== 'concluido').length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tickets</h1>
            <p className="text-sm text-muted-foreground">
              {totalTickets} tickets · {overdueTickets > 0 && (
                <span className="text-destructive">{overdueTickets} com SLA expirado</span>
              )}
              {overdueTickets === 0 && 'Arraste os cards para mover entre colunas'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TicketFilterPopover
              filters={filters}
              onFiltersChange={setFilters}
              agentes={agentes.map(a => ({ id: a.id, nome: a.nome }))}
            />
            <div className="min-w-[180px]">
              <select
                className="border rounded px-2 py-1 text-sm bg-secondary"
                value={filters.departamento}
                onChange={e => setFilters({ ...filters, departamento: e.target.value })}
              >
                <option value="all">Todos departamentos</option>
                {departamentos.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <Button className="gap-2" onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4" />
              Novo Ticket
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tickets..."
              className="pl-10 bg-secondary border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground h-9"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board with Drag & Drop */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full min-w-max">
              {columns.map((column) => {
                const columnTickets = getTicketsByStatus(column.id);
                const ColumnIcon = column.icon;

                return (
                  <div key={column.id} className="flex flex-col w-[320px] min-w-[320px]">
                    {/* Column Header */}
                    <div className="flex items-center gap-2 mb-4 px-2">
                      <div className={cn("w-2 h-2 rounded-full", column.color)} />
                      <ColumnIcon className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-medium text-foreground">{column.title}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {columnTickets.length}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setColumnSort({ ...columnSort, [column.id]: 'priority' })}>
                            Ordenar por Prioridade
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setColumnSort({ ...columnSort, [column.id]: 'sla' })}>
                            Ordenar por SLA
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setColumnSort({ ...columnSort, [column.id]: 'name' })}>
                            Ordenar por Nome
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setColumnSort({ ...columnSort, [column.id]: 'date' })}>
                            Ordenar por Data
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Droppable Column */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "flex-1 overflow-y-auto space-y-3 pb-4 rounded-lg transition-colors min-h-[200px] p-2",
                            snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20 ring-dashed"
                          )}
                        >
                          {columnTickets.map((ticket, index) => (
                            <TicketCard
                              key={ticket.id}
                              ticket={ticket}
                              index={index}
                              onEdit={handleOpenForm}
                              onStatusChange={handleStatusChange}
                              onAssign={handleAssign}
                              onDelete={(id) => setTicketToDelete(id)}
                              agentes={agentes.map(a => ({ id: a.id, nome: a.nome }))}
                            />
                          ))}
                          {provided.placeholder}

                          {columnTickets.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg">
                              <p className="text-sm text-muted-foreground">Arraste tickets aqui</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Form Dialog */}
      <TicketForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleSubmitForm}
        isLoading={createTicket.isPending || updateTicket.isPending}
        ticket={editingTicket}
        contacts={contacts}
        agentes={agentes.map(a => ({ id: a.id, nome: a.nome }))}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ticket será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTicket.isPending ? (
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

export default Tickets;
