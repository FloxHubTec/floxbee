import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller } from "react-hook-form";
import { useActiveDepartments } from "@/hooks/useDepartments";
import { Contact, ContactInsert } from "@/hooks/useContacts";

const contactSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  department_id: z.string().nullable().optional(),
  matricula: z.string().optional(),
  cargo: z.string().optional(),
  data_nascimento: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSubmit: (data: ContactInsert) => void;
  isLoading?: boolean;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isLoading,
}) => {
  const { data: departments = [] } = useActiveDepartments();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      nome: contact?.nome || "",
      whatsapp: contact?.whatsapp || "",
      email: contact?.email || "",
      department_id: (contact as any)?.department_id || null,
      matricula: contact?.matricula || "",
      cargo: contact?.cargo || "",
      data_nascimento: (contact as any)?.data_nascimento || "",
      tags: contact?.tags || [],
    },
  });

  const [tagInput, setTagInput] = React.useState("");
  const tags = watch("tags") || [];

  React.useEffect(() => {
    if (contact) {
      reset({
        nome: contact.nome,
        whatsapp: contact.whatsapp,
        email: contact.email || "",
        department_id: (contact as any).department_id || null,
        matricula: contact.matricula || "",
        cargo: contact.cargo || "",
        data_nascimento: (contact as any).data_nascimento || "",
        tags: contact.tags || [],
      });
    } else {
      reset({
        nome: "",
        whatsapp: "",
        email: "",
        department_id: null,
        matricula: "",
        cargo: "",
        data_nascimento: "",
        tags: [],
      });
    }
  }, [contact, reset]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(",", "");
      if (newTag && !tags.includes(newTag)) {
        setValue("tags", [...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue("tags", tags.filter(t => t !== tagToRemove));
  };

  const handleFormSubmit = (data: ContactFormData) => {
    // Format phone number
    let whatsapp = data.whatsapp.replace(/\D/g, "");
    if (whatsapp.length === 11) {
      whatsapp = `55${whatsapp}`;
    } else if (whatsapp.length === 10) {
      whatsapp = `55${whatsapp.slice(0, 2)}9${whatsapp.slice(2)}`;
    }

    onSubmit({
      nome: data.nome,
      whatsapp,
      email: data.email || null,
      department_id: data.department_id || null,
      matricula: data.matricula || null,
      cargo: data.cargo || null,
      data_nascimento: data.data_nascimento || null,
      tags: data.tags,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
          <DialogDescription>
            {contact
              ? "Atualize as informações do contato"
              : "Preencha os dados do novo contato"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="Nome completo"
              {...register("nome")}
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input
              id="whatsapp"
              placeholder="(11) 99999-9999"
              {...register("whatsapp")}
            />
            {errors.whatsapp && (
              <p className="text-xs text-destructive">
                {errors.whatsapp.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department_id">Departamento</Label>
              <Controller
                name="department_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                placeholder="Ex: 12345"
                {...register("matricula")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              placeholder="Ex: Analista"
              {...register("cargo")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de Nascimento 🎂</Label>
            <Input
              id="data_nascimento"
              type="date"
              {...register("data_nascimento")}
            />
            <p className="text-xs text-muted-foreground">
              Para envio automático de mensagens de aniversário
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tags de Segmentação</Label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 border rounded-md bg-muted/20">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 px-2 py-1">
                  {tag}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-muted-foreground self-center">Nenhuma tag adicionada</span>
              )}
            </div>
            <Input
              placeholder="Digite uma tag e pressione Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
            <p className="text-[10px] text-muted-foreground">
              Use tags para agrupar contatos (ex: saúde, educação, ativos). Pressione Enter ou vírgula para adicionar.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : contact ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
