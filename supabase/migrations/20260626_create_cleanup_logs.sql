-- Migration: Cria a tabela cleanup_logs para armazenar o historico de execucoes dos cronjobs de limpeza
-- Executar manualmente no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS cleanup_logs (
  id          BIGSERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,                  -- Ex: 'cleanup-proposals', 'cleanup-r2', etc.
  executado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expirados_encontrados INTEGER DEFAULT 0,
  arquivos_removidos    INTEGER DEFAULT 0,
  registros_zerados     INTEGER DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'sucesso', -- 'sucesso' ou 'erro'
  detalhes    TEXT,                            -- Mensagem de erro ou descricao complementar
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice para consultas por tipo e data
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_tipo_data
  ON cleanup_logs (tipo, executado_em DESC);

-- Nao ha RLS nesta tabela pois ela e acessada apenas pelo backend via service_role
-- Sem dados sensiveis de usuario

COMMENT ON TABLE cleanup_logs IS 'Historico de execucoes dos cronjobs de limpeza automatica (cleanup-proposals, cleanup-r2, etc.)';
COMMENT ON COLUMN cleanup_logs.tipo IS 'Identificador do cronjob que gerou o registro';
COMMENT ON COLUMN cleanup_logs.executado_em IS 'Data e hora de inicio da execucao do cronjob';
COMMENT ON COLUMN cleanup_logs.expirados_encontrados IS 'Quantidade de registros encontrados como expirados na execucao';
COMMENT ON COLUMN cleanup_logs.arquivos_removidos IS 'Quantidade de arquivos fisicos removidos do Storage';
COMMENT ON COLUMN cleanup_logs.registros_zerados IS 'Quantidade de registros que tiveram url_arquivo zerado no banco';
COMMENT ON COLUMN cleanup_logs.status IS 'Resultado da execucao: sucesso ou erro';
COMMENT ON COLUMN cleanup_logs.detalhes IS 'Detalhes adicionais, mensagens de erro ou observacoes';
