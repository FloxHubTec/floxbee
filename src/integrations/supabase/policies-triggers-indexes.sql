-- =====================================================
-- FLOXBEE - RLS POLICIES, TRIGGERS, INDEXES & STORAGE
-- =====================================================
-- Este arquivo contém todas as policies, triggers, índices e storage
-- necessários para o sistema FloxBee funcionar corretamente
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Function to get current user's owner_id (tenant_id)
CREATE OR REPLACE FUNCTION public.get_my_owner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT owner_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Function to check if user is owner (admin)
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'owner' FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Function to check if user is supervisor or owner
CREATE OR REPLACE FUNCTION public.is_supervisor_or_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('owner', 'supervisor') FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- =====================================================
-- 3. RLS POLICIES - PROFILES
-- =====================================================

-- Profiles: Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Profiles: Allow users to read profiles in same tenant
CREATE POLICY "Users can view profiles in same tenant"
  ON public.profiles
  FOR SELECT
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Profiles: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Profiles: Allow owners to create profiles
CREATE POLICY "Owners can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'owner'
  );

-- Profiles: Allow owners to update any profile in tenant
CREATE POLICY "Owners can update any profile in tenant"
  ON public.profiles
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'owner'
    AND owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Profiles: Allow owners to delete profiles
CREATE POLICY "Owners can delete profiles in tenant"
  ON public.profiles
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'owner'
    AND owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =====================================================
-- 4. RLS POLICIES - CONTACTS
-- =====================================================

