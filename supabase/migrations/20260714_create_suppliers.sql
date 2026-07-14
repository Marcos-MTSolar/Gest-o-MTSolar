-- =============================================================================
-- Migration: Criação da tabela suppliers (Fornecedores de Kits Solares)
-- Data: 2026-07-14
-- Projeto: Gestão MTSolar
-- Descrição: Tabela para gerenciamento de distribuidores cadastrados por empresa.
--            Suporta multi-tenancy via company_id, soft-delete via campo ativo,
--            e RLS restrita por role de usuário.
-- =============================================================================

-- Habilita extensão UUID caso ainda não esteja habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cria a tabela suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL,
  razao_social   TEXT NOT NULL,
  cnpj           TEXT,
  nome_fantasia  TEXT,
  endereco       TEXT,
  telefone       TEXT,
  email          TEXT,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance nas queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers (company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_ativo ON public.suppliers (company_id, ativo);

-- Habilita Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Políticas RLS
-- =============================================================================

-- Política: CEO e ADMIN podem fazer qualquer operação, mas apenas nos fornecedores
-- da própria empresa (company_id do JWT deve bater com o da linha).
CREATE POLICY "suppliers_ceo_adm_all"
  ON public.suppliers
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

-- Política: VENDEDOR (COMMERCIAL) e TECHNICAL podem apenas ler fornecedores ativos
-- da própria empresa.
CREATE POLICY "suppliers_vendedor_select"
  ON public.suppliers
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

-- Cria a função de trigger caso ainda não exista (criada em migrations anteriores)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Associa o trigger à tabela
DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Atualiza o schema cache do PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';
