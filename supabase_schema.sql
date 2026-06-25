-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'pending',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  current_stage TEXT DEFAULT 'registration',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  homologation_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  kit_purchased BOOLEAN DEFAULT FALSE,
  inverter_model TEXT,
  inverter_power TEXT,
  module_model TEXT,
  module_power TEXT,
  installation_status TEXT DEFAULT 'pending'
);

-- Commercial Data
CREATE TABLE IF NOT EXISTS commercial_data (
  id SERIAL PRIMARY KEY,
  project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id),
  proposal_value REAL,
  payment_method TEXT,
  contract_url TEXT,
  notes TEXT,
  pendencies TEXT,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technical Data
CREATE TABLE IF NOT EXISTS technical_data (
  id SERIAL PRIMARY KEY,
  project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id),
  entrance_pattern TEXT,
  grounding TEXT,
  roof_structure TEXT,
  roof_overview TEXT,
  breaker_box TEXT,
  structure_type TEXT,
  module_quantity INTEGER,
  reinforcement_needed BOOLEAN DEFAULT FALSE,
  observations TEXT,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  pendencies TEXT,
  photo_modules TEXT,
  photo_inverter TEXT,
  photo_inverter_label TEXT,
  photo_roof_sealing TEXT,
  photo_grounding TEXT,
  photo_ac_voltage TEXT,
  photo_dc_voltage TEXT,
  photo_generation_plate TEXT,
  photo_ac_stringbox TEXT,
  photo_connection_point TEXT,
  inspection_media TEXT
);

-- Media
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  type TEXT CHECK(type IN ('image', 'video')) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  type TEXT,
  url TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  is_reminder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solar Kits (Kits Solares pré-cadastrados por empresa)
-- Gerenciados apenas por CEO e ADM; VENDEDOR só faz SELECT em kits ativos
CREATE TABLE IF NOT EXISTS solar_kits (
  id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                     INTEGER NOT NULL,
  potencia_kwh                   NUMERIC(10,3) NOT NULL DEFAULT 0,
  valor_total                    NUMERIC(12,2) NOT NULL DEFAULT 0,
  margem_venda                   NUMERIC(5,2)  NOT NULL DEFAULT 30,
  quantidade_modulos             INTEGER       NOT NULL DEFAULT 0,
  potencia_modulo_w              NUMERIC(10,2) NOT NULL DEFAULT 0,
  marca_modulo                   TEXT          NOT NULL DEFAULT '',
  quantidade_inversores          INTEGER       NOT NULL DEFAULT 1,
  potencia_inversor_kw           NUMERIC(10,3) NOT NULL DEFAULT 0,
  marca_inversor                 TEXT          NOT NULL DEFAULT '',
  inversor_ampliacao             BOOLEAN       NOT NULL DEFAULT FALSE,
  potencia_inversor_ampliacao_kw NUMERIC(10,3) DEFAULT NULL,
  marca_inversor_ampliacao       TEXT          DEFAULT NULL,
  ativo                          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at                     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Observações de Atendimento do WhatsApp (Histórico)
CREATE TABLE IF NOT EXISTS whatsapp_observations (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                     INTEGER NOT NULL,
  conversation_id                UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  user_id                        INTEGER NOT NULL,
  user_name                      TEXT NOT NULL,
  observation                    TEXT NOT NULL,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed CEO User (password: admin123)
INSERT INTO users (name, email, password_hash, role)
SELECT 'CEO User', 'ceo@mtsolar.com', '$2a$10$X7V.j5t5v5.5.5.5.5.5.5', 'CEO'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'CEO');