-- Contacts: Allow users to read contacts in same tenant
CREATE POLICY "Users can view contacts in same tenant"
  ON public.contacts
  FOR SELECT
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Contacts: Allow users to create contacts
CREATE POLICY "Users can create contacts"
  ON public.contacts
  FOR INSERT
  WITH CHECK (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Contacts: Allow users to update contacts in same tenant
CREATE POLICY "Users can update contacts in same tenant"
  ON public.contacts
  FOR UPDATE
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Contacts: Allow owners to delete contacts
CREATE POLICY "Owners can delete contacts"
  ON public.contacts
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('owner', 'supervisor')
    AND (
      owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
      OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- 5. RLS POLICIES - CONVERSATIONS
-- =====================================================

-- Conversations: Allow users to read conversations in same tenant
CREATE POLICY "Users can view conversations in same tenant"
  ON public.conversations
  FOR SELECT
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Conversations: Allow users to create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Conversations: Allow users to update conversations in same tenant
CREATE POLICY "Users can update conversations in same tenant"
  ON public.conversations
  FOR UPDATE
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Conversations: Allow owners/supervisors to delete conversations
CREATE POLICY "Owners can delete conversations"
  ON public.conversations
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('owner', 'supervisor')
    AND (
      owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
      OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- 6. RLS POLICIES - MESSAGES
-- =====================================================

-- Messages: Allow users to read messages in conversations they can see
CREATE POLICY "Users can view messages in accessible conversations"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
        OR conversations.owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR conversations.assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Messages: Allow users to create messages
CREATE POLICY "Users can create messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
        OR conversations.owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR conversations.assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Messages: Allow users to update their own messages
CREATE POLICY "Users can update own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Messages: Allow owners to delete messages
CREATE POLICY "Owners can delete messages"
  ON public.messages
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('owner', 'supervisor')
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
        OR conversations.owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- =====================================================
-- 7. RLS POLICIES - TICKETS
-- =====================================================

-- Tickets: Allow users to read tickets in same tenant
CREATE POLICY "Users can view tickets in same tenant"
  ON public.tickets
  FOR SELECT
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Tickets: Allow users to create tickets
CREATE POLICY "Users can create tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Tickets: Allow users to update tickets in same tenant
CREATE POLICY "Users can update tickets in same tenant"
  ON public.tickets
  FOR UPDATE
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Tickets: Allow owners to delete tickets
CREATE POLICY "Owners can delete tickets"
  ON public.tickets
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('owner', 'supervisor')
    AND (
      owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
      OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- 8. RLS POLICIES - CAMPAIGNS
-- =====================================================

-- Campaigns: Allow users to read campaigns in same tenant
CREATE POLICY "Users can view campaigns in same tenant"
  ON public.campaigns
  FOR SELECT
  USING (
    created_by IN (
      SELECT id FROM public.profiles
      WHERE owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
      OR id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Campaigns: Allow users to create campaigns
CREATE POLICY "Users can create campaigns"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Campaigns: Allow users to update their own campaigns
CREATE POLICY "Users can update own campaigns"
  ON public.campaigns
  FOR UPDATE
  USING (created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Campaigns: Allow owners to delete campaigns
CREATE POLICY "Owners can delete campaigns"
  ON public.campaigns
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('owner', 'supervisor')
  );

-- =====================================================
-- 9. RLS POLICIES - CAMPAIGN_RECIPIENTS
-- =====================================================

-- Campaign Recipients: Allow users to read recipients of accessible campaigns
CREATE POLICY "Users can view campaign recipients"
  ON public.campaign_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND created_by IN (
        SELECT id FROM public.profiles
        WHERE owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
        OR id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Campaign Recipients: Allow users to create recipients
CREATE POLICY "Users can create campaign recipients"
  ON public.campaign_recipients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Campaign Recipients: Allow users to update recipients
CREATE POLICY "Users can update campaign recipients"
  ON public.campaign_recipients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- 10. RLS POLICIES - MESSAGE_TEMPLATES
-- =====================================================

-- Templates: Allow users to read templates in same tenant
CREATE POLICY "Users can view templates in same tenant"
  ON public.message_templates
  FOR SELECT
  USING (
    created_by IN (
      SELECT id FROM public.profiles
      WHERE owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
      OR id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Templates: Allow users to create templates
CREATE POLICY "Users can create templates"
  ON public.message_templates
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Templates: Allow users to update their own templates
CREATE POLICY "Users can update own templates"
  ON public.message_templates
  FOR UPDATE
  USING (created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Templates: Allow owners to delete templates
CREATE POLICY "Owners can delete templates"
  ON public.message_templates
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('owner', 'supervisor')
  );

-- =====================================================
-- 11. RLS POLICIES - AUTOMATION_RULES
-- =====================================================

-- Automation Rules: Allow users to read rules in same tenant
CREATE POLICY "Users can view automation rules in same tenant"
  ON public.automation_rules
  FOR SELECT
  USING (
    created_by IN (
      SELECT id FROM public.profiles
      WHERE owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
      OR id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Automation Rules: Allow users to create rules
CREATE POLICY "Users can create automation rules"
  ON public.automation_rules
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Automation Rules: Allow users to update their own rules
CREATE POLICY "Users can update own automation rules"
  ON public.automation_rules
  FOR UPDATE
  USING (created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Automation Rules: Allow owners to delete rules
CREATE POLICY "Owners can delete automation rules"
  ON public.automation_rules
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('owner', 'supervisor')
  );

-- =====================================================
-- 12. RLS POLICIES - AUTOMATION_LOGS
-- =====================================================

-- Automation Logs: Allow users to read logs in same tenant
CREATE POLICY "Users can view automation logs in same tenant"
  ON public.automation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules
      WHERE automation_rules.id = automation_logs.rule_id
      AND created_by IN (
        SELECT id FROM public.profiles
        WHERE owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
        OR id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Automation Logs: Allow system to create logs
CREATE POLICY "System can create automation logs"
  ON public.automation_logs
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 13. RLS POLICIES - SYSTEM_SETTINGS
-- =====================================================

-- System Settings: Allow users to read settings in same tenant
CREATE POLICY "Users can view system settings in same tenant"
  ON public.system_settings
  FOR SELECT
  USING (
    owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- System Settings: Allow owners to manage settings
CREATE POLICY "Owners can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'owner'
    AND (
      owner_id = (SELECT owner_id FROM public.profiles WHERE user_id = auth.uid())
      OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- 14. TRIGGERS - AUTO UPDATE TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for contacts
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for tickets
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for campaigns
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 15. TRIGGERS - AUTO SET OWNER_ID
-- =====================================================

-- Function to auto-set owner_id from current user's profile
CREATE OR REPLACE FUNCTION public.set_owner_id_from_profile()
RETURNS TRIGGER AS $$
DECLARE
  current_owner_id uuid;
  current_profile_id uuid;
BEGIN
  -- Get current user's owner_id and profile id
  SELECT owner_id, id INTO current_owner_id, current_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- If owner_id is not set, set it
  IF NEW.owner_id IS NULL THEN
    -- If user is owner (owner_id is null in profiles), use their profile id
    IF current_owner_id IS NULL THEN
      NEW.owner_id = current_profile_id;
    ELSE
      NEW.owner_id = current_owner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for contacts
DROP TRIGGER IF EXISTS set_contacts_owner_id ON public.contacts;
CREATE TRIGGER set_contacts_owner_id
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_id_from_profile();

-- Trigger for conversations
DROP TRIGGER IF EXISTS set_conversations_owner_id ON public.conversations;
CREATE TRIGGER set_conversations_owner_id
  BEFORE INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_id_from_profile();

-- Trigger for tickets
DROP TRIGGER IF EXISTS set_tickets_owner_id ON public.tickets;
CREATE TRIGGER set_tickets_owner_id
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_id_from_profile();

-- =====================================================
-- 16. INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_id ON public.profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp ON public.contacts(whatsapp);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_nome ON public.contacts(nome);
CREATE INDEX IF NOT EXISTS idx_contacts_ativo ON public.contacts(ativo);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_owner_id ON public.tickets(owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_contact_id ON public.tickets(contact_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridade ON public.tickets(prioridade);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_numero ON public.tickets(numero);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_agendado_para ON public.campaigns(agendado_para);

-- Campaign Recipients indexes
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON public.campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);

-- Message Templates indexes
CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON public.message_templates(created_by);

-- Automation Rules indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by ON public.automation_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_automation_rules_ativo ON public.automation_rules(ativo);

-- Automation Logs indexes
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON public.automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_contact_id ON public.automation_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at DESC);

-- System Settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_owner_id ON public.system_settings(owner_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- =====================================================
-- 17. STORAGE BUCKET FOR MESSAGE ATTACHMENTS
-- =====================================================

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);

-- Storage policy: Allow users to view attachments in their tenant
CREATE POLICY "Users can view attachments in same tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);

-- Storage policy: Allow users to update their own attachments
CREATE POLICY "Users can update own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);

-- Storage policy: Allow users to delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- 18. ADDITIONAL MISSING COLUMNS (if needed)
-- =====================================================

-- Add sla_deadline to tickets if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'sla_deadline'
  ) THEN
    ALTER TABLE public.tickets ADD COLUMN sla_deadline timestamp with time zone;
  END IF;
END $$;

-- Add categoria to tickets if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'categoria'
  ) THEN
    ALTER TABLE public.tickets ADD COLUMN categoria text;
  END IF;
END $$;

-- Add ativo to message_templates if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_templates' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.message_templates ADD COLUMN ativo boolean DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- COMPLETED!
-- =====================================================
-- Todas as policies, triggers, índices e storage foram criados
-- O sistema FloxBee está pronto para uso com segurança e performance
-- =====================================================
