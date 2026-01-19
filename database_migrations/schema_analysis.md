# Análise de Schema - Comparação e Problemas Encontrados

**Data:** 19/01/2026  
**Objetivo:** Verificar compatibilidade entre migration criada e schema existente

---

## ⚠️ PROBLEMAS ENCONTRADOS

### 1. Tabela `automation_rules` - INCOMPATÍVEL

**Schema Existente:**
```sql
- id
- created_by (FK → profiles)
- nome
- tipo
- config (jsonb)
- ativo
- created_at
```

**Migration Criada:**
```sql
- id
- owner_id (FK → profiles)     ❌ DIFERENTE! Deveria ser created_by
- nome
- descricao                     ❌ NOVO! Não existe no schema
- ativo
- tipo
- trigger_config (jsonb)        ❌ DIFERENTE! Deveria ser config
- mensagem                      ❌ NOVO! Não existe no schema
- template_id                   ❌ NOVO! Não existe no schema
- created_at
- updated_at                    ❌ NOVO! Não existe no schema
```

**CONCLUSÃO:** ❌ Precisa atualizar migration para usar schema existente

---

### 2. Tabela `automation_logs` - PARCIALMENTE COMPATÍVEL

**Schema Existente:**
```sql
- id
- rule_id (FK → automation_rules)
- contact_id (FK → contacts)
- status
- detalhes (jsonb)
- created_at
```

**Migration Criada:**
```sql
- id
- rule_id
- contact_id
- status
- mensagem_enviada              ❌ NOVO! Não existe no schema
- erro                          ❌ NOVO! Não existe no schema
- detalhes (jsonb)              ✅ OK
- created_at
```

**CONCLUSÃO:** ⚠️ Pode usar, mas `mensagem_enviada` e `erro` devem ir dentro de `detalhes` (jsonb)

---

### 3. Tabela `contacts` - ✅ OK

**Schema Existente:**
```sql
- data_nascimento (date)        ✅ CAMPO JÁ EXISTE!
```

**CONCLUSÃO:** ✅ Campo `data_nascimento` JÁ ESTÁ NO BANCO!

---

## 🔧 AÇÕES NECESSÁRIAS

### Opção 1: Adaptar aos Schemas Existentes (RECOMENDADO)

As tabelas `automation_rules` e `automation_logs` **já existem** no banco!

Precisamos:
1. ✅ **NÃO criar tabelas** - elas já existem
2. ✅ **Adaptar hooks** para usar campos existentes
3. ✅ **Atualizar código** para usar `config` em vez de `trigger_config`

---

### Opção 2: Adicionar Colunas Faltantes

Adicionar apenas os campos que faltam:
```sql
ALTER TABLE automation_rules 
  ADD COLUMN IF NOT EXISTS mensagem text,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES message_templates(id),
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE automation_logs
  ADD COLUMN IF NOT EXISTS mensagem_enviada text,
  ADD COLUMN IF NOT EXISTS erro text;
```

---

## ✅ RECOMENDAÇÃO FINAL

**USAR SCHEMAS EXISTENTES!**

1. ✅ Campo `data_nascimento` já existe em `contacts` - OK!
2. ✅ Tabelas `automation_rules` e `automation_logs` já existem
3. ✅ Adaptar hooks para usar campos corretos:
   - `owner_id` → `created_by`
   - `trigger_config` → `config`
   - Guardar `mensagem` e `erro` dentro de `detalhes` (jsonb)

---

## 📋 CHECKLIST DE CORREÇÕES

- [ ] Atualizar `useAutomations.tsx` para usar `created_by`
- [ ] Atualizar para usar `config` em vez de `trigger_config`
- [ ] Atualizar `automation_logs` para guardar dados em `detalhes`
- [ ] Remover criação de tabelas da migration
- [ ] Manter apenas criação de RPC functions
- [ ] Adicionar scroll no ContactForm
