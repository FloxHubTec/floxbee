import React, { useState } from 'react';
import { FileText, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTemplates, previewTemplate, SAMPLE_VARIABLES } from '@/hooks/useTemplates';

interface TemplateQuickSelectProps {
  contactData?: {
    nome?: string;
    matricula?: string;
    secretaria?: string;
    email?: string;
    cargo?: string;
  };
  onSelectTemplate: (content: string) => void;
}

const TemplateQuickSelect: React.FC<TemplateQuickSelectProps> = ({
  contactData,
  onSelectTemplate,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { templates, isLoading } = useTemplates();

  const activeTemplates = templates.filter(t => t.ativo);
  const filteredTemplates = activeTemplates.filter(t =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTemplate = (template: typeof templates[0]) => {
    // Replace variables with contact data or sample data
    const variables: Record<string, string> = {
      ...SAMPLE_VARIABLES,
      nome: contactData?.nome?.split(' ')[0] || SAMPLE_VARIABLES.nome,
      nome_completo: contactData?.nome || SAMPLE_VARIABLES.nome,
      matricula: contactData?.matricula || SAMPLE_VARIABLES.matricula,
      secretaria: contactData?.secretaria || SAMPLE_VARIABLES.secretaria,
      email: contactData?.email || SAMPLE_VARIABLES.email,
      cargo: contactData?.cargo || SAMPLE_VARIABLES.cargo,
    };

    const personalizedContent = previewTemplate(template.conteudo, variables);
    onSelectTemplate(personalizedContent);
    setOpen(false);
    setSearch('');
  };

  const getCategoryColor = (categoria: string | null) => {
    switch (categoria) {
      case 'atendimento':
        return 'bg-blue-500/20 text-blue-400';
      case 'campanha':
        return 'bg-green-500/20 text-green-400';
      case 'notificacao':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'lembrete':
        return 'bg-purple-500/20 text-purple-400';
      case 'boas-vindas':
        return 'bg-pink-500/20 text-pink-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          title="Templates Rápidos"
        >
          <FileText className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Templates Rápidos</h4>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Carregando templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {search ? 'Nenhum template encontrado' : 'Nenhum template ativo'}
            </div>
          ) : (
            <div className="p-1">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full text-left p-2 rounded-md hover:bg-secondary transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {template.nome}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {template.conteudo}
                      </p>
                    </div>
                    {template.categoria && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs shrink-0 ${getCategoryColor(template.categoria)}`}
                      >
                        {template.categoria}
                      </Badge>
                    )}
                  </div>
                  {template.variaveis && template.variaveis.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {template.variaveis.slice(0, 3).map((v) => (
                        <span
                          key={v}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {template.variaveis.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          +{template.variaveis.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default TemplateQuickSelect;
