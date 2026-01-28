import React, { useState, useRef } from "react";
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  Phone,
  Mail,
  Building2,
  FileSpreadsheet,
  CheckCircle,
  MessageSquare,
  Trash2,
  Edit,
  Loader2,
  ShieldCheck,
  Download,
  Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ContactForm } from "@/components/contacts/ContactForm";
import { TagManager } from "@/components/contacts/TagManager";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// CORREÇÃO: Importar os 3 hooks separadamente
import {
  useContacts,
  useImportContacts,
  useValidateWhatsApp,
  Contact
} from "@/hooks/useContacts";
import { exportContactsToExcel } from "@/lib/exportExcel";

const Contacts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirmContact, setDeleteConfirmContact] = useState<Contact | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CORREÇÃO: Usar os hooks separadamente
  const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts();
  const { importContacts, isImporting } = useImportContacts();
  const { validateAndUpdateContacts, isValidating } = useValidateWhatsApp();

  const filteredContacts = (contacts || []).filter(
    (contact) =>
      contact.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((contact as any).secretaria && (contact as any).secretaria.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((contact as any).matricula && (contact as any).matricula.includes(searchQuery))
  );

  const handleExportExcel = () => {
    if (!filteredContacts || filteredContacts.length === 0) {
      toast.error('Não há contatos para exportar');
      return;
    }

    try {
      const fileName = exportContactsToExcel(filteredContacts);
      toast.success(`${filteredContacts.length} contatos exportados: ${fileName}`);
    } catch (error) {
      console.error('Erro ao exportar contatos:', error);
      toast.error('Erro ao exportar contatos');
    }
  };

  const handleCall = (whatsapp: string) => {
    if (!whatsapp) return;
    window.location.href = `tel:${whatsapp}`;
  };

  const handleWhatsApp = (whatsapp: string) => {
    if (!whatsapp) return;
    const cleanNumber = whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanNumber}`, "_blank");
  };

  const handleEmail = (email: string | null) => {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const result = await importContacts(file);
      if (result?.success) {
        setIsImportModalOpen(false);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await importContacts(file);
      if (result?.success) {
        setIsImportModalOpen(false);
      }
    }
  };

  const handleCreateContact = (data: any) => {
    createContact.mutate(data, {
      onSuccess: () => {
        setIsFormOpen(false);
      },
    });
  };

  const handleUpdateContact = (data: any) => {
    if (editingContact) {
      updateContact.mutate(
        { id: editingContact.id, ...data },
        {
          onSuccess: () => {
            setEditingContact(null);
            setSelectedContact(null);
          },
        }
      );
    }
  };

  const handleDeleteContact = () => {
    if (deleteConfirmContact) {
      deleteContact.mutate(deleteConfirmContact.id, {
        onSuccess: () => {
          setDeleteConfirmContact(null);
          setSelectedContact(null);
        },
      });
    }
  };

  const formatWhatsApp = (whatsapp: string) => {
    if (!whatsapp) return "-";
    // Retorna apenas os dígitos conforme solicitado pelo usuário
    return whatsapp.replace(/\D/g, "");
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="p-4 md:p-6 border-b border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Contatos</h1>
            <p className="text-sm text-muted-foreground">
              {contacts?.length || 0} contatos cadastrados
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => {
                // Filtra contatos que ainda não foram validados (se o campo existir no type)
                // Se não existir no type, validamos todos ou fazemos cast
                const unvalidated = contacts
                  .filter((c) => !(c as any).whatsapp_validated)
                  .map((c) => c.id);

                if (unvalidated.length > 0) {
                  validateAndUpdateContacts(unvalidated.slice(0, 100));
                } else {
                  // Se todos parecem validados, força revalidação dos visíveis
                  const visibleIds = filteredContacts.map(c => c.id).slice(0, 50);
                  validateAndUpdateContacts(visibleIds);
                }
              }}
              disabled={isValidating}
            >
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span className="hidden sm:inline">Validar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 border-blue-500/30 text-blue-600 hover:bg-blue-50"
              onClick={() => setIsTagManagerOpen(true)}
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Gerenciar Tags</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={handleExportExcel}
              disabled={filteredContacts.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </Button>

            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md w-[95vw] rounded-lg">
                <DialogHeader>
                  <DialogTitle>Importar Contatos</DialogTitle>
                  <DialogDescription>
                    Arraste um arquivo CSV, Excel ou LibreOffice (.ods)
                  </DialogDescription>
                </DialogHeader>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  {isImporting ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="text-sm text-muted-foreground">Importando contatos...</p>
                    </div>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">Arraste seu arquivo aqui ou</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.ods"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Selecionar Arquivo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-4">Formatos aceitos: .csv, .xlsx, .xls, .ods</p>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button size="sm" className="gap-2 shrink-0" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Contato</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone..."
            className="pl-10 bg-secondary border-0 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="bg-card rounded-lg border border-border shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-1">Nenhum contato encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">{searchQuery ? "Tente uma busca diferente" : "Comece adicionando seu primeiro contato"}</p>
              {!searchQuery && (
                <Button onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-2" /> Adicionar Contato</Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[200px] md:w-[250px]">Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">WhatsApp</TableHead>
                  <TableHead className="hidden md:table-cell">Secretaria</TableHead>
                  <TableHead className="hidden lg:table-cell">Matrícula</TableHead>
                  <TableHead className="hidden xl:table-cell">Tags</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-secondary/50"
                    onClick={() => setSelectedContact(contact)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {contact.nome.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="font-medium text-foreground truncate max-w-[150px] sm:max-w-none">{contact.nome}</p>
                          <div className="sm:hidden text-xs text-muted-foreground flex flex-col">
                            <span>{formatWhatsApp(contact.whatsapp)}</span>
                          </div>
                          <p className="hidden sm:block text-xs text-muted-foreground">{contact.email || "Sem email"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{formatWhatsApp(contact.whatsapp)}</span>
                        {/* Verificação segura da propriedade opcional */}
                        {(contact as any).whatsapp_validated ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-xs text-amber-500 hidden lg:inline">Não validado</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[150px]">
                          {(contact as any).department?.name || (contact as any).secretaria || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{(contact as any).matricula || "-"}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-1 flex-wrap">
                        {contact.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingContact(contact); }}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirmContact(contact); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Sheet open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <SheetContent className="w-full sm:max-w-md md:w-[540px] overflow-y-auto pt-10">
          {selectedContact && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                      {selectedContact.nome.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <SheetTitle className="text-2xl">{selectedContact.nome}</SheetTitle>
                    <SheetDescription className="flex items-center justify-center gap-2 mt-1">
                      <Building2 className="w-4 h-4" />
                      {(selectedContact as any).department?.name || (selectedContact as any).secretaria || "Sem departamento"}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Separator className="my-4" />

              <div className="flex gap-2 mb-6">
                <Button variant="outline" className="flex-1 gap-2 flex-col h-auto py-3 text-xs sm:text-sm sm:flex-row" onClick={() => handleCall(selectedContact.whatsapp)}>
                  <Phone className="w-4 h-4" /> Ligar
                </Button>
                <Button variant="outline" className="flex-1 gap-2 flex-col h-auto py-3 text-xs sm:text-sm sm:flex-row" onClick={() => handleWhatsApp(selectedContact.whatsapp)}>
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </Button>
                <Button variant="outline" className="flex-1 gap-2 flex-col h-auto py-3 text-xs sm:text-sm sm:flex-row" onClick={() => handleEmail(selectedContact.email)} disabled={!selectedContact.email}>
                  <Mail className="w-4 h-4" /> Email
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Informações</h4>
                  <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-sm text-muted-foreground">WhatsApp</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatWhatsApp(selectedContact.whatsapp)}</span>
                        {(selectedContact as any).whatsapp_validated && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-medium truncate max-w-[200px]">{selectedContact.email || "-"}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-sm text-muted-foreground">Matrícula</span>
                      <span className="text-sm font-medium">{(selectedContact as any).matricula || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {/* Se não tiver contagem, mostra - */}
                      {(selectedContact as any).messages_sent_count || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Mensagens</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {(selectedContact as any).last_message_at ? format(new Date((selectedContact as any).last_message_at), "dd/MM", { locale: ptBR }) : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Último Contato</p>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingContact(selectedContact)}>
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => setDeleteConfirmContact(selectedContact)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ContactForm
        open={isFormOpen || !!editingContact}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false);
            setEditingContact(null);
          }
        }}
        contact={editingContact}
        onSubmit={editingContact ? handleUpdateContact : handleCreateContact}
        isLoading={createContact.isPending || updateContact.isPending}
      />

      <AlertDialog open={!!deleteConfirmContact} onOpenChange={() => setDeleteConfirmContact(null)}>
        <AlertDialogContent className="w-[90vw] rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contato <strong>{deleteConfirmContact?.nome}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TagManager
        open={isTagManagerOpen}
        onOpenChange={setIsTagManagerOpen}
      />
    </div>
  );
};

export default Contacts;