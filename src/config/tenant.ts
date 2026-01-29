/**
 * Tenant Configuration System
 * 
 * Este arquivo centraliza todas as configurações específicas do cliente/negócio.
 * Para adaptar o sistema a um novo cliente, basta alterar estas configurações.
 */

export interface TenantBranding {
  // Identidade Visual
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  logoUrl?: string; // URL externa do logo (opcional)
  faviconUrl?: string;

  // Cores (HSL format para compatibilidade com Tailwind)
  colors: {
    primary: string; // ex: "162 100% 33%"
    primaryForeground: string;
    accent: string;
    accentForeground: string;
  };
}

export interface TenantEntityConfig {
  // Nomenclatura da entidade principal (servidor, cliente, usuário, etc.)
  entityName: string; // "servidor", "cliente", "usuário"
  entityNamePlural: string; // "servidores", "clientes", "usuários"

  // Campos personalizados para o cadastro
  customFields: {
    field1?: { label: string; placeholder: string; enabled: boolean }; // Ex: matrícula
    field2?: { label: string; placeholder: string; enabled: boolean }; // Ex: secretaria
    field3?: { label: string; placeholder: string; enabled: boolean }; // Ex: cargo
  };

  // Lista de opções para campo de departamento/setor
  departments: string[];
}

export interface TenantAIConfig {
  // Identidade da IA
  aiName: string;
  aiRole: string;
  aiOrganization: string;

  // Modelo de IA (configurável apenas por superadmin)
  model?: string;

  // Prompt customizado
  systemPromptTemplate: string;

  // Tópicos que a IA pode ajudar
  helpTopics: string[];

  // Base de conhecimento (texto livre para contexto extra)
  knowledgeBase?: string;

  // --- NOVAS CONFIGURAÇÕES AVANÇADAS ---
  messageBufferEnabled?: boolean;
  messageBufferTimeSeconds?: number;
  audioTranscriptionEnabled?: boolean;
  agentInactivityTimeoutMinutes?: number;
}

export interface TenantFeatures {
  // Módulos habilitados
  enableTickets: boolean;
  enableCampaigns: boolean;
  enableAutomations: boolean;
  enableAI: boolean;
  enablePublicRegister: boolean;
  enableAPIAccess: boolean;
}

export interface TenantConfig {
  id: string;
  branding: TenantBranding;
  entity: TenantEntityConfig;
  ai: TenantAIConfig;
  features: TenantFeatures;
  businessHours?: {
    timezone: string;
    schedule: {
      day: string;
      open: string;
      close: string;
      closed: boolean;
    }[];
  };
  slaConfig?: {
    responseTimeMinutes: number;
    resolutionTimeHours: number;
  };
}

// ============================================
// CONFIGURAÇÃO DO CLIENTE ATUAL
// Altere aqui para personalizar para cada cliente
// ============================================

export const CURRENT_TENANT: TenantConfig = {
  id: "prefeitura-municipal",

  branding: {
    name: "FloxBee",
    shortName: "FloxBee",
    tagline: "Sistema de Fluxo Inteligente de Atendimento",
    description: "CRM e Gestor de Atendimento Omnicanal para Governo",
    logoUrl: undefined, // Usar logo padrão
    faviconUrl: undefined,
    colors: {
      primary: "162 100% 33%",
      primaryForeground: "0 0% 100%",
      accent: "145 63% 49%",
      accentForeground: "0 0% 100%",
    },
  },

  entity: {
    entityName: "servidor",
    entityNamePlural: "servidores",
    customFields: {
      field1: { label: "Matrícula", placeholder: "Ex: 12345", enabled: true },
      field2: { label: "Secretaria", placeholder: "Ex: Saúde", enabled: true },
      field3: { label: "Cargo", placeholder: "Ex: Analista", enabled: true },
    },
    departments: [
      "Administração",
      "Educação",
      "Saúde",
      "Finanças",
      "Obras",
      "Meio Ambiente",
      "Cultura",
      "Esportes",
      "Assistência Social",
      "Transporte",
    ],
  },

  ai: {
    aiName: "FloxBee",
    aiRole: "assistente virtual",
    aiOrganization: "Secretaria de Administração Municipal",
    systemPromptTemplate: `Você é a {{aiName}}, {{aiRole}} da {{aiOrganization}}.

Suas responsabilidades:
1. Atender {{entityNamePlural}} com cordialidade e eficiência
2. Responder dúvidas sobre:
{{#helpTopics}}
   - {{.}}
{{/helpTopics}}
3. Coletar informações quando necessário
4. Encaminhar demandas complexas para atendimento humano

Regras importantes:
- Seja sempre educado e profissional
- Use linguagem clara e acessível
- Se não souber a resposta, encaminhe para atendimento humano
- Proteja dados sensíveis do usuário
- Se o usuário pedir para falar com humano, responda com [TRANSFERIR_HUMANO]`,
    helpTopics: [
      "Segunda via de contracheque e documentos",
      "Férias, licenças e afastamentos",
      "Progressão de carreira",
      "Benefícios e auxílios",
      "Prazos e procedimentos administrativos",
    ],
    knowledgeBase: "",
    messageBufferEnabled: true,
    messageBufferTimeSeconds: 10,
    audioTranscriptionEnabled: true,
    agentInactivityTimeoutMinutes: 30,
  },

  features: {
    enableTickets: true,
    enableCampaigns: true,
    enableAutomations: true,
    enableAI: true,
    enablePublicRegister: true,
    enableAPIAccess: true,
  },

  businessHours: {
    timezone: "America/Sao_Paulo",
    schedule: [
      { day: "Segunda-feira", open: "08:00", close: "18:00", closed: false },
      { day: "Terça-feira", open: "08:00", close: "18:00", closed: false },
      { day: "Quarta-feira", open: "08:00", close: "18:00", closed: false },
      { day: "Quinta-feira", open: "08:00", close: "18:00", closed: false },
      { day: "Sexta-feira", open: "08:00", close: "18:00", closed: false },
      { day: "Sábado", open: "08:00", close: "12:00", closed: true },
      { day: "Domingo", open: "08:00", close: "12:00", closed: true },
    ]
  },

  slaConfig: {
    responseTimeMinutes: 15,
    resolutionTimeHours: 24
  }
};

