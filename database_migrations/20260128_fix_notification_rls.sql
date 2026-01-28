-- Migration: Fix RLS policies for ticket_notification_settings
-- Description: Ensures Superadmins and Admins can manage notification settings correctly.

-- 1. Drop old restrictive policies
DROP POLICY IF EXISTS "Tenant Access TicketSettings" ON ticket_notification_settings;
DROP POLICY IF EXISTS "Users can view their own notification settings" ON ticket_notification_settings;
DROP POLICY IF EXISTS "Users can create notification settings" ON ticket_notification_settings;
DROP POLICY IF EXISTS "Users can update their own notification settings" ON ticket_notification_settings;
DROP POLICY IF EXISTS "Users can delete their own notification settings" ON ticket_notification_settings;

-- 2. Create new comprehensive policies

-- SELECT
CREATE POLICY "Visualizar configuracoes de notificacao" ON ticket_notification_settings
FOR SELECT
USING (
  (owner_id = get_my_owner_id()) OR
  (get_my_role() = 'superadmin'::text)
);

-- INSERT
CREATE POLICY "Criar configuracoes de notificacao" ON ticket_notification_settings
FOR INSERT
WITH CHECK (
  (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) OR
  (get_my_role() = 'superadmin'::text)
);

-- UPDATE
CREATE POLICY "Atualizar configuracoes de notificacao" ON ticket_notification_settings
FOR UPDATE
USING (
  (owner_id = get_my_owner_id()) OR
  (get_my_role() = 'superadmin'::text)
)
WITH CHECK (
  (owner_id = get_my_owner_id()) OR
  (get_my_role() = 'superadmin'::text)
);

-- DELETE
CREATE POLICY "Excluir configuracoes de notificacao" ON ticket_notification_settings
FOR DELETE
USING (
  (owner_id = get_my_owner_id()) OR
  (get_my_role() = 'superadmin'::text)
);
