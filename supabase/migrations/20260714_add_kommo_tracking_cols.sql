ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS kommo_status_id_origem TEXT,
ADD COLUMN IF NOT EXISTS kommo_status_id_atual TEXT;
