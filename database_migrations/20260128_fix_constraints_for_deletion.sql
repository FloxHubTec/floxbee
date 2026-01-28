-- Migration: Fix foreign key constraints for safe user deletion
-- Description: Adds ON DELETE CASCADE to profiles.user_id and dependent tables to allow complete cleanup.

-- 1. Fix profiles -> auth.users
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Ensure profiles self-references are handled (Set null instead of blocking)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_created_by_fkey,
ADD CONSTRAINT profiles_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Update dependent tables to CASCADE when an owner (Admin) is deleted
-- We only do this for tables where the user requested "excluir tudo vinculado"

DO $$
BEGIN
    -- Contacts
    ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_owner_id_fkey;
    ALTER TABLE public.contacts ADD CONSTRAINT contacts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Message Templates
    ALTER TABLE public.message_templates DROP CONSTRAINT IF EXISTS message_templates_owner_id_fkey;
    ALTER TABLE public.message_templates ADD CONSTRAINT message_templates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Campaigns
    ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_owner_id_fkey;
    ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Conversations
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_owner_id_fkey;
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Tickets
    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_owner_id_fkey;
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- System Settings
    ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_owner_id_fkey;
    ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Integrations
    ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_owner_id_fkey;
    ALTER TABLE public.integrations ADD CONSTRAINT integrations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Landing Pages
    ALTER TABLE public.landing_pages DROP CONSTRAINT IF EXISTS landing_pages_owner_id_fkey;
    ALTER TABLE public.landing_pages ADD CONSTRAINT landing_pages_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- QR Codes
    ALTER TABLE public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_owner_id_fkey;
    ALTER TABLE public.qr_codes ADD CONSTRAINT qr_codes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Departments
    ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_owner_id_fkey;
    ALTER TABLE public.departments ADD CONSTRAINT departments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Automation Rules
    ALTER TABLE public.automation_rules DROP CONSTRAINT IF EXISTS automation_rules_owner_id_fkey;
    ALTER TABLE public.automation_rules ADD CONSTRAINT automation_rules_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Ticket Notification Settings
    ALTER TABLE public.ticket_notification_settings DROP CONSTRAINT IF EXISTS ticket_notification_settings_owner_id_fkey;
    ALTER TABLE public.ticket_notification_settings ADD CONSTRAINT ticket_notification_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Automation Logs
    ALTER TABLE public.automation_logs DROP CONSTRAINT IF EXISTS automation_logs_owner_id_fkey;
    ALTER TABLE public.automation_logs ADD CONSTRAINT automation_logs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

END $$;
