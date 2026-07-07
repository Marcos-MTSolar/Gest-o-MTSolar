-- 20260707_add_profile_pic_to_conversations.sql
-- Adiciona colunas de cache de foto de perfil do WhatsApp

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_pic_updated_at TIMESTAMPTZ;

-- Índice para buscas por data de atualização (útil para o cronjob de cache)
CREATE INDEX IF NOT EXISTS idx_conversations_profile_pic_updated
  ON public.whatsapp_conversations(profile_pic_updated_at);
