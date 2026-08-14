-- =============================================================================
-- Migration: Expansão do módulo de Ponto Eletrônico
-- Data: 2026-08-14
-- Projeto: Gestão MTSolar
-- Descrição: Cria 4 tabelas de fundação para suporte a feriados, atestados
--            médicos, folgas/compensações e banco de horas.
--            Este script é IDEMPOTENTE (usa IF NOT EXISTS em todas as criações).
--            RLS habilitada em todas as tabelas seguindo o padrão do projeto.
-- =============================================================================

-- Habilita extensão UUID caso ainda não esteja habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABELA 1: holidays (Feriados da empresa)
-- Armazena feriados nacionais, estaduais e municipais por empresa.
-- recurring = TRUE para feriados fixos (25/12, 01/01 etc.)
-- recurring = FALSE para feriados móveis (Carnaval, Corpus Christi etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.holidays (
  id          SERIAL PRIMARY KEY,
  company_id  UUID    NOT NULL,
  date        DATE    NOT NULL,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'nacional'
                CHECK (type IN ('nacional', 'estadual', 'municipal')),
  recurring   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Não permite dois feriados na mesma data para a mesma empresa
  UNIQUE (company_id, date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_holidays_company_id       ON public.holidays (company_id);
CREATE INDEX IF NOT EXISTS idx_holidays_company_date     ON public.holidays (company_id, date);
CREATE INDEX IF NOT EXISTS idx_holidays_company_year     ON public.holidays (company_id, EXTRACT(YEAR FROM date));

-- Habilita Row Level Security
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS: CEO e ADMIN têm acesso total à própria empresa
CREATE POLICY "holidays_ceo_adm_all"
  ON public.holidays
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  );

-- RLS: Todos os funcionários autenticados podem ler feriados da própria empresa
CREATE POLICY "holidays_all_select"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() ->> 'company_id')::UUID
  );

-- =============================================================================
-- TABELA 2: medical_certificates (Atestados Médicos)
-- Armazena atestados médicos de funcionários, com link para documento no R2.
-- end_date = start_date + days_off (gravado explicitamente para facilitar queries)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.medical_certificates (
  id            SERIAL PRIMARY KEY,
  company_id    UUID    NOT NULL,
  user_id       INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_url  TEXT,
  document_path TEXT,
  cid           TEXT,
  start_date    DATE    NOT NULL,
  days_off      INTEGER NOT NULL CHECK (days_off > 0),
  end_date      DATE    NOT NULL,
  notes         TEXT,
  uploaded_by   INTEGER REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_medcert_company_id     ON public.medical_certificates (company_id);
CREATE INDEX IF NOT EXISTS idx_medcert_user_id        ON public.medical_certificates (user_id);
CREATE INDEX IF NOT EXISTS idx_medcert_company_user   ON public.medical_certificates (company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_medcert_dates          ON public.medical_certificates (company_id, start_date, end_date);

-- Habilita Row Level Security
ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;

-- RLS: CEO e ADMIN têm acesso total à própria empresa
CREATE POLICY "medcert_ceo_adm_all"
  ON public.medical_certificates
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  );

-- RLS: Funcionários podem ver seus próprios atestados
CREATE POLICY "medcert_own_select"
  ON public.medical_certificates
  FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() ->> 'company_id')::UUID
    AND user_id = (auth.jwt() ->> 'id')::INTEGER
  );

-- =============================================================================
-- TABELA 3: time_off_requests (Solicitações de Folga e Compensação)
-- Fluxo de aprovação: pending → approved / rejected
-- Tipos:
--   folga_abate_banco    — folga que desconta horas do banco positivo
--   compensacao_horas    — hora extra ou trabalho em FDS/feriado para compensação futura
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id            SERIAL PRIMARY KEY,
  company_id    UUID    NOT NULL,
  user_id       INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date          DATE    NOT NULL,
  type          TEXT    NOT NULL
                  CHECK (type IN ('folga_abate_banco', 'compensacao_horas')),
  hours         NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  status        TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by  INTEGER NOT NULL REFERENCES public.users(id),
  approved_by   INTEGER REFERENCES public.users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_timeoff_company_id     ON public.time_off_requests (company_id);
CREATE INDEX IF NOT EXISTS idx_timeoff_user_id        ON public.time_off_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_timeoff_company_status ON public.time_off_requests (company_id, status);
CREATE INDEX IF NOT EXISTS idx_timeoff_company_date   ON public.time_off_requests (company_id, date);

-- Habilita Row Level Security
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- RLS: CEO e ADMIN têm acesso total à própria empresa
CREATE POLICY "timeoff_ceo_adm_all"
  ON public.time_off_requests
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  );

-- RLS: Funcionários podem ver e criar suas próprias solicitações
CREATE POLICY "timeoff_own_select"
  ON public.time_off_requests
  FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() ->> 'company_id')::UUID
    AND user_id = (auth.jwt() ->> 'id')::INTEGER
  );

CREATE POLICY "timeoff_own_insert"
  ON public.time_off_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (auth.jwt() ->> 'company_id')::UUID
    AND user_id = (auth.jwt() ->> 'id')::INTEGER
    AND requested_by = (auth.jwt() ->> 'id')::INTEGER
  );

-- =============================================================================
-- TABELA 4: hour_bank (Banco de Horas — Livro-Razão de Créditos e Débitos)
-- Cada linha é um lançamento. Saldo = SUM(hours) por usuário.
-- hours positivo = crédito (hora extra, compensação recebida)
-- hours negativo = débito (falta, folga abatida)
-- multiplier = fator CLT aplicado (1.0 = normal, 1.5 = +50%, 2.0 = +100%)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hour_bank (
  id              SERIAL PRIMARY KEY,
  company_id      UUID    NOT NULL,
  user_id         INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reference_date  DATE    NOT NULL,
  hours           NUMERIC(6,2) NOT NULL,
  type            TEXT    NOT NULL
                    CHECK (type IN (
                      'hora_extra_normal',
                      'hora_extra_fds_feriado',
                      'falta',
                      'folga_abatida',
                      'compensacao',
                      'ajuste_manual',
                      'atestado_abonado',
                      'feriado_abonado'
                    )),
  multiplier      NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  description     TEXT,
  time_record_id  INTEGER REFERENCES public.time_records(id) ON DELETE SET NULL,
  created_by      INTEGER REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hourbank_company_id     ON public.hour_bank (company_id);
CREATE INDEX IF NOT EXISTS idx_hourbank_user_id        ON public.hour_bank (user_id);
CREATE INDEX IF NOT EXISTS idx_hourbank_company_user   ON public.hour_bank (company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_hourbank_ref_date       ON public.hour_bank (company_id, user_id, reference_date);

-- Habilita Row Level Security
ALTER TABLE public.hour_bank ENABLE ROW LEVEL SECURITY;

-- RLS: CEO e ADMIN têm acesso total (lançamentos manuais, consulta de todos)
CREATE POLICY "hourbank_ceo_adm_all"
  ON public.hour_bank
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('CEO', 'ADMIN')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
  );

-- RLS: Funcionários podem ver apenas seus próprios lançamentos
CREATE POLICY "hourbank_own_select"
  ON public.hour_bank
  FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() ->> 'company_id')::UUID
    AND user_id = (auth.jwt() ->> 'id')::INTEGER
  );

-- =============================================================================
-- Atualiza o schema cache do PostgREST (Supabase)
-- Faz o PostgREST reconhecer as novas tabelas imediatamente sem reiniciar.
-- =============================================================================
NOTIFY pgrst, 'reload schema';
