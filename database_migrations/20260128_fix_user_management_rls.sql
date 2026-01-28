-- Migration: Allow admin and superadmin to manage users they created
-- Description: Updates RLS policies on 'profiles' table to allow role-based management.

-- 1. Drop existing update policy if it exists (Optional, mostly for clean state)
DROP POLICY IF EXISTS "Editar próprio perfil" ON profiles;

-- 2. Create updated UPDATE policy
-- Allows users to edit their own profile OR admins/superadmins to edit profiles they created.
CREATE POLICY "Gerenciar perfis" ON profiles
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  (get_my_role() = 'superadmin'::text) OR 
  (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()))
)
WITH CHECK (
  -- Superadmin pode tudo
  (get_my_role() = 'superadmin'::text) OR
  (
    -- Dono ou Criador podem editar
    ((auth.uid() = user_id) OR (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())))
    AND
    -- RESTRICÃO: Só superadmin pode mudar de inativo para ativo
    NOT (
      ativo IS TRUE AND 
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = profiles.id AND p.ativo IS FALSE)
    )
  )
);

-- 3. (Optional) Ensure DELETE is also allowed for creators
CREATE POLICY "Excluir perfis criados" ON profiles
FOR DELETE
USING (
  (get_my_role() = 'superadmin'::text) OR 
  (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- 4. Verify existing SELECT policy
-- The current SELECT policy "Ver colegas de trabalho" already allows seeing profiles based on role/owner_id.
-- However, we might want to restrict it even further if the user's "só preciso ver" is a strict privacy requirement.
-- For now, we will stick to UI filtering to avoid breaking other parts of the system that might rely on seeing colleagues.
