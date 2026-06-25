-- =============================================================================
-- Migration: Criação da tabela whatsapp_observations
-- Data: 2026-06-25
-- Projeto: Gestão MTSolar
-- Descrição: Tabela para gerenciamento de observações feitas por vendedores e 
--            agentes nas conversas de WhatsApp. Suporta multi-tenancy e mantém 
--            histórico de autoria inalterado (snapshot de user_name).
-- =============================================================================

-- Habilita extensão UUID caso ainda não esteja habilitada (já garantido por migrations anteriores, mas preventivo)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cria a tabela whatsapp_observations
CREATE TABLE IF NOT EXISTS public.whatsapp_observations (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                     INTEGER NOT NULL,
  conversation_id                UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  user_id                        INTEGER NOT NULL, -- Supondo id numérico para usuários conforme padrão do projeto
  user_name                      TEXT NOT NULL,
  observation                    TEXT NOT NULL,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_observations_conversation_id ON public.whatsapp_observations (conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_observations_company_id ON public.whatsapp_observations (company_id);

-- Habilita Row Level Security
ALTER TABLE public.whatsapp_observations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Políticas RLS
-- =============================================================================

-- Política: Leitura (SELECT)
-- Qualquer usuário autenticado pertencente à mesma empresa (company_id) pode ler 
-- todas as observações. O histórico comercial fica visível para toda a equipe.
CREATE POLICY "whatsapp_observations_select_all_company"
  ON public.whatsapp_observations
  FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() ->> 'company_id')::INTEGER
  );

-- Política: Escrita (INSERT)
-- Qualquer usuário autenticado do mesmo company_id pode inserir novas notas.
-- OBS: O Backend já forçará isso na requisição segura da API via service_role, mas 
-- esta política protege inserts via client supabase.
CREATE POLICY "whatsapp_observations_insert_company"
  ON public.whatsapp_observations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (auth.jwt() ->> 'company_id')::INTEGER
  );

-- Não criamos políticas de UPDATE nem DELETE, pois observações são registros 
-- de auditoria imutáveis.

-- =============================================================================
-- Atualiza o schema cache do PostgREST (Supabase)
-- =============================================================================
NOTIFY pgrst, 'reload schema';
