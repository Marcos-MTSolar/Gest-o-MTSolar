-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT 1,
  avatar_url TEXT
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'pending', -- pending, active, completed
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Projects table (linked to clients)
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  current_stage TEXT DEFAULT 'registration', -- registration, proposal, documentation, payment, kit_purchase, inspection, homologation, conclusion
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Commercial Data
CREATE TABLE IF NOT EXISTS commercial_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER UNIQUE NOT NULL,
  proposal_value REAL,
  payment_method TEXT,
  contract_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Technical Data / Inspection
CREATE TABLE IF NOT EXISTS technical_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER UNIQUE NOT NULL,
  entrance_pattern TEXT, -- Padrão de entrada
  grounding TEXT, -- Aterramento
  roof_structure TEXT, -- Estrutura do telhado
  roof_overview TEXT, -- Visão geral do telhado
  breaker_box TEXT, -- Quadro de disjuntor
  structure_type TEXT, -- Tipo de estrutura
  module_quantity INTEGER,
  reinforcement_needed BOOLEAN DEFAULT 0,
  observations TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, adjustment_needed
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Media (Photos/Videos)
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('image', 'video')) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'inspection', 'document'
  uploaded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Logs
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Settings (for Logo, etc)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
