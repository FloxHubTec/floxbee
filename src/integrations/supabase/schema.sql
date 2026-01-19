-- =============================================
-- SUPABASE CRM / WHATSAPP / TICKETS SCHEMA
-- Script corrigido e executável
-- =============================================

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- SEQUENCES
-- =============================================
CREATE SEQUENCE IF NOT EXISTS tickets_numero_seq
START 1
INCREMENT 1;

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome text NOT NULL,
  email text,
  avatar_url text,
  telefone text,
  matricula text,
  role text NOT NULL DEFAULT 'agente',
  ativo boolean DEFAULT true,
  created_by uuid,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- =============================================
-- CONTACTS
-- =============================================
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  nome text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  matricula text,
  secretaria text,
  cargo text,
  tags text[] DEFAULT '{}'::text[],
  whatsapp_validated boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT contacts_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);

-- =============================================
-- MESSAGE TEMPLATES
-- =============================================
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  nome text NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT message_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- CAMPAIGNS
-- =============================================
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  nome text NOT NULL,
  descricao text,
  template_id uuid,
  mensagem text NOT NULL,
  filtro_secretaria text,
  filtro_tags text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'rascunho',
  total_destinatarios integer DEFAULT 0,
  enviados integer DEFAULT 0,
  entregues integer DEFAULT 0,
  lidos integer DEFAULT 0,
  falhas integer DEFAULT 0,
  respondidos integer DEFAULT 0,
  agendado_para timestamptz,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT campaigns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT campaigns_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES public.message_templates(id)
);

-- =============================================
-- CAMPAIGN RECIPIENTS
-- =============================================
CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  status text DEFAULT 'pendente',
  whatsapp_message_id text,
  erro text,
  enviado_em timestamptz,
  entregue_em timestamptz,
  lido_em timestamptz,
  CONSTRAINT campaign_recipients_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_recipients_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- =============================================
-- CONVERSATIONS
-- =============================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  contact_id uuid NOT NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'ativo',
  unread_count integer DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  is_bot_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT conversations_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT conversations_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT conversations_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);

-- =============================================
-- MESSAGES
-- =============================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_type text NOT NULL,
  sender_id uuid,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
);

-- =============================================
-- AUTOMATION RULES
-- =============================================
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  nome text NOT NULL,
  tipo text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT automation_rules_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- =============================================
-- AUTOMATION LOGS
-- =============================================
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid,
  contact_id uuid,
  status text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT automation_logs_rule_id_fkey
    FOREIGN KEY (rule_id) REFERENCES public.automation_rules(id),
  CONSTRAINT automation_logs_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);

-- =============================================
-- TICKETS
-- =============================================
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  numero integer NOT NULL DEFAULT nextval('tickets_numero_seq'),
  titulo text NOT NULL,
  descricao text,
  status text DEFAULT 'aberto',
  prioridade text DEFAULT 'media',
  contact_id uuid,
  assigned_to uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  CONSTRAINT tickets_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT tickets_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT tickets_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);

-- =============================================
-- SYSTEM SETTINGS
-- =============================================
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT system_settings_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
