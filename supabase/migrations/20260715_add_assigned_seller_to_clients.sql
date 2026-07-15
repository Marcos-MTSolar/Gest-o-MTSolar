-- Add assigned_seller_id to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_seller_id INTEGER REFERENCES users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_assigned_seller ON clients(assigned_seller_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
