-- 20260707_create_webhook_failures.sql

CREATE TABLE IF NOT EXISTS public.webhook_failures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payload_raw JSONB,
    error_message TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (opcional mas recomendado)
ALTER TABLE public.webhook_failures ENABLE ROW LEVEL SECURITY;

-- Policy para permitir inserção anônima (se a API estiver usando chave anônima ou service_role bypass)
-- Caso o backend use service_role, ele já ignora o RLS.
CREATE POLICY "Allow all operations for service_role" ON public.webhook_failures
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Índices para busca mais rápida na tela do CEO
CREATE INDEX idx_webhook_failures_resolved ON public.webhook_failures(resolved);
CREATE INDEX idx_webhook_failures_created_at ON public.webhook_failures(created_at DESC);
