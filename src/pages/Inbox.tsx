import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Paperclip,
  Send,
  Bot,
  User,
  CheckCheck,
  ArrowRightLeft,
  CheckCircle,
  MessageSquare,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  FileSpreadsheet,
  UserCircle,
  Power,
  Trash2,
  ArrowLeft,
  RotateCcw,
  Tag,
  Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TemplateQuickSelect from '@/components/inbox/TemplateQuickSelect';
import { TransferDialog } from '@/components/inbox/TransferDialog';
import { FilterPopover, type ConversationFilters } from '@/components/inbox/FilterPopover';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useSendAIMessage,
  useResolveConversation,
  useReopenConversation,
  useTransferConversation,
  useToggleBotStatus,
  useMarkAsRead,
  useDeleteConversation,
  useTransferToQueue,
  type ConversationWithContact
} from '@/hooks/useConversations';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useFileUpload, type UploadedFile } from '@/hooks/useFileUpload';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';

const Inbox: React.FC = () => {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();

  // Estado tipado corretamente com a interface exportada do hook
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingFile, setPendingFile] = useState<UploadedFile | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estado de filtros
  const [filters, setFilters] = useState<ConversationFilters>({
    status: 'all',
    assignment: 'all',
    botStatus: 'all',
    tag: 'all',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks do TanStack Query
  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: messages = [], isLoading: loadingMessages } = useMessages(selectedConversation?.id || null);

  const sendMessage = useSendMessage();
  const sendAIMessage = useSendAIMessage();
  const resolveConversation = useResolveConversation();
  const reopenConversation = useReopenConversation();
  const transferConversation = useTransferConversation();
  const toggleBotStatus = useToggleBotStatus();
  const markAsRead = useMarkAsRead();
  const deleteConversation = useDeleteConversation();
  const transferToQueue = useTransferToQueue();
  const { updateContactTags } = useContacts();
  const { uploadFile, isUploading, getFileType, allowedTypes } = useFileUpload();

  const [newTag, setNewTag] = useState('');

  // Extrair todas as tags únicas das conversas carregadas
  const availableTags = useMemo(() => {
    const allTags = conversations.flatMap(conv => conv.contact?.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [conversations]);

  // Filtragem e busca COMBINADAS
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // 1. Filtro de busca por nome ou whatsapp
    if (searchQuery) {
      result = result.filter(conv =>
        conv.contact?.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.contact?.whatsapp?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 2. Filtro de Status
    if (filters.status !== 'all') {
      result = result.filter(conv => conv.status === filters.status);
    }

    // 3. Filtro de Atribuição
    if (filters.assignment === 'mine') {
      result = result.filter(conv => conv.assigned_to === profile?.id);
    } else if (filters.assignment === 'unassigned') {
      result = result.filter(conv => !conv.assigned_to);
    }

    // 4. Filtro de Bot
    if (filters.botStatus === 'active') {
      result = result.filter(conv => (conv as any).is_bot_active === true);
    } else if (filters.botStatus === 'inactive') {
      result = result.filter(conv => (conv as any).is_bot_active === false || !(conv as any).is_bot_active);
    }

    // 5. Filtro de Tag
    if (filters.tag !== 'all') {
      result = result.filter(conv => conv.contact?.tags?.includes(filters.tag));
    }

    return result;
  }, [conversations, searchQuery, filters, profile?.id]);


  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marcar como lido ao abrir
  useEffect(() => {
    if (selectedConversation && (selectedConversation.unread_count || 0) > 0) {
      markAsRead.mutate(selectedConversation.id);
    }
  }, [selectedConversation?.id, markAsRead, selectedConversation?.unread_count]);

  const formatTimestamp = (date: string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return format(d, 'HH:mm', { locale: ptBR });
    }
    return format(d, 'dd/MM', { locale: ptBR });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploaded = await uploadFile(file);
    if (uploaded) {
      setPendingFile(uploaded);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !pendingFile) || !selectedConversation) return;

    const content = messageInput.trim() || (pendingFile ? `📎 ${pendingFile.name}` : '');
    setMessageInput('');
    const fileToSend = pendingFile;
    setPendingFile(null);

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversation.id,
        content,
        senderType: 'user', // 'user' representa o agente no nosso hook
        senderId: user?.id,
        attachmentUrl: fileToSend?.url,
        attachmentType: fileToSend?.type,
        attachmentName: fileToSend?.name,
      });
    } catch (error) {
      // Erro já tratado no hook com toast
    }
  };

  const handleResolve = async () => {
    if (!selectedConversation) return;
    await resolveConversation.mutateAsync(selectedConversation.id);
    // Não fecha a conversa, apenas atualiza o status
  };

  const handleReopen = async () => {
    if (!selectedConversation) return;
    await reopenConversation.mutateAsync(selectedConversation.id);
  };

  const handleTransfer = async (userId: string | null) => {
    if (!selectedConversation) return;
    await transferConversation.mutateAsync({
      conversationId: selectedConversation.id,
      assignTo: userId,
    });
    setShowTransferDialog(false);
  };

  const handleTransferToIA = async () => {
    if (!selectedConversation) return;
    await transferToQueue.mutateAsync(selectedConversation.id);
  };

  const handleAddTag = async () => {
    if (!selectedConversation?.contact || !newTag.trim()) return;
    const currentTags = selectedConversation.contact.tags || [];
    if (currentTags.includes(newTag.trim())) {
      toast.error('Esta tag já existe');
      return;
    }
    const updatedTags = [...currentTags, newTag.trim()];
    await updateContactTags.mutateAsync({
      id: selectedConversation.contact.id,
      tags: updatedTags
    });
    setNewTag('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedConversation?.contact) return;
    const currentTags = selectedConversation.contact.tags || [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    await updateContactTags.mutateAsync({
      id: selectedConversation.contact.id,
      tags: updatedTags
    });
  };

  const handleToggleBot = async () => {
    if (!selectedConversation) return;
    const currentBotState = (selectedConversation as any).is_bot_active || false;
    await toggleBotStatus.mutateAsync({
      conversationId: selectedConversation.id,
      isActive: !currentBotState,
    });
    // Atualiza estado local para feedback imediato
    setSelectedConversation({
      ...selectedConversation,
      // @ts-ignore
      is_bot_active: !currentBotState,
    });
  };


  const handleGenerateSummary = async () => {
    if (!selectedConversation || messages.length === 0) return;

    setSummaryLoading(true);
    setShowSummary(true);

    try {
      const recentMessages = messages.slice(-30);
      const messageHistory = recentMessages.map(m => {
        // Ajuste no mapeamento de sender_type
        const sender = m.sender_type === 'contact' ? 'Cidadão' :
          m.sender_type === 'ia' ? 'IA' : 'Agente';
        return `${sender}: ${m.content}`;
      }).join('\n');

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Faça um resumo conciso desta conversa de atendimento. Destaque os pontos principais, solicitações do cidadão e status atual:\n\n${messageHistory}`
            }
          ],
        },
      });

      if (error) throw error;
      setConversationSummary(data.message || 'Não foi possível gerar o resumo.');
    } catch (error) {
      setConversationSummary('Erro ao gerar resumo da conversa.');
      toast.error('Erro ao gerar resumo');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;
    try {
      await deleteConversation.mutateAsync(selectedConversation.id);
      setSelectedConversation(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('audio/')) return Music;
    if (type.startsWith('video/')) return Video;
    return FileText;
  };

  const renderAttachment = (metadata: any) => {
    if (!metadata || !metadata.attachment_url) return null;

    const { attachment_url, attachment_type, attachment_name } = metadata;
    const fileType = getFileType(attachment_type || '');

    if (fileType === 'image') {
      return (
        <a href={attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img
            src={attachment_url}
            alt={attachment_name || 'Imagem'}
            className="max-w-full md:max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    if (fileType === 'audio') {
      return (
        <audio controls className="mt-2 w-full max-w-[240px] md:max-w-xs">
          <source src={attachment_url} type={attachment_type} />
        </audio>
      );
    }

    if (fileType === 'video') {
      return (
        <video controls className="mt-2 w-full max-w-xs rounded-lg">
          <source src={attachment_url} type={attachment_type} />
        </video>
      );
    }

    const FileIcon = getFileIcon(attachment_type || '');
    return (
      <a
        href={attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 p-2 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
      >
        <FileIcon className="w-5 h-5 text-primary shrink-0" />
        <span className="text-sm truncate">{attachment_name || 'Documento'}</span>
      </a>
    );
  };

  const getSenderInfo = (message: MessageWithSender) => {
    switch (message.sender_type) {
      case 'ia':
        return { icon: Bot, label: 'FloxBee IA', color: 'bg-indigo-600', textColor: 'text-white' };
      case 'user': // Agente
      case 'agente':
        const name = message.sender_profile?.nome || 'Atendente';
        return { icon: User, label: name, color: 'bg-primary', textColor: 'text-primary-foreground' };
      default:
        return null;
    }
  };

  const getStatusBadge = (conv: ConversationWithContact) => {
    const badges = [];

    // Badge de status
    if (conv.status === 'concluido') {
      badges.push(
        <Badge key="status" variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          Concluído
        </Badge>
      );
    } else if (conv.status === 'pendente') {
      badges.push(
        <Badge key="status" variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400">
          Pendente
        </Badge>
      );
    }

    // Badge de IA ativa
    if ((conv as any).is_bot_active) {
      badges.push(
        <Badge key="bot" variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
          <Bot className="w-3 h-3 mr-1" />
          IA Ativa
        </Badge>
      );
    }

    // Badge de agente atribuído
    if (conv.assigned_to) {
      const agentName = (conv as any).assigned_profile?.nome || 'Agente';
      badges.push(
        <Badge key="assigned" variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
          <User className="w-3 h-3 mr-1" />
          {agentName}
        </Badge>
      );
    } else {
      // Badge de não atribuído
      badges.push(
        <Badge key="unassigned" variant="outline" className="text-xs border-dashed">
          Não atribuído
        </Badge>
      );
    }

    return badges;
  };


  return (
    <div className="flex flex-1 overflow-hidden relative h-[calc(100vh-theme(spacing.16))] md:h-full">
      {/* Lista de Conversas */}
      <div className={cn(
        "w-full md:w-[380px] flex flex-col border-r border-border bg-card transition-all",
        isMobile && selectedConversation ? "hidden" : "flex"
      )}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Inbox</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {filteredConversations.length} conversas
                </Badge>
                {filteredConversations.filter(c => (c.unread_count || 0) > 0).length > 0 && (
                  <Badge variant="default" className="text-xs">
                    {filteredConversations.filter(c => (c.unread_count || 0) > 0).length} não lidas
                  </Badge>
                )}
                {filteredConversations.filter(c => (c as any).is_bot_active).length > 0 && (
                  <Badge className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-xs">
                    {filteredConversations.filter(c => (c as any).is_bot_active).length} com IA
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <FilterPopover
                filters={filters}
                onFiltersChange={setFilters}
                currentUserId={profile?.id}
                availableTags={availableTags}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilters({ status: 'all', assignment: 'all', botStatus: 'all', tag: 'all' })}>
                    Limpar Filtros
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou WhatsApp..."
              className="pl-10 bg-secondary border-0 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-border/40",
                  "hover:bg-secondary/50",
                  selectedConversation?.id === conv.id && "bg-secondary"
                )}
              >
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {conv.contact?.nome?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground truncate">
                      {conv.contact?.nome || 'Contato Desconhecido'}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                      {formatTimestamp(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.contact?.whatsapp || ''}
                    </p>
                    {(conv.unread_count ?? 0) > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-primary text-[10px]">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {getStatusBadge(conv)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área do Chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-background h-full transition-all",
        isMobile && !selectedConversation ? "hidden" : "flex"
      )}>
        {selectedConversation ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shadow-sm z-10">
              <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                  <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)} className="mr-1 shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {selectedConversation.contact?.nome?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{selectedConversation.contact?.nome}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{selectedConversation.contact?.whatsapp}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="w-5 h-5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleGenerateSummary} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Resumo</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowContactInfo(true)} className="gap-2"><UserCircle className="w-4 h-4" /> Dados do Contato</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleToggleBot} className="gap-2">
                      <Power className={cn("w-4 h-4", (selectedConversation as any).is_bot_active ? "text-green-500" : "text-muted-foreground")} />
                      {(selectedConversation as any).is_bot_active ? 'Desativar IA' : 'Ativar IA'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm(true)}
                      className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" /> Apagar Conversa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  className="gap-2 shrink-0 border-blue-500/30 text-blue-600 hover:bg-blue-50"
                  onClick={handleTransferToIA}
                  disabled={transferToQueue.isPending}
                >
                  <Bot className="w-4 h-4" /> {!isMobile && "Transferir IA"}
                </Button>

                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  className="gap-2 shrink-0"
                  onClick={() => setShowTransferDialog(true)}
                >
                  <ArrowRightLeft className="w-4 h-4" /> {!isMobile && "Transferir"}
                </Button>

                {selectedConversation.status === 'concluido' ? (
                  <Button
                    variant="default"
                    size={isMobile ? "icon" : "sm"}
                    className="gap-2 shrink-0 bg-orange-600 hover:bg-orange-700"
                    onClick={handleReopen}
                    disabled={reopenConversation.isPending}
                  >
                    {reopenConversation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {!isMobile && "Reabrir"}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size={isMobile ? "icon" : "sm"}
                    className="gap-2 shrink-0"
                    onClick={handleResolve}
                    disabled={resolveConversation.isPending}
                  >
                    {resolveConversation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {!isMobile && "Resolver"}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
              <div className="max-w-4xl mx-auto space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                    <p>Inicie o atendimento enviando uma mensagem.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isFromContact = message.sender_type === 'contact' || message.sender_type === 'servidor';
                    const sender = getSenderInfo(message);

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex w-full mb-2 items-start',
                          isFromContact ? 'justify-start' : 'justify-end'
                        )}
                      >
                        {isFromContact && (
                          <Avatar className="w-8 h-8 mr-2 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                              {selectedConversation?.contact?.nome?.substring(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={cn(
                          'flex flex-col',
                          isFromContact ? 'items-start' : 'items-end'
                        )}>
                          <div
                            className={cn(
                              'max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm relative',
                              isFromContact
                                ? 'bg-card rounded-tl-none border border-border text-foreground'
                                : cn('rounded-tr-none', sender?.color || 'bg-primary', sender?.textColor || 'text-primary-foreground'),
                            )}
                          >
                            {/* Nome do remetente */}
                            <div className="flex items-center gap-1.5 mb-1 opacity-70">
                              {isFromContact ? (
                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                  {selectedConversation?.contact?.nome || 'Contato'}
                                </span>
                              ) : (
                                <>
                                  {sender?.icon && <sender.icon className="w-3 h-3" />}
                                  <span className="text-[10px] font-bold uppercase tracking-tight">
                                    {sender?.label}
                                  </span>
                                </>
                              )}
                            </div>

                            <p className="text-[13.5px] md:text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                            {message.metadata && typeof message.metadata === 'object' && renderAttachment(message.metadata)}

                            <div
                              className={cn(
                                'flex items-center gap-1.5 mt-1.5 opacity-60',
                                isFromContact ? 'justify-start' : 'justify-end'
                              )}
                            >
                              <span className="text-[9px] font-medium">
                                {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
                              </span>
                              {!isFromContact && (
                                <CheckCheck
                                  className={cn(
                                    'w-3 h-3',
                                    message.status === 'read' ? 'text-blue-300' : 'opacity-50'
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {!isFromContact && (
                          <div className="w-8 h-8 ml-2 shrink-0">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-secondary text-muted-foreground font-bold text-[10px]">
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {selectedConversation.status !== 'concluido' && selectedConversation.status !== 'resolvido' && (
              <div className="p-4 bg-card border-t border-border mt-auto">
                {/* ... (Área de Input igual ao anterior) ... */}
                {pendingFile && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-secondary rounded-xl max-w-4xl mx-auto animate-in slide-in-from-bottom-2">
                    <div className="shrink-0">
                      {getFileType(pendingFile.type) === 'image' ? (
                        <img src={pendingFile.url} alt={pendingFile.name} className="w-12 h-12 object-cover rounded-lg border border-border" />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-lg">
                          {React.createElement(getFileIcon(pendingFile.type), { className: "w-6 h-6 text-primary" })}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{pendingFile.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => setPendingFile(null)}><X className="w-4 h-4" /></Button>
                  </div>
                )}
                <div className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                  <div className="flex items-center mb-0.5">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept={allowedTypes.join(',')} className="hidden" />
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </Button>
                    <TemplateQuickSelect contactData={selectedConversation.contact || {}} onSelectTemplate={(content) => setMessageInput(content)} />
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Digite uma mensagem..."
                      className="bg-secondary border-0 h-10 pr-4 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/30"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendMessage.isPending || sendAIMessage.isPending || isUploading}
                    />
                  </div>
                  <Button size="icon" className="h-10 w-10 rounded-full shrink-0 shadow-lg" onClick={handleSendMessage} disabled={(!messageInput.trim() && !pendingFile) || sendMessage.isPending || sendAIMessage.isPending || isUploading}>
                    {sendMessage.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-secondary/20 p-8 text-center">
            <div className="max-w-sm">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/5 flex items-center justify-center">
                <MessageSquare className="w-12 h-12 text-primary/30" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Seu Inbox</h3>
              <p className="text-muted-foreground leading-relaxed">Escolha uma conversa na lista ao lado.</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="bg-primary/5 p-6 flex flex-col items-center text-center border-b border-border">
            <Avatar className="w-20 h-20 mb-4 border-2 border-primary/20 p-1 bg-background">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl uppercase">
                {selectedConversation?.contact?.nome?.substring(0, 2) || '??'}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-bold text-xl text-foreground mb-1">{selectedConversation?.contact?.nome}</h3>
            <p className="text-primary font-medium text-sm">{selectedConversation?.contact?.whatsapp}</p>
          </div>
          <div className="p-6 space-y-4">
            {selectedConversation?.contact && (
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{selectedConversation.contact.email || '-'}</span>
                </div>
                {/* Campos dinâmicos (opcionais no type, então usamos cast ou verificação) */}
                {(selectedConversation.contact as any).matricula && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Matrícula</span>
                    <span className="text-sm font-medium">{(selectedConversation.contact as any).matricula}</span>
                  </div>
                )}
                {(selectedConversation.contact as any).secretaria && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Secretaria</span>
                    <span className="text-sm font-medium">{(selectedConversation.contact as any).secretaria}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-border mt-4">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-3 block">Tags do Contato</span>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedConversation.contact.tags?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] pr-1.5 flex items-center gap-1 group"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )) || <span className="text-xs text-muted-foreground italic">Nenhuma tag</span>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova tag..."
                      className="h-8 text-xs"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button size="sm" className="h-8 px-2" onClick={handleAddTag}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><Bot className="w-6 h-6 text-primary" /> Resumo Inteligente</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                <p className="text-muted-foreground text-sm animate-pulse">Analisando histórico...</p>
              </div>
            ) : (
              <div className="bg-secondary/30 p-4 rounded-xl border border-border">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{conversationSummary}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <TransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        currentAssignedTo={selectedConversation?.assigned_to}
        onTransfer={handleTransfer}
        isLoading={transferConversation.isPending}
      />

      {/* Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar conversa permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá todas as mensagens e o histórico desta conversa.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConversation.isPending}
            >
              {deleteConversation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Apagar Conversa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inbox;