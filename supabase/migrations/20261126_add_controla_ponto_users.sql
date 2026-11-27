-- =============================================================================
-- Migration: Isenção de controle de jornada (controla_ponto)
-- Data: 2026-11-26
-- NÃO EXECUTAR AUTOMATICAMENTE — aplicar manualmente pelo gestor
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS controla_ponto boolean NOT NULL DEFAULT true;
