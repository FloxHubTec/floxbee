-- ============================================
-- SCRIPT DE VERIFICAÇÃO RÁPIDA
-- Execute DEPOIS da migration principal
-- ============================================

-- 1. Verificar campo data_nascimento
SELECT 
  'data_nascimento field' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'contacts' AND column_name = 'data_nascimento'
    ) THEN '✅ OK' 
    ELSE '❌ FAILED' 
  END as status;

-- 2. Verificar tabelas
SELECT 
  'automation_rules table' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'automation_rules')
    THEN '✅ OK' 
    ELSE '❌ FAILED' 
  END as status
UNION ALL
SELECT 
  'automation_logs table',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'automation_logs')
    THEN '✅ OK' 
    ELSE '❌ FAILED' 
  END;

-- 3. Verificar funções
SELECT 
  'get_todays_birthdays()' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'get_todays_birthdays'
    ) THEN '✅ OK' 
    ELSE '❌ FAILED' 
  END as status
UNION ALL
SELECT 
  'get_upcoming_birthdays()',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'get_upcoming_birthdays'
    ) THEN '✅ OK' 
    ELSE '❌ FAILED' 
  END;

-- 4. Verificar regras padrão
SELECT 
  'Default automation rules' as check_item,
  CASE 
    WHEN (SELECT count(*) FROM automation_rules) >= 2 
    THEN '✅ OK (' || (SELECT count(*) FROM automation_rules) || ' rules)'
    ELSE '❌ FAILED (only ' || (SELECT count(*) FROM automation_rules) || ' rules)'
  END as status;

-- 5. Verificar RLS policies
SELECT 
  'RLS policies for automation_rules' as check_item,
  CASE 
    WHEN (SELECT count(*) FROM pg_policies WHERE tablename = 'automation_rules') >= 4
    THEN '✅ OK (' || (SELECT count(*) FROM pg_policies WHERE tablename = 'automation_rules') || ' policies)'
    ELSE '⚠️  Warning (only ' || (SELECT count(*) FROM pg_policies WHERE tablename = 'automation_rules') || ' policies)'
  END as status;

-- ============================================
-- RESUMO FINAL
-- ============================================
SELECT 
  '🎉 MIGRATION STATUS' as summary,
  CASE 
    WHEN (
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'data_nascimento')
      AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'automation_rules')
      AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'automation_logs')
      AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_todays_birthdays')
      AND (SELECT count(*) FROM automation_rules) >= 2
    ) THEN '✅ ALL CHECKS PASSED! Migration successful!'
    ELSE '❌ Some checks failed. Review errors above.'
  END as result;
