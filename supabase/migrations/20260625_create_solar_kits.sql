-- =============================================================================
-- Migration: Criação da tabela solar_kits
-- Data: 2026-06-25
-- Projeto: Gestão MTSolar
-- Descrição: Tabela para gerenciamento de kits solares cadastrados por empresa.
--            Suporta multi-tenancy via company_id, soft-delete via campo ativo,
--            e RLS restrita por role de usuário.
-- =============================================================================

-- Habilita extensão UUID caso ainda não esteja habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cria a tabela solar_kits
CREATE TABLE IF NOT EXISTS public.solar_kits (
  id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Multi-tenancy (UUID: padrão da tabela companies no Supabase)
  company_id                     UUID NOT NULL,

  -- Dados gerais do kit
  potencia_kwp              NUMERIC(10, 3) NOT NULL DEFAULT 0,
  consumo_referencia_kwh    NUMERIC(10,2)           DEFAULT NULL,
  valor_total                    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  margem_venda                   NUMERIC(5, 2)  NOT NULL DEFAULT 30,

  -- Módulos fotovoltaicos
  quantidade_modulos             INTEGER        NOT NULL DEFAULT 0,
  potencia_modulo_w              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  marca_modulo                   TEXT           NOT NULL DEFAULT '',

  -- Inversor principal
  quantidade_inversores          INTEGER        NOT NULL DEFAULT 1,
  potencia_inversor_kw           NUMERIC(10, 3) NOT NULL DEFAULT 0,
  marca_inversor                 TEXT           NOT NULL DEFAULT '',

  -- Inversor de ampliação (opcional)
  inversor_ampliacao             BOOLEAN        NOT NULL DEFAULT FALSE,
  potencia_inversor_ampliacao_kw NUMERIC(10, 3)          DEFAULT NULL,
  marca_inversor_ampliacao       TEXT                     DEFAULT NULL,

  -- Status e auditoria
  ativo                          BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at                     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Índices para performance nas queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_solar_kits_company_id ON public.solar_kits (company_id);
CREATE INDEX IF NOT EXISTS idx_solar_kits_company_ativo ON public.solar_kits (company_id, ativo);
CREATE INDEX IF NOT EXISTS idx_solar_kits_potencia ON public.solar_kits (potencia_kwp);

-- Habilita Row Level Security
ALTER TABLE public.solar_kits ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Políticas RLS
-- Observação: o backend usa a service_role key (bypassa RLS automaticamente).
-- As policies abaixo protegem o acesso direto via anon/authenticated key.
-- ISOLAMENTO MULTI-TENANT: todas as políticas filtram por role E company_id,
-- impedindo que usuários de uma empresa acessem dados de outra empresa mesmo
-- com a chave authenticated.
-- =============================================================================

-- Política: CEO e ADMIN podem fazer qualquer operação, mas apenas nos kits
-- da própria empresa (company_id do JWT deve bater com o da linha).
CREATE POLICY "solar_kits_ceo_adm_all"
  ON public.solar_kits
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

-- Política: VENDEDOR (COMMERCIAL) e TECHNICAL podem apenas ler kits ativos
-- da própria empresa.
CREATE POLICY "solar_kits_vendedor_select"
  ON public.solar_kits
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('COMMERCIAL', 'VENDEDOR', 'TECHNICAL')
    AND company_id = (auth.jwt() ->> 'company_id')::UUID
    AND ativo = TRUE
  );

-- =============================================================================
-- Trigger para atualizar updated_at automaticamente
-- =============================================================================

-- Cria a função de trigger caso ainda não exista
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Associa o trigger à tabela
DROP TRIGGER IF EXISTS trg_solar_kits_updated_at ON public.solar_kits;
CREATE TRIGGER trg_solar_kits_updated_at
  BEFORE UPDATE ON public.solar_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Atualiza o schema cache do PostgREST (Supabase)
-- Isso faz o PostgREST reconhecer a nova tabela imediatamente sem precisar
-- reiniciar o projeto pelo dashboard.
-- =============================================================================
NOTIFY pgrst, 'reload schema';
