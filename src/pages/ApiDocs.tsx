import React, { useState } from 'react';
import {
  Code,
  Copy,
  CheckCircle,
  Send,
  Users,
  Megaphone,
  Bot,
  FileText,
  Webhook,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import FloxBeeLogo from '@/components/FloxBeeLogo';
import { useTenant } from '@/hooks/useTenant';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: Record<string, unknown>;
  responseExample?: Record<string, unknown>;
  headers?: string[];
}

interface ApiSection {
  title: string;
  icon: React.ElementType;
  description: string;
  endpoints: Endpoint[];
}


const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-secondary/50 p-4 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-600 border-green-500/20',
    PUT: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <Badge variant="outline" className={colors[method] || ''}>
      {method}
    </Badge>
  );
};

const EndpointCard: React.FC<{ endpoint: Endpoint; baseUrl: string }> = ({ endpoint, baseUrl }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
          <MethodBadge method={endpoint.method} />
          <code className="flex-1 text-sm font-mono text-foreground">{endpoint.path}</code>
          <span className="text-sm text-muted-foreground hidden md:block">
            {endpoint.description}
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-4 p-4 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground">{endpoint.description}</p>

        <div>
          <p className="text-sm font-medium mb-2">URL Completa:</p>
          <CodeBlock code={`${baseUrl}${endpoint.path}`} />
        </div>

        {endpoint.headers && endpoint.headers.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Headers/Query Params:</p>
            <div className="flex flex-wrap gap-2">
              {endpoint.headers.map((header) => (
                <Badge key={header} variant="secondary">
                  {header}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {endpoint.requestBody && (
          <div>
            <p className="text-sm font-medium mb-2">Request Body:</p>
            <CodeBlock code={JSON.stringify(endpoint.requestBody, null, 2)} />
          </div>
        )}

        {endpoint.responseExample && (
          <div>
            <p className="text-sm font-medium mb-2">Response Example:</p>
            <CodeBlock code={JSON.stringify(endpoint.responseExample, null, 2)} />
          </div>
        )}

        <div>
          <p className="text-sm font-medium mb-2">cURL Example:</p>
          <CodeBlock
            code={`curl -X ${endpoint.method} \\
  "${baseUrl}${endpoint.path}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ANON_KEY"${endpoint.requestBody
                ? ` \\
  -d '${JSON.stringify(endpoint.requestBody)}'`
                : ''
              }`}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const ApiDocs: React.FC = () => {
  const { config, ownerId } = useTenant();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xgyzfwwxbulbegrjvtfr.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'SUA_CHAVE_AQUI';

  const API_SECTIONS: ApiSection[] = [
    {
      title: 'WhatsApp - Envio de Mensagens',
      icon: Send,
      description: 'Endpoints para envio de mensagens individuais e em massa via WhatsApp Business API',
      endpoints: [
        {
          method: 'POST',
          path: '/functions/v1/whatsapp-send',
          description: 'Enviar mensagem individual para um contato',
          requestBody: {
            to: '5511999999999',
            message: 'Olá, {{nome}}! Esta é uma mensagem de teste.',
            type: 'text',
            owner_id: ownerId || 'uuid-do-dono',
          },
          responseExample: {
            messaging_product: 'whatsapp',
            contacts: [{ input: '5511999999999', wa_id: '5511999999999' }],
            messages: [{ id: 'wamid.xxx' }],
          },
        },
        {
          method: 'POST',
          path: '/functions/v1/whatsapp-send/bulk',
          description: 'Enviar mensagem para múltiplos destinatários',
          requestBody: {
            recipients: ['5511999999999', '5511888888888'],
            message: 'Mensagem em massa',
            owner_id: ownerId || 'uuid-do-dono',
            delay_ms: 100,
          },
          responseExample: {
            results: [
              { recipient: '5511999999999', success: true, messageId: 'wamid.xxx' },
              { recipient: '5511888888888', success: true, messageId: 'wamid.yyy' },
            ],
            summary: { total: 2, success: 2, failed: 0 },
          },
        },
      ],
    },
    {
      title: 'Campanhas',
      icon: Megaphone,
      description: 'Gerenciar campanhas de comunicação em massa',
      endpoints: [
        {
          method: 'POST',
          path: '/functions/v1/campaign-send',
          description: 'Criar e enviar uma campanha',
          requestBody: {
            recipients: [{ whatsapp: '5511999999999', nome: 'João', id: 'uuid' }],
            message_template: 'Olá {{nome}}, nova campanha disponível!',
            campaign_id: 'uuid-da-campanha',
            frequency_limit_hours: 24,
            bypass_frequency_check: false,
          },
          responseExample: {
            success: true,
            summary: {
              total: 100,
              sent: 95,
              failed: 3,
              blocked_by_frequency: 2,
            },
          },
        },
      ],
    },
    {
      title: 'Importação de Contatos',
      icon: Users,
      description: 'Importar e validar contatos em massa',
      endpoints: [
        {
          method: 'POST',
          path: '/functions/v1/import-contacts',
          description: 'Importar contatos de uma planilha',
          requestBody: {
            data: [
              { col_a: 'João Silva', col_b: '11999999999', col_c: 'joao@email.com' },
            ],
            column_mapping: {
              nome: 'col_a',
              whatsapp: 'col_b',
              email: 'col_c',
            },
            validate_whatsapp: true,
            skip_duplicates: true,
          },
          responseExample: {
            summary: { total: 100, valid: 95, invalid: 5 },
            preview: [{ nome: 'João Silva', whatsapp: '5511999999999' }],
            invalid_rows: [{ row: 5, errors: ['WhatsApp inválido'] }],
          },
        },
        {
          method: 'POST',
          path: '/functions/v1/validate-whatsapp',
          description: 'Validar números de WhatsApp',
          requestBody: {
            numbers: ['11999999999', '11888888888'],
          },
          responseExample: {
            results: [
              { number: '5511999999999', valid: true, exists_on_whatsapp: true },
              { number: '5511888888888', valid: true, exists_on_whatsapp: false },
            ],
            summary: { total: 2, valid: 2, on_whatsapp: 1 },
          },
        },
      ],
    },
    {
      title: 'Chat com IA',
      icon: Bot,
      description: 'Interagir com o assistente de IA',
      endpoints: [
        {
          method: 'POST',
          path: '/functions/v1/ai-chat',
          description: 'Enviar mensagem para o chat de IA',
          requestBody: {
            messages: [
              { role: 'user', content: 'Qual é o prazo para recadastramento?' },
            ],
            context: {
              contact_name: 'João Silva',
              contact_id: 'uuid',
              owner_id: ownerId || 'uuid-do-dono',
            },
            stream: false,
          },
          responseExample: {
            response: 'O prazo para recadastramento é até o dia 30 deste mês.',
            transfer_to_human: false,
          },
        },
      ],
    },
    {
      title: 'Gestão de Departamentos',
      icon: Building2,
      description: 'Endpoints para gerenciar departamentos e equipes (Novo)',
      endpoints: [
        {
          method: 'GET',
          path: '/rest/v1/departments',
          description: 'Listar todos os departamentos vinculados ao seu owner_id',
          headers: ['Prefer: count=exact'],
          responseExample: [
            {
              id: 'uuid',
              name: 'Suporte Técnico',
              description: 'Atendimento de TI',
              active: true,
              agents_ids: ['id-agente-1', 'id-agente-2']
            }
          ],
        },
      ],
    },
  ];

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          {config.branding?.logo_url ? (
            <img src={config.branding.logo_url} alt="Logo" className="h-10 w-auto" />
          ) : (
            <FloxBeeLogo size={40} />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Documentação da API - {config.branding?.name || 'FloxHub'}
            </h1>
            <p className="text-muted-foreground">
              Integre seus sistemas com a tecnologia da {config.branding?.name || 'nossa plataforma'}
            </p>
          </div>
        </div>

        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Introdução e Autenticação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              A API {config.branding?.name || 'do FloxHub'} utiliza os Edge Functions do Supabase e o PostgREST para garantir alta performance e escalabilidade.
              Nossa arquitetura segue padrões governamentais de segurança e interoperabilidade.
            </p>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg space-y-3">
              <h3 className="font-semibold text-sm">Seus Dados de Acesso:</h3>
              <div className="grid gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-wider">Identificador da Empresa (owner_id)</p>
                  <CodeBlock code={ownerId || 'Não carregado'} />
                  <p className="text-[10px] text-muted-foreground mt-1 italic">Envie este ID no campo `owner_id` das requisições para vincular as mensagens à sua conta.</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-wider">Chave de API (Anon Key)</p>
                  <CodeBlock code={anonKey} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-wider">Base URL das Funções</p>
                  <CodeBlock code={`${baseUrl}/functions/v1`} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Segurança:</strong> Nunca compartilhe sua Chave de API ou expunha-a em código frontend público sem as devidas políticas de RLS.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Sections */}
        <Tabs defaultValue="whatsapp---envio-de-mensagens" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-2">
            {API_SECTIONS.map((section) => (
              <TabsTrigger key={section.title} value={section.title.toLowerCase().replace(/\s+/g, '-')}>
                <section.icon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{section.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {API_SECTIONS.map((section) => (
            <TabsContent
              key={section.title}
              value={section.title.toLowerCase().replace(/\s+/g, '-')}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <section.icon className="w-5 h-5 text-primary" />
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.endpoints.map((endpoint, index) => (
                    <EndpointCard
                      key={index}
                      endpoint={endpoint}
                      baseUrl={baseUrl}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle>Limites e Boas Práticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Rate Limiting</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Máximo 100 requisições/minuto por IP</li>
                  <li>• Bulk: máximo 1000 destinatários por chamada</li>
                  <li>• Campanhas: delay mínimo de 100ms entre mensagens</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Controle de Frequência</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Respeite o limite de frequência por contato</li>
                  <li>• Default: 24 horas entre campanhas</li>
                  <li>• Configurável via parâmetro frequency_limit_hours</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-6 border-t border-border">
          <p>
            Precisa de ajuda? Entre em contato com o suporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
