import React, { useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useTemplates,
  Template,
  TEMPLATE_CATEGORIES,
  previewTemplate,
  SAMPLE_VARIABLES
} from '@/hooks/useTemplates';
import TemplateForm from '@/components/templates/TemplateForm';
import FloxBeeLogo from '@/components/FloxBeeLogo';

const Templates: React.FC = () => {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, toggleTemplateStatus } = useTemplates();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<Template | null>(null);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      template.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.conteudo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || template.categoria === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleCreate = async (data: { nome: string; conteudo: string; categoria?: string }) => {
    try {
      await createTemplate.mutateAsync(data);
      toast({
        title: 'Template criado',
        description: 'O template foi criado com sucesso.',
      });
      setShowForm(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o template.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: { nome: string; conteudo: string; categoria?: string }) => {
    if (!editingTemplate) return;

    try {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...data });
      toast({
        title: 'Template atualizado',
        description: 'O template foi atualizado com sucesso.',
      });
      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o template.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await deleteTemplate.mutateAsync(deletingTemplate.id);
      toast({
        title: 'Template excluído',
        description: 'O template foi excluído com sucesso.',
      });
      setDeletingTemplate(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o template.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (template: Template) => {
    try {
      await toggleTemplateStatus.mutateAsync({ id: template.id, ativo: !template.ativo });
      toast({
        title: template.ativo ? 'Template desativado' : 'Template ativado',
        description: `O template "${template.nome}" foi ${template.ativo ? 'desativado' : 'ativado'}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };



  const handleCopyTemplate = (template: Template) => {
    navigator.clipboard.writeText(template.conteudo);
    toast({
      title: 'Copiado!',
      description: 'O conteúdo foi copiado para a área de transferência.',
    });
  };

  const getCategoryLabel = (value: string | null) => {
    const category = TEMPLATE_CATEGORIES.find(c => c.value === value);
    return category?.label || value || 'Sem categoria';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <FloxBeeLogo size={32} showText={false} />
          <div>
            <h1 className="text-2xl font-bold">Templates de Mensagens</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus modelos de mensagem com variáveis dinâmicas
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/30">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum template encontrado</p>
            <p className="text-sm">Crie um novo template para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={`relative transition-all hover:shadow-md ${!template.ativo ? 'opacity-60' : ''
                  }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold line-clamp-1">
                        {template.nome}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(template.categoria)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Content Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-3 font-mono bg-muted/50 p-2 rounded">
                    {template.conteudo}
                  </p>

                  {/* Variables */}
                  {template.variaveis && template.variaveis.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variaveis.map((variable) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewingTemplate(template)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopyTemplate(template)}
                        title="Copiar"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingTemplate(template)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeletingTemplate(template)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleStatus(template)}
                      title={template.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {template.ativo ? (
                        <ToggleRight className="w-5 h-5 text-primary" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingTemplate(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSubmit={editingTemplate ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
            isLoading={createTemplate.isPending || updateTemplate.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewingTemplate} onOpenChange={(open) => !open && setPreviewingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewingTemplate?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Conteúdo Original:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {previewingTemplate?.conteudo}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Preview com dados de exemplo:
              </p>
              <div className="bg-primary/10 p-4 rounded-lg text-sm whitespace-pre-wrap">
                {previewingTemplate && previewTemplate(previewingTemplate.conteudo, SAMPLE_VARIABLES)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{deletingTemplate?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Templates;