// ============================================
// EXEMPLOS DE OUTRAS CONFIGURAÇÕES DE CLIENTES
// ============================================

export const TENANT_EXAMPLES: Record<string, Partial<TenantConfig>> = {
  // Exemplo: Clínica de Saúde
  clinica: {
    id: "clinica-saude",
    branding: {
      name: "ClinicaBot",
      shortName: "ClinicaBot",
      tagline: "Atendimento Inteligente para Saúde",
      description: "Sistema de Gestão de Atendimento para Clínicas",
      colors: {
        primary: "200 80% 45%",
        primaryForeground: "0 0% 100%",
        accent: "180 60% 45%",
        accentForeground: "0 0% 100%",
      },
    },
    entity: {
      entityName: "paciente",
      entityNamePlural: "pacientes",
      customFields: {
        field1: { label: "CPF", placeholder: "000.000.000-00", enabled: true },
        field2: { label: "Convênio", placeholder: "Ex: Unimed", enabled: true },
        field3: { label: "Número do Cartão", placeholder: "Ex: 123456", enabled: true },
      },
      departments: [
        "Clínica Geral",
        "Cardiologia",
        "Ortopedia",
        "Pediatria",
        "Ginecologia",
        "Dermatologia",
      ],
    },
    ai: {
      aiName: "ClinicaBot",
      aiRole: "assistente de atendimento",
      aiOrganization: "Clínica Saúde Total",
      helpTopics: [
        "Agendamento de consultas",
        "Resultados de exames",
        "Horários de funcionamento",
        "Convênios aceitos",
        "Preparos para exames",
      ],
      systemPromptTemplate: "",
    },
  },

  // Exemplo: E-commerce
  ecommerce: {
    id: "loja-virtual",
    branding: {
      name: "ShopBot",
      shortName: "ShopBot",
      tagline: "Seu Assistente de Compras",
      description: "Atendimento Inteligente para E-commerce",
      colors: {
        primary: "270 70% 50%",
        primaryForeground: "0 0% 100%",
        accent: "45 90% 50%",
        accentForeground: "0 0% 13%",
      },
    },
    entity: {
      entityName: "cliente",
      entityNamePlural: "clientes",
      customFields: {
        field1: { label: "CPF/CNPJ", placeholder: "Documento", enabled: true },
        field2: { label: "Nível", placeholder: "Ex: Gold", enabled: true },
        field3: { label: "Código Cliente", placeholder: "Ex: CLI001", enabled: false },
      },
      departments: [
        "Vendas",
        "Suporte",
        "Trocas e Devoluções",
        "Financeiro",
      ],
    },
    ai: {
      aiName: "ShopBot",
      aiRole: "assistente de vendas",
      aiOrganization: "Loja Virtual",
      helpTopics: [
        "Status do pedido",
        "Prazos de entrega",
        "Política de troca",
        "Formas de pagamento",
        "Cupons de desconto",
      ],
      systemPromptTemplate: "",
    },
  },
};

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Processa um template substituindo variáveis
 */
export function processTemplate(template: string, variables: Record<string, string | string[]>): string {
  let result = template;

  // Substituir variáveis simples {{key}}
  Object.entries(variables).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  });

  // Processar arrays {{#key}}...{{/key}}
  Object.entries(variables).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const regex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g');
      result = result.replace(regex, (_, template) => {
        return value.map(item => template.replace('{{.}}', item)).join('\n');
      });
    }
  });

  return result;
}

/**
 * Gera o system prompt da IA baseado na configuração do tenant
 */
export function generateAISystemPrompt(config: TenantConfig): string {
  return processTemplate(config.ai.systemPromptTemplate, {
    aiName: config.ai.aiName,
    aiRole: config.ai.aiRole,
    aiOrganization: config.ai.aiOrganization,
    entityName: config.entity.entityName,
    entityNamePlural: config.entity.entityNamePlural,
    helpTopics: config.ai.helpTopics,
  });
}

/**
 * Variáveis de exemplo para preview de templates
 */
export function getSampleVariables(config: TenantConfig): Record<string, string> {
  const samples: Record<string, string> = {
    nome: 'João Silva',
    email: 'joao@email.com',
    whatsapp: '(11) 99999-9999',
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };

  const { customFields } = config.entity;

  if (customFields.field1?.enabled) {
    const key = customFields.field1.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    samples[key] = '12345';
  }
  if (customFields.field2?.enabled) {
    const key = customFields.field2.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    samples[key] = config.entity.departments[0] || 'Departamento';
  }
  if (customFields.field3?.enabled) {
    const key = customFields.field3.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    samples[key] = 'Analista';
  }

  return samples;
}
