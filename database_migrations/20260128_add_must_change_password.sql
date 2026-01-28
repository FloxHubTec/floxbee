-- Migration: Add must_change_password column to profiles
-- Description: Adds the missing column required for enforcing password changes on first login.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Optional: Update existing users if they were recently created and should have this flag
-- For now, we'll keep them as false to avoid forcing current users to change passwords unless they are new.
