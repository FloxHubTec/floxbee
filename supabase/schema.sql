-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.automation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_id uuid,
  contact_id uuid,
  status text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT automation_logs_pkey PRIMARY KEY (id),
  CONSTRAINT automation_logs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.automation_rules(id),
  CONSTRAINT automation_logs_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);
CREATE TABLE public.automation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid,
  nome text NOT NULL,
  tipo text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  template_id uuid,
  owner_id uuid,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT automation_rules_pkey PRIMARY KEY (id),
  CONSTRAINT automation_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT automation_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.message_templates(id),
  CONSTRAINT automation_rules_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  status text DEFAULT 'pendente'::text,
  whatsapp_message_id text,
  erro text,
  enviado_em timestamp with time zone,
  entregue_em timestamp with time zone,
  lido_em timestamp with time zone,
  CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT campaign_recipients_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid,
  nome text NOT NULL,
  descricao text,
  template_id uuid,
  mensagem text NOT NULL,
  filtro_secretaria text,
  filtro_tags ARRAY DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'rascunho'::text,
  total_destinatarios integer DEFAULT 0,
  enviados integer DEFAULT 0,
  entregues integer DEFAULT 0,
  lidos integer DEFAULT 0,
  falhas integer DEFAULT 0,
  respondidos integer DEFAULT 0,
  agendado_para timestamp with time zone,
  iniciado_em timestamp with time zone,
  concluido_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  owner_id uuid,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.message_templates(id),
  CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT campaigns_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  nome text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  matricula text,
  secretaria text,
  cargo text,
  tags ARRAY DEFAULT '{}'::text[],
  whatsapp_validated boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  data_nascimento date,
  department_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT contacts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  contact_id uuid NOT NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'ativo'::text,
  unread_count integer DEFAULT 0,
  last_message_at timestamp with time zone DEFAULT now(),
  is_bot_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT conversations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT conversations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  name text NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  auto_assign_to uuid,
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT departments_auto_assign_to_fkey FOREIGN KEY (auto_assign_to) REFERENCES public.profiles(id)
);
CREATE TABLE public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  integration_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  last_tested_at timestamp with time zone,
  test_status text,
  test_error text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integrations_pkey PRIMARY KEY (id),
  CONSTRAINT integrations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.landing_page_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  landing_page_id uuid NOT NULL,
  contact_id uuid,
  dados jsonb NOT NULL,
  origem text,
  user_agent text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT landing_page_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT lp_submissions_landing_page_id_fkey FOREIGN KEY (landing_page_id) REFERENCES public.landing_pages(id),
  CONSTRAINT lp_submissions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);
CREATE TABLE public.landing_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  configuracao jsonb DEFAULT '{}'::jsonb,
  form_fields jsonb DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true,
  template_tipo text DEFAULT 'padrao'::text,
  seo_meta jsonb DEFAULT '{}'::jsonb,
  visitantes integer DEFAULT 0,
  conversoes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  published_at timestamp with time zone,
  CONSTRAINT landing_pages_pkey PRIMARY KEY (id),
  CONSTRAINT landing_pages_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid,
  nome text NOT NULL,
  conteudo text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  categoria text,
  variaveis ARRAY DEFAULT '{}'::text[],
  ativo boolean DEFAULT true,
  meta_technical_name text,
  CONSTRAINT message_templates_pkey PRIMARY KEY (id),
  CONSTRAINT message_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_type text NOT NULL,
  sender_id uuid,
  content text NOT NULL,
  message_type text DEFAULT 'text'::text,
  status text DEFAULT 'sent'::text,
  created_at timestamp with time zone DEFAULT now(),
  whatsapp_message_id text,
  attachment_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome text NOT NULL,
  email text,
  avatar_url text,
  telefone text,
  matricula text,
  role text NOT NULL DEFAULT 'agente'::text,
  ativo boolean DEFAULT true,
  created_by uuid,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  owner_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.qr_code_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL,
  contact_id uuid,
  user_agent text,
  ip_address text,
  localizacao jsonb,
  scanned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_code_scans_pkey PRIMARY KEY (id),
  CONSTRAINT qr_code_scans_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id),
  CONSTRAINT qr_code_scans_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);
CREATE TABLE public.qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL,
  dados jsonb NOT NULL,
  qr_code_url text,
  scans integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_codes_pkey PRIMARY KEY (id),
  CONSTRAINT qr_codes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id),
  CONSTRAINT system_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.ticket_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  old_status text,
  new_status text,
  old_priority text,
  new_priority text,
  old_assigned_to uuid,
  new_assigned_to uuid,
  note text,
  CONSTRAINT ticket_history_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_history_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT ticket_history_old_assigned_to_fkey FOREIGN KEY (old_assigned_to) REFERENCES public.profiles(id),
  CONSTRAINT ticket_history_new_assigned_to_fkey FOREIGN KEY (new_assigned_to) REFERENCES public.profiles(id)
);
CREATE TABLE public.ticket_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  setting_id uuid,
  destinatario_id uuid,
  evento text NOT NULL,
  mensagem text NOT NULL,
  status text DEFAULT 'enviado'::text,
  erro text,
  enviado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_notification_log_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_notif_log_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT ticket_notif_log_setting_id_fkey FOREIGN KEY (setting_id) REFERENCES public.ticket_notification_settings(id),
  CONSTRAINT ticket_notif_log_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.ticket_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  evento text NOT NULL,
  status_origem text,
  status_destino text,
  notificar_criador boolean DEFAULT true,
  notificar_responsavel boolean DEFAULT true,
  notificar_custom jsonb DEFAULT '[]'::jsonb,
  mensagem_template text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_notification_settings_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_notif_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid,
  numero integer NOT NULL DEFAULT nextval('tickets_numero_seq'::regclass),
  titulo text NOT NULL,
  descricao text,
  status text DEFAULT 'aberto'::text,
  prioridade text DEFAULT 'media'::text,
  contact_id uuid,
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT tickets_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);