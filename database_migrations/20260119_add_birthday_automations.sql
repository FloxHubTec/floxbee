-- ============================================
-- MIGRATION CORRIGIDA: Birthday Automation
-- Data: 19/01/2026
-- ADAPTADO AO SCHEMA EXISTENTE
-- ============================================

-- ============================================
-- 1. VERIFICAR SE data_nascimento JÁ EXISTE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'data_nascimento'
  ) THEN
    ALTER TABLE contacts ADD COLUMN data_nascimento date;
    RAISE NOTICE 'Campo data_nascimento adicionado à tabela contacts';
  ELSE
    RAISE NOTICE 'Campo data_nascimento já existe - OK!';
  END IF;
END $$;

-- Criar índice para queries de aniversário
CREATE INDEX IF NOT EXISTS idx_contacts_birthday_month_day 
ON contacts (
  EXTRACT(MONTH FROM data_nascimento), 
  EXTRACT(DAY FROM data_nascimento)
) 
WHERE data_nascimento IS NOT NULL AND ativo = true;

-- ============================================
-- 2. HELPER FUNCTIONS PARA ANIVERSÁRIOS
-- ============================================

-- Função para buscar aniversariantes de hoje
CREATE OR REPLACE FUNCTION get_todays_birthdays()
RETURNS TABLE (
  id uuid,
  nome text,
  whatsapp text,
  data_nascimento date,
  idade integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nome,
    c.whatsapp,
    c.data_nascimento,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.data_nascimento))::integer AS idade
  FROM contacts c
  WHERE c.ativo = true
    AND c.data_nascimento IS NOT NULL
    AND EXTRACT(MONTH FROM c.data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM c.data_nascimento) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar próximos aniversários (N dias)
CREATE OR REPLACE FUNCTION get_upcoming_birthdays(days_ahead integer DEFAULT 7)
RETURNS TABLE (
  id uuid,
  nome text,
  whatsapp text,
  data_nascimento date,
  dias_restantes integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nome,
    c.whatsapp,
    c.data_nascimento,
    (
      CASE 
        WHEN (EXTRACT(MONTH FROM c.data_nascimento) * 100 + EXTRACT(DAY FROM c.data_nascimento))
             >= (EXTRACT(MONTH FROM CURRENT_DATE) * 100 + EXTRACT(DAY FROM CURRENT_DATE))
        THEN 
          DATE_PART('day', 
            MAKE_DATE(
              EXTRACT(YEAR FROM CURRENT_DATE)::integer,
              EXTRACT(MONTH FROM c.data_nascimento)::integer,
              EXTRACT(DAY FROM c.data_nascimento)::integer
            ) - CURRENT_DATE
          )::integer
        ELSE
          DATE_PART('day', 
            MAKE_DATE(
              EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1,
              EXTRACT(MONTH FROM c.data_nascimento)::integer,
              EXTRACT(DAY FROM c.data_nascimento)::integer
            ) - CURRENT_DATE
          )::integer
      END
    ) AS dias_restantes
  FROM contacts c
  WHERE c.ativo = true
    AND c.data_nascimento IS NOT NULL
    AND (
      CASE 
        WHEN (EXTRACT(MONTH FROM c.data_nascimento) * 100 + EXTRACT(DAY FROM c.data_nascimento))
             >= (EXTRACT(MONTH FROM CURRENT_DATE) * 100 + EXTRACT(DAY FROM CURRENT_DATE))
        THEN 
          DATE_PART('day', 
            MAKE_DATE(
              EXTRACT(YEAR FROM CURRENT_DATE)::integer,
              EXTRACT(MONTH FROM c.data_nascimento)::integer,
              EXTRACT(DAY FROM c.data_nascimento)::integer
            ) - CURRENT_DATE
          )::integer
        ELSE
          DATE_PART('day', 
            MAKE_DATE(
              EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1,
              EXTRACT(MONTH FROM c.data_nascimento)::integer,
              EXTRACT(DAY FROM c.data_nascimento)::integer
            ) - CURRENT_DATE
          )::integer
      END
    ) <= days_ahead
  ORDER BY dias_restantes ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. INSERIR REGRA DE ANIVERSÁRIO PADRÃO
-- ============================================

-- Verificar se já existe regra de aniversário
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM automation_rules WHERE tipo = 'birthday'
  ) THEN
    INSERT INTO automation_rules (nome, tipo, config, ativo)
    VALUES (
      'Mensagem de Aniversário Padrão',
      'birthday',
      '{"type": "birthday", "days_before": 0}'::jsonb,
      true
    );
    RAISE NOTICE 'Regra de aniversário padrão criada';
  ELSE
    RAISE NOTICE 'Já existe regra de aniversário - OK!';
  END IF;
END $$;

-- Verificar se já existe regra de boas-vindas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM automation_rules WHERE tipo = 'welcome'
  ) THEN
    INSERT INTO automation_rules (nome, tipo, config, ativo)
    VALUES (
      'Boas-vindas Automática',
      'welcome',
      '{"type": "new_contact"}'::jsonb,
      true
    );
    RAISE NOTICE 'Regra de boas-vindas padrão criada';
  ELSE
    RAISE NOTICE 'Já existe regra de boas-vindas - OK!';
  END IF;
END $$;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_todays_birthdays() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_upcoming_birthdays(integer) TO authenticated, anon;

-- ============================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN contacts.data_nascimento IS 'Data de nascimento do contato para automação de mensagens de aniversário';
COMMENT ON FUNCTION get_todays_birthdays() IS 'Retorna lista de contatos com aniversário hoje';
COMMENT ON FUNCTION get_upcoming_birthdays(integer) IS 'Retorna lista de contatos com aniversário nos próximos N dias';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration executada com sucesso!';
  RAISE NOTICE '✅ Campo data_nascimento verificado/criado';
  RAISE NOTICE '✅ Índice de aniversários criado';
  RAISE NOTICE '✅ Funções RPC criadas';
  RAISE NOTICE '✅ Regras padrão inseridas';
  RAISE NOTICE '';
  RAISE NOTICE '🎂 Sistema de aniversários pronto para uso!';
END $$;
