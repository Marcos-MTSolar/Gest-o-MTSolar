-- =============================================================================
-- Migration: Ajustes de ponto v2 — aceite eletrônico, numeração e espelho mensal
-- Data: 2026-11-26
-- NÃO EXECUTAR AUTOMATICAMENTE — aplicar manualmente pelo gestor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Novas colunas em time_adjustments
-- ---------------------------------------------------------------------------
ALTER TABLE time_adjustments
  ADD COLUMN IF NOT EXISTS user_id           integer       REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS adjustment_type   text          CHECK (adjustment_type IN ('batida_esquecida','falha_app','correcao_horario')),
  ADD COLUMN IF NOT EXISTS reason_category   text,
  ADD COLUMN IF NOT EXISTS reason_text       text,
  ADD COLUMN IF NOT EXISTS punch_type        text          CHECK (punch_type IN ('entry','lunch_start','lunch_end','exit')),
  ADD COLUMN IF NOT EXISTS reference_date    date,
  ADD COLUMN IF NOT EXISTS requested_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS original_timestamp  timestamptz,
  ADD COLUMN IF NOT EXISTS requested_ack_at    timestamptz,
  ADD COLUMN IF NOT EXISTS ack_text_version    text,
  ADD COLUMN IF NOT EXISTS review_note         text,
  ADD COLUMN IF NOT EXISTS document_number     text;

-- Índice único parcial: um número de documento não pode repetir dentro da empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_adjustments_company_docnum
  ON time_adjustments (company_id, document_number)
  WHERE document_number IS NOT NULL;

-- Índice para consultas por usuário/data
CREATE INDEX IF NOT EXISTS idx_time_adjustments_company_user_refdate
  ON time_adjustments (company_id, user_id, reference_date);

-- ---------------------------------------------------------------------------
-- 2. Backfill: preencher user_id e reference_date nos registros antigos
-- ---------------------------------------------------------------------------
UPDATE time_adjustments adj
SET
  user_id = tr.user_id,
  reference_date = (adj.new_timestamp AT TIME ZONE 'America/Recife')::date
FROM time_records tr
WHERE adj.time_record_id = tr.id
  AND adj.user_id IS NULL
  AND adj.new_timestamp IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Novas colunas em time_records
-- ---------------------------------------------------------------------------
ALTER TABLE time_records
  ADD COLUMN IF NOT EXISTS source              text    DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS original_timestamp  timestamptz,
  ADD COLUMN IF NOT EXISTS adjustment_id       integer;

-- ---------------------------------------------------------------------------
-- 4. Contador sequencial de ajustes por empresa/ano
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adjustment_sequence (
  company_id  uuid    NOT NULL,
  year        integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, year)
);

-- Função SQL de upsert atômico — retorna próximo número formatado AJ-AAAA-000123
CREATE OR REPLACE FUNCTION next_adjustment_number(p_company_id uuid, p_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO adjustment_sequence (company_id, year, last_number)
  VALUES (p_company_id, p_year, 1)
  ON CONFLICT (company_id, year)
  DO UPDATE SET last_number = adjustment_sequence.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'AJ-' || p_year::text || '-' || LPAD(v_next::text, 6, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Tabela de espelhos mensais assinados
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ponto_monthly_documents (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid          NOT NULL,
  user_id       integer       NOT NULL REFERENCES users(id),
  year_month    text          NOT NULL,  -- formato 'YYYY-MM'
  document_path text          NOT NULL,  -- caminho privado no R2
  uploaded_by   integer       REFERENCES users(id),
  uploaded_at   timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, year_month)
);

-- RLS habilitado, sem políticas (acesso apenas via service_role no backend)
ALTER TABLE ponto_monthly_documents ENABLE ROW LEVEL SECURITY;
