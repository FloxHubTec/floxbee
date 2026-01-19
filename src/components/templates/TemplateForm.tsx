import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Template, 
  extractVariables, 
  previewTemplate, 
  TEMPLATE_CATEGORIES,
  SAMPLE_VARIABLES 
} from '@/hooks/useTemplates';
import { Eye, Plus, X } from 'lucide-react';

const templateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  categoria: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  template?: Template | null;
  onSubmit: (data: TemplateFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const AVAILABLE_VARIABLES = [
  { name: 'nome', description: 'Nome do contato' },
  { name: 'matricula', description: 'Matrícula do servidor' },
  { name: 'cargo', description: 'Cargo do servidor' },
  { name: 'secretaria', description: 'Secretaria do servidor' },
  { name: 'email', description: 'Email do contato' },
  { name: 'whatsapp', description: 'WhatsApp do contato' },
  { name: 'data', description: 'Data atual' },
  { name: 'hora', description: 'Hora atual' },
];

const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      nome: template?.nome || '',
      conteudo: template?.conteudo || '',
      categoria: template?.categoria || '',
    },
  });

  const conteudo = form.watch('conteudo');

  useEffect(() => {
    setDetectedVariables(extractVariables(conteudo || ''));
  }, [conteudo]);

  const insertVariable = (variableName: string) => {
    const currentContent = form.getValues('conteudo');
    const textarea = document.getElementById('conteudo-textarea') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        currentContent.substring(0, start) + 
        `{{${variableName}}}` + 
        currentContent.substring(end);
      
      form.setValue('conteudo', newContent);
      
      // Reset cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + variableName.length + 4;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      form.setValue('conteudo', currentContent + `{{${variableName}}}`);
    }
  };

  const previewContent = previewTemplate(conteudo || '', SAMPLE_VARIABLES);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Template</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Boas-vindas ao servidor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Variables Helper */}
            <div className="space-y-2">
              <Label>Variáveis Disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Button
                    key={variable.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable.name)}
                    className="text-xs"
                    title={variable.description}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {`{{${variable.name}}}`}
                  </Button>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="conteudo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo da Mensagem</FormLabel>
                  <FormControl>
                    <Textarea
                      id="conteudo-textarea"
                      placeholder="Digite o conteúdo do template. Use {{variavel}} para inserir variáveis dinâmicas."
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Detected Variables */}
            {detectedVariables.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">
                  Variáveis detectadas:
                </Label>
                <div className="flex flex-wrap gap-1">
                  {detectedVariables.map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Pré-visualização</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-1" />
                {showPreview ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>

            {showPreview && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Como será exibido:
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/10 rounded-lg p-4 whitespace-pre-wrap text-sm">
                    {previewContent || (
                      <span className="text-muted-foreground italic">
                        O preview aparecerá aqui...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * Valores de exemplo são usados para demonstração
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sample Data Reference */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Dados de Exemplo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <div key={variable.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{variable.name}:</span>
                    <span className="font-mono">
                      {SAMPLE_VARIABLES[variable.name]}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : template ? 'Atualizar' : 'Criar Template'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TemplateForm;
