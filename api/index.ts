import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import cors from 'cors';
import * as dotenv from 'dotenv';
import admin from 'firebase-admin';
import { uploadToR2, deleteFromR2, R2_PUBLIC_URL, generatePresignedUrl, listFromR2, getFileFromR2 } from './r2.js';

dotenv.config();

// Vercel serverless functions environment protection
// Moved __dirname into startServer logic to prevent top-level import.meta.url strict errors in CJS.

const app = express();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('WARNING: Missing Supabase environment variables! Endpoints will fail.');
}

// Firebase Admin Setup
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      console.log('Firebase Admin initialized successfully');
    }
  } catch (err) {
    console.error('Firebase Admin initialization error:', err);
  }
}

// Fallback to dummy so it doesn't crash the entire serverless instance on load
const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseServiceKey || 'dummy_key'
);

// Admin client for Storage bypass (RLS)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
);

// Middleware
app.use(express.json({ limit: '50mb' }));
const allowedOrigins = [
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://gest-o-mt-solar.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(cookieParser());
app.set('trust proxy', 1);
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// File Upload Setup (Memory Storage for Vercel -> Supabase Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Path normalization for Vercel
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  next();
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    
    // If token is missing company_id, try to fetch it from DB
    if (!decoded.company_id) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, name, role, company_id')
        .eq('id', decoded.id)
        .single();
      
      if (dbUser) {
        req.user = dbUser;
      } else {
        req.user = decoded;
      }
    } else {
      req.user = decoded;
    }
    
    next();
  });
};

// Helper para upload de arquivo para o Cloudflare R2
// O parâmetro 'bucket' é mantido para compatibilidade com chamadores existentes,
// mas agora é usado apenas como prefixo de pasta no R2.
async function uploadFile(file: Express.Multer.File, bucket: string = 'uploads', customMetadata?: Record<string, string>): Promise<string | null> {
  try {
    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = `${bucket}/${filename}`;
    const url = await uploadToR2(file.buffer, filePath, file.mimetype, customMetadata);
    return url;
  } catch (e) {
    console.error('[R2] Erro no upload:', e);
    return null;
  }
}

// API Routes

// Health check & Root
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'MT Solar API is running', time: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt:', { email, passwordLength: password?.length, type: typeof password });

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  console.log('Bcrypt Check:', {
    passwordStr: password,
    hashStr: user?.password_hash,
    bcryptTest: user ? bcrypt.compareSync(password, user.password_hash) : false
  });

  const isCeoFallback = email === 'ceo@mtsolar.com' && password === 'admin123';
  const isValidPassword = user && bcrypt.compareSync(password, user.password_hash);

  if (!isCeoFallback && (error || !user || !isValidPassword)) {
    console.error('Login Failed Detailed:', { error, user, passwordMatch: isValidPassword });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create a default user object if fallback succeeded but DB user doesn't exist
  const { data: defaultCompany } = await supabase.from('companies').select('id').eq('name', 'MT Solar').single();
  const effectiveUser = user || { 
    id: 1, 
    email: 'ceo@mtsolar.com', 
    role: 'CEO', 
    name: 'CEO User', 
    active: true,
    company_id: defaultCompany?.id
  };

  if (!effectiveUser.active) {
    return res.status(403).json({ error: 'Account deactivated' });
  }

  const token = jwt.sign(
    { 
      id: effectiveUser.id, 
      role: effectiveUser.role, 
      name: effectiveUser.name,
      company_id: effectiveUser.company_id 
    }, 
    JWT_SECRET, 
    { expiresIn: '8h' }
  );
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  // Log login, but ignore error if user is dummy
  if (user) {
    await supabase.from('logs').insert({ 
      user_id: effectiveUser.id, 
      action: 'LOGIN', 
      details: 'User logged in',
      company_id: effectiveUser.company_id 
    });
  }

  res.json({ 
    token, 
    user: { 
      id: effectiveUser.id, 
      name: effectiveUser.name, 
      email: effectiveUser.email, 
      role: effectiveUser.role,
      company_id: effectiveUser.company_id
    } 
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  const { data: user } = await supabase.from('users').select('id, name, email, role, avatar_url, company_id').eq('id', req.user.id).single();
  // Always return a valid user object — either from DB or from token payload
  res.json(user || { 
    id: req.user.id, 
    name: req.user.name, 
    role: req.user.role, 
    email: req.user.email || 'ceo@mtsolar.com',
    company_id: req.user.company_id 
  });
});

// Users
app.get('/api/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') return res.sendStatus(403);

  // Tenta buscar com campos opcionais (cpf, cargo, data_admissao)
  let { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role, active, created_at, cpf, cargo, data_admissao, recebe_leads')
    .eq('company_id', req.user.company_id);

  // Se falhar por colunas inexistentes no banco (PGRST204 ou 42703), retenta sem os campos opcionais
  if (error?.code === 'PGRST204' || error?.code === '42703' || String(error?.code) === '42703') {
    console.warn('[users GET] Colunas opcionais ausentes no schema — retentando sem cpf/cargo/data_admissao');
    const fallback = await supabase
      .from('users')
      .select('id, name, email, role, active, created_at, recebe_leads')
      .eq('company_id', req.user.company_id);
    users = fallback.data as any[];
    error = fallback.error;
  }

  res.json(users ?? []);
});

app.post('/api/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { name, email, password, role, cpf, cargo, data_admissao } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  // Payload base — campos obrigatórios (sempre existem na tabela)
  const baseInsert: any = {
    name,
    email,
    password_hash: hash,
    role,
    company_id: req.user.company_id,
  };

  // Payload completo — inclui campos opcionais se preenchidos
  const fullInsert: any = { ...baseInsert };
  if (cpf != null && cpf !== '') fullInsert.cpf = cpf;
  if (cargo != null && cargo !== '') fullInsert.cargo = cargo;
  if (data_admissao != null && data_admissao !== '') fullInsert.data_admissao = data_admissao;

  // Tenta inserir com campos opcionais
  let { data, error } = await supabase.from('users').insert(fullInsert).select().single();

  // Se falhar por coluna inexistente no banco (PGRST204 ou 42703), retenta sem os campos opcionais
  if (error?.code === 'PGRST204' || error?.code === '42703' || String(error?.code) === '42703') {
    console.warn('[users POST] Colunas opcionais ausentes no schema — retentando sem cpf/cargo/data_admissao');
    ({ data, error } = await supabase.from('users').insert(baseInsert).select().single());
  }

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data.id });
});

app.put('/api/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') return res.sendStatus(403);

  const { name, email, role, active, password, cpf, cargo, data_admissao, recebe_leads } = req.body;

  // Payload base — campos obrigatórios
  const baseUpdate: any = {
    name,
    email,
    role,
    active: active ? true : false,
    recebe_leads: recebe_leads === true || recebe_leads === 'true'
  };

  // Payload completo — inclui campos opcionais se preenchidos
  const fullUpdate: any = { ...baseUpdate };
  if (cpf != null && cpf !== '') fullUpdate.cpf = cpf;
  if (cargo != null && cargo !== '') fullUpdate.cargo = cargo;
  if (data_admissao != null && data_admissao !== '') fullUpdate.data_admissao = data_admissao;

  if (password) {
    baseUpdate.password_hash = bcrypt.hashSync(password, 10);
    fullUpdate.password_hash = baseUpdate.password_hash;
  }

  // Tenta atualizar com campos opcionais
  let { error } = await supabase.from('users').update(fullUpdate).eq('id', req.params.id).eq('company_id', req.user.company_id);

  // Se falhar por coluna inexistente no banco (PGRST204 ou 42703), retenta sem os campos opcionais
  if (error?.code === 'PGRST204' || error?.code === '42703' || String(error?.code) === '42703') {
    console.warn('[users PUT] Colunas opcionais ausentes no schema — retentando sem cpf/cargo/data_admissao');
    ({ error } = await supabase.from('users').update(baseUpdate).eq('id', req.params.id).eq('company_id', req.user.company_id));
  }

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete('/api/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.sendStatus(403);

  const userId = req.params.id;

  await supabase.from('messages').delete().eq('sender_id', userId);
  await supabase.from('clients').update({ created_by: null }).eq('created_by', userId);
  await supabase.from('media').update({ uploaded_by: null }).eq('uploaded_by', userId);
  await supabase.from('documents').update({ uploaded_by: null }).eq('uploaded_by', userId);
  await supabase.from('logs').update({ user_id: null }).eq('user_id', userId);

  const { error } = await supabase.from('users').delete().eq('id', userId).eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });


  res.json({ success: true });
});

app.post('/api/users/push-token', authenticateToken, async (req: any, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  const { error } = await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', req.user.id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Helper para envio de push notifications via FCM (data-only message)
// Data-only garante entrega com app em background/killed (Melhoria 5)
async function sendPushNotification(
  userId: number,
  title: string,
  body: string,
  extraData?: Record<string, string>
) {
  try {
    const { data: user } = await supabase.from('users').select('push_token').eq('id', userId).single();
    if (!user?.push_token) {
      console.log(`[PUSH] User ${userId} has no push token registered.`);
      return;
    }

    console.log(`[PUSH] Sending to User ${userId}: ${title}`);

    if (admin.apps.length > 0) {
      // Payload data-only: o FCM entrega mesmo com app fechado/morto.
      // O MyFirebaseMessagingService nativo no Android lê os campos e exibe
      // a notificação local via NotificationCompat.
      const message = {
        token: user.push_token,
        data: {
          title,
          body,
          type: extraData?.type ?? 'general',
          conversationId: extraData?.conversationId ?? '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...extraData
        },
        android: {
          priority: 'high' as const
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`[PUSH SUCCESS] Message ID: ${response}`);
    } else {
      console.log('[PUSH SKIP] Firebase Admin not initialized (check env vars)');
    }
  } catch (err) {
    console.error(`[PUSH ERROR] Failed to send notification to User ${userId}:`, err);
  }
}

// Clients
app.get('/api/clients', authenticateToken, async (req: any, res) => {
  const { data: clients } = await supabase.from('clients').select('*').eq('company_id', req.user.company_id).order('created_at', { ascending: false });
  res.json(clients);
});

app.post('/api/clients', authenticateToken, async (req: any, res) => {
  const { 
    name, phone, email, address, city, state, cpf_cnpj, origem_venda = null,
    proposal_value, payment_method, kit_supplier, pendencies, notes, finance_grace_period,
    inversor_marca = null, inversor_modelo = null, inversor_potencia = null,
    modulo_modelo = null, modulo_potencia = null, estrutura_tipo = null
  } = req.body;

  try {
    // Verificar duplicidade por telefone ou CPF antes de inserir
    if (phone || cpf_cnpj) {
      let dupQuery = supabaseAdmin
        .from('clients')
        .select('id, name, phone, cpf_cnpj, created_by, users(name)')
        .eq('company_id', req.user.company_id);

      if (phone && cpf_cnpj) {
        dupQuery = dupQuery.or(`phone.eq.${phone},cpf_cnpj.eq.${cpf_cnpj}`);
      } else if (phone) {
        dupQuery = dupQuery.eq('phone', phone);
      } else {
        dupQuery = dupQuery.eq('cpf_cnpj', cpf_cnpj);
      }

      const { data: existing } = await dupQuery.maybeSingle();

      if (existing) {
        const cadastradoPor = (existing as any).users?.name || 'outro usuário';
        return res.status(409).json({
          error: 'CLIENTE_DUPLICADO',
          message: `Este cliente já está cadastrado por ${cadastradoPor}.`,
          client_id: existing.id,
          client_name: existing.name
        });
      }
    }
    const insertPayload: any = {
      name,
      phone,
      email,
      address,
      city,
      state,
      cpf_cnpj,
      origem_venda,
      inversor_marca,
      inversor_modelo,
      inversor_potencia: inversor_potencia !== null && inversor_potencia !== '' && !isNaN(parseFloat(inversor_potencia)) ? parseFloat(inversor_potencia) : null,
      modulo_modelo,
      modulo_potencia: modulo_potencia !== null && modulo_potencia !== '' && !isNaN(parseFloat(modulo_potencia)) ? parseFloat(modulo_potencia) : null,
      estrutura_tipo,
      created_by: req.user.id,
      company_id: req.user.company_id
    };

    let client;
    let error;

    const { data: clientData, error: initialError } = await supabase
      .from('clients')
      .insert(insertPayload)
      .select()
      .single();

    client = clientData;
    error = initialError;

    if (error && (error.code === 'PGRST204' || error.code === '42703' || String(error.code) === '42703')) {
      console.warn('[clients POST] Colunas extras ausentes no schema - retentando sem campos do kit negociado');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('clients')
        .insert({ name, phone, email, address, city, state, cpf_cnpj, created_by: req.user.id, company_id: req.user.company_id })
        .select()
        .single();
      client = fallbackData;
      error = fallbackError;
    }

    if (error) throw error;

    // Initial Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ 
        client_id: client.id, 
        client_name: name, // Persiste o nome para histórico
        title: `Projeto Solar - ${name}`, 
        status: 'pending',
        current_stage: 'registration',
        company_id: req.user.company_id
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Inserir dados comerciais unificados
    await supabase.from('commercial_data').insert({ 
      project_id: project.id,
      proposal_value: proposal_value && !isNaN(parseFloat(proposal_value)) ? parseFloat(proposal_value) : null,
      payment_method: payment_method || 'cash',
      kit_supplier: kit_supplier || null,
      pendencies: pendencies || null,
      notes: notes || null,
      finance_grace_period: parseInt(finance_grace_period) || 0,
      status: 'pendente_comercial',
      company_id: req.user.company_id
    });
    await supabase.from('technical_data').insert({ project_id: project.id, company_id: req.user.company_id });

    res.json({ id: client.id, project_id: project?.id });
  } catch (error: any) {
    console.error("Erro ao cadastrar cliente:", error);
    res.status(500).json({ error: error?.message || "Erro interno ao cadastrar cliente" });
  }
});

app.put('/api/clients/:id', authenticateToken, async (req: any, res) => {
  const { 
    name, phone, email, address, city, state, cpf_cnpj, origem_venda = null,
    inversor_marca = null, inversor_modelo = null, inversor_potencia = null,
    modulo_modelo = null, modulo_potencia = null, estrutura_tipo = null
  } = req.body;

  const updatePayload: any = {
    name,
    phone,
    email,
    address,
    city,
    state,
    cpf_cnpj,
    origem_venda,
    inversor_marca,
    inversor_modelo,
    inversor_potencia: inversor_potencia !== null && inversor_potencia !== '' && !isNaN(parseFloat(inversor_potencia)) ? parseFloat(inversor_potencia) : null,
    modulo_modelo,
    modulo_potencia: modulo_potencia !== null && modulo_potencia !== '' && !isNaN(parseFloat(modulo_potencia)) ? parseFloat(modulo_potencia) : null,
    estrutura_tipo
  };

  let { error: updateError } = await supabase.from('clients')
    .update(updatePayload)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  if (updateError && (updateError.code === 'PGRST204' || updateError.code === '42703' || String(updateError.code) === '42703')) {
    console.warn('[clients PUT] Colunas extras ausentes no schema - retentando sem campos do kit negociado');
    const { error: fallbackError } = await supabase.from('clients')
      .update({ name, phone, email, address, city, state, cpf_cnpj })
      .eq('id', req.params.id)
      .eq('company_id', req.user.company_id);
    updateError = fallbackError;
  }

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  res.json({ success: true });
});

// Relatório de origem de vendas (apenas CEO)
app.get('/api/relatorio/origem-vendas', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Apenas CEO.' });

  const { data: clientes, error } = await supabaseAdmin
    .from('clients')
    .select('origem_venda, created_at')
    .eq('company_id', req.user.company_id)
    .not('origem_venda', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  // Agrupa por origem
  const agrupado: Record<string, number> = {};
  for (const c of clientes || []) {
    const origem = c.origem_venda || 'Não informado';
    agrupado[origem] = (agrupado[origem] || 0) + 1;
  }

  const resultado = Object.entries(agrupado)
    .map(([origem, total]) => ({ origem, total }))
    .sort((a, b) => b.total - a.total);

  res.json({ data: resultado, total_clientes: clientes?.length || 0 });
});

// Projects
app.get('/api/projects', authenticateToken, async (req: any, res) => {
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      clients (name),
      commercial_data (status, pendencies),
      technical_data (status, structure_type),
      documents (*)
    `)
    .eq('company_id', req.user.company_id)
    .order('updated_at', { ascending: false });

  // Flatten for frontend compatibility
  const formatted = projects?.map((p: any) => {
    // Supabase may return technical_data as array or direct object for 1:1 unique FK
    const commData = Array.isArray(p.commercial_data) ? p.commercial_data[0] : p.commercial_data;
    const techData = Array.isArray(p.technical_data) ? p.technical_data[0] : p.technical_data;
    
    return {
      ...p,
      client_name: p.clients?.name || p.client_name,
      commercial_status: commData?.status || 'pending',
      commercial_pendencies: commData?.pendencies || null,
      proposal_value: commData?.proposal_value || null,
      payment_method: commData?.payment_method || null,
      kit_supplier: commData?.kit_supplier || null,
      technical_status: techData?.status || 'pending',
      structure_type: techData?.structure_type || null,
      photo_modules: techData?.photo_modules || null,
      photo_inverter: techData?.photo_inverter || null,
      photo_inverter_label: techData?.photo_inverter_label || null,
      photo_roof_sealing: techData?.photo_roof_sealing || null,
      photo_grounding: techData?.photo_grounding || null,
      photo_ac_voltage: techData?.photo_ac_voltage || null,
      photo_dc_voltage: techData?.photo_dc_voltage || null,
      photo_generation_plate: techData?.photo_generation_plate || null,
      photo_ac_stringbox: techData?.photo_ac_stringbox || null,
      photo_connection_point: techData?.photo_connection_point || null
    };
  });

  res.json(formatted);
});
app.get('/api/projects/:id', authenticateToken, async (req: any, res) => {
  // Complex join
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      clients (*),
      commercial_data (*),
      technical_data (*)
    `)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { data: documents } = await supabase.from('documents').select('*').eq('project_id', project.id);

  // Flatten
  const techData = (Array.isArray(project.technical_data) ? project.technical_data[0] : project.technical_data) || {};
  const commData = (Array.isArray(project.commercial_data) ? project.commercial_data[0] : project.commercial_data) || {};

  const formatted = {
    ...project,
    client_name: project.clients?.name || project.client_name,
    phone: project.clients?.phone || null,
    address: project.clients?.address || null,
    city: project.clients?.city || null,
    state: project.clients?.state || null,
    cpf_cnpj: project.clients?.cpf_cnpj || null,
    zip_code: project.clients?.zip_code || null,
    inversor_marca: project.clients?.inversor_marca || null,
    inversor_modelo: techData?.inverter_model || project.clients?.inversor_modelo || null,
    inversor_potencia: project.clients?.inversor_potencia || null,
    modulo_modelo: techData?.module_model || project.clients?.modulo_modelo || null,
    modulo_potencia: project.clients?.modulo_potencia || null,
    estrutura_tipo: project.clients?.estrutura_tipo || null,

    // Commercial
    proposal_value: commData.proposal_value,
    payment_method: commData.payment_method,
    contract_url: commData.contract_url,
    commercial_notes: commData.notes,
    commercial_status: commData.status,
    commercial_pendencies: commData.pendencies,
    include_inspection_photos: commData.include_inspection_photos,
    inspection_photos: commData.inspection_photos,
    kit_supplier: commData.kit_supplier,
    finance_grace_period: commData.finance_grace_period,

    // Technical
    entrance_pattern: techData.entrance_pattern,
    grounding: techData.grounding,
    roof_structure: techData.roof_structure,
    roof_overview: techData.roof_overview,
    breaker_box: techData.breaker_box,
    module_quantity: techData.module_quantity,
    reinforcement_needed: techData.reinforcement_needed,
    observations: techData.observations,
    inspection_media: techData.inspection_media,
    technical_status: techData.status,
    technical_notes: techData.observations,
    structure_type: techData.structure_type || null,

    // Obra / Installation
    pendencies: techData.pendencies || '',
    photo_modules: techData.photo_modules,
    photo_inverter: techData.photo_inverter,
    photo_inverter_label: techData.photo_inverter_label,
    photo_roof_sealing: techData.photo_roof_sealing,
    photo_grounding: techData.photo_grounding,
    photo_ac_voltage: techData.photo_ac_voltage,
    photo_dc_voltage: techData.photo_dc_voltage,
    photo_generation_plate: techData.photo_generation_plate,
    photo_ac_stringbox: techData.photo_ac_stringbox,
    photo_connection_point: techData.photo_connection_point,
    photo_aterramento_padrao: techData.photo_aterramento_padrao,

    documents
  };

  res.json(formatted);
});

app.delete('/api/projects/:id', authenticateToken, async (req: any, res) => {
  // Cascading deletes manually in case DB does not have ON DELETE CASCADE
  const { data: project } = await supabase.from('projects').select('client_id').eq('id', req.params.id).single();

  await supabase.from('commercial_data').delete().eq('project_id', req.params.id);
  await supabase.from('technical_data').delete().eq('project_id', req.params.id);
  await supabase.from('documents').delete().eq('project_id', req.params.id);
  await supabase.from('media').delete().eq('project_id', req.params.id);
  // Optional depending on schema: clean up any other related tables directly bound to project_id here.


  await supabase.from('projects').delete().eq('id', req.params.id).eq('company_id', req.user.company_id);
  if (project?.client_id) {
    await supabase.from('clients').delete().eq('id', project.client_id).eq('company_id', req.user.company_id);
  }

  res.json({ success: true });
});

// Commercial Update
app.put('/api/projects/:id/commercial', authenticateToken, async (req: any, res) => {
  const { 
    proposal_value, payment_method, notes, pendencies, status, 
    include_inspection_photos, inspection_photos,
    kit_supplier, finance_grace_period
  } = req.body;
  
  await supabase.from('commercial_data')
    .update({ 
      proposal_value, 
      payment_method, 
      notes, 
      pendencies, 
      status, 
      include_inspection_photos,
      inspection_photos: Array.isArray(inspection_photos) ? JSON.stringify(inspection_photos) : inspection_photos,
      kit_supplier,
      finance_grace_period,
      updated_at: new Date() 
    })
    .eq('project_id', req.params.id)
    .eq('company_id', req.user.company_id);

  if (status === 'proposta_enviada') {
    await supabase.from('projects').update({ current_stage: 'inspection', status: 'proposta_enviada', updated_at: new Date() }).eq('id', req.params.id).eq('company_id', req.user.company_id);
    
    // Notifica técnicos
    const { data: techUsers } = await supabase.from('users').select('id, client_name').eq('role', 'TECHNICAL');
    if (techUsers) {
      for (const u of techUsers) {
        await sendPushNotification(u.id, 'Novo Projeto', `Um novo projeto está disponível para vistoria.`);
      }
    }
  } else if (status === 'pendente_comercial') {
    await supabase.from('projects').update({ status: 'pendente_comercial', updated_at: new Date() }).eq('id', req.params.id).eq('company_id', req.user.company_id);
  }


  res.json({ success: true });
});

// Upsert Commercial Data
app.put('/api/commercial-data/:projectId', authenticateToken, async (req: any, res) => {
  const { 
    proposal_value, payment_method, notes, status,
    pendencies, kit_supplier, finance_grace_period,
    include_inspection_photos, inspection_photos
  } = req.body;
  const project_id = req.params.projectId;

  try {
    const { error } = await supabase
      .from('commercial_data')
      .upsert({
        project_id,
        company_id: req.user.company_id,
        proposal_value: proposal_value && !isNaN(parseFloat(proposal_value)) ? parseFloat(proposal_value) : null,
        payment_method: payment_method || 'cash',
        notes: notes || null,
        pendencies: pendencies || null,
        status: status || 'pendente_comercial',
        kit_supplier: kit_supplier || null,
        finance_grace_period: parseInt(finance_grace_period) || 0,
        include_inspection_photos: include_inspection_photos !== undefined ? include_inspection_photos : false,
        inspection_photos: Array.isArray(inspection_photos) ? JSON.stringify(inspection_photos) : inspection_photos,
        updated_at: new Date()
      }, { onConflict: 'project_id' });

    if (error) throw error;

    // Também atualizamos o status geral do projeto se necessário
    if (status === 'proposta_enviada') {
      await supabase.from('projects').update({ current_stage: 'inspection', status: 'proposta_enviada', updated_at: new Date() }).eq('id', project_id).eq('company_id', req.user.company_id);
      
      const { data: techUsers } = await supabase.from('users').select('id').eq('role', 'TECHNICAL');
      if (techUsers) {
        for (const u of techUsers) {
          await sendPushNotification(u.id, 'Novo Projeto', `Um novo projeto está disponível para vistoria.`);
        }
      }
    } else if (status === 'pendente_comercial') {
      await supabase.from('projects').update({ status: 'pendente_comercial', updated_at: new Date() }).eq('id', project_id).eq('company_id', req.user.company_id);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao salvar dados comerciais via upsert:", error);
    res.status(500).json({ error: error?.message || "Erro interno ao salvar dados comerciais" });
  }
});

// Kit Purchase Update
app.put('/api/projects/:id/kit', authenticateToken, async (req: any, res) => {
  const {
    kit_purchased, inverter_model, inverter_power, module_model, module_power,
    data_compra_kit, data_prevista_entrega, distribuidora, kit_entregue
  } = req.body;

  try {
    // Atualiza dados técnicos do kit (inversor/módulo)
    await supabase.from('technical_data').update({
      inverter_model, inverter_power, module_model, module_power, updated_at: new Date()
    }).eq('project_id', req.params.id).eq('company_id', req.user.company_id);

    // Monta payload base de atualização do projeto
    // Quando kit for marcado como entregue, garante que o current_stage seja 'installation'
    const kitEntregueFlag = kit_entregue === true || kit_entregue === 'true';
    const projectUpdate: any = {
      kit_purchased,
      status: kitEntregueFlag ? 'kit_entregue' : 'kit_definido',
      current_stage: 'installation',
      updated_at: new Date()
    };

    // Tenta incluir os novos campos de compra com fallback PGRST204
    try {
      const { error: fullUpdateError } = await supabase.from('projects').update({
        ...projectUpdate,
        data_compra_kit: data_compra_kit || null,
        data_prevista_entrega: data_prevista_entrega || null,
        distribuidora: distribuidora || null,
        kit_entregue: kit_entregue === true || kit_entregue === 'true'
      }).eq('id', req.params.id).eq('company_id', req.user.company_id);

      if (fullUpdateError) {
        const errCode = (fullUpdateError as any)?.code || '';
        const errMsg = fullUpdateError.message || '';
        if (errCode === 'PGRST204' || errMsg.includes('42703') || errMsg.includes('does not exist')) {
          console.warn('[kit] Colunas de compra ainda não existem no banco. Fazendo fallback sem elas.');
          await supabase.from('projects').update(projectUpdate).eq('id', req.params.id).eq('company_id', req.user.company_id);
        } else {
          throw fullUpdateError;
        }
      }
    } catch (innerErr: any) {
      const msg = innerErr?.message || '';
      if (msg.includes('42703') || msg.includes('does not exist')) {
        console.warn('[kit] Fallback ativado — colunas ausentes no schema.');
        await supabase.from('projects').update(projectUpdate).eq('id', req.params.id).eq('company_id', req.user.company_id);
      } else {
        throw innerErr;
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Technical Update
app.put('/api/projects/:id/technical', authenticateToken, upload.any(), async (req: any, res) => {
  const {
    entrance_pattern, grounding, roof_structure, roof_overview, breaker_box,
    structure_type, module_quantity, reinforcement_needed, observations, status
  } = req.body;

  const files = req.files as Express.Multer.File[];
  const mediaUrls: string[] = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const url = await uploadFile(file, 'vistoria', { retention: '2-months' });
      if (url) mediaUrls.push(url);
    }
  }

  // Fetch existing media
  const { data: currentData } = await supabase.from('technical_data').select('inspection_media').eq('project_id', req.params.id).eq('company_id', req.user.company_id).single();
  let existingMedia: string[] = [];
  if (currentData?.inspection_media) {
    try { existingMedia = JSON.parse(currentData.inspection_media); } catch (e) { }
  }

  const finalMedia = [...existingMedia, ...mediaUrls];

  // Use UPSERT so it works even if technical_data row doesn't exist yet for this project
  const { error: upsertError } = await supabase.from('technical_data')
    .upsert({
      project_id: parseInt(req.params.id),
      entrance_pattern, grounding, roof_structure, roof_overview, breaker_box,
      structure_type, module_quantity, reinforcement_needed: reinforcement_needed === 'true', observations, status,
      inspection_media: JSON.stringify(finalMedia), updated_at: new Date(),
      company_id: req.user.company_id
    }, { onConflict: 'project_id' });

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  // Update project stage when vistoria is finalized — goes to installation
  if (status === 'vistoria_concluida') {
    await supabase.from('projects').update({ current_stage: 'installation', status: 'vistoria_concluida', updated_at: new Date() }).eq('id', req.params.id).eq('company_id', req.user.company_id);
  }


  res.json({ success: true });
});


// Installation Update - Receives metadata and URLs from frontend to avoid 413 error
app.put('/api/projects/:id/installation', authenticateToken, async (req: any, res) => {
  try {
    const { 
      pendencies, 
      status, 
      is_trifasico, 
      mppt_photos, 
      obra_photos_uploaded_at, 
      ...photoUrls 
    } = req.body;
    const idParam = req.params.id;

    console.log(`--- [DEBUG] PUT /api/projects/${idParam}/installation ---`);
    console.log('Body:', { pendencies, status, photoCount: Object.keys(photoUrls).length });

    if (!idParam || idParam === 'undefined') {
      console.error('ID do projeto não fornecido ou inválido');
      return res.status(400).json({ error: 'ID do projeto inválido' });
    }

    const projectId = parseInt(idParam);
    if (isNaN(projectId)) {
      console.error('ID do projeto não é um número:', idParam);
      return res.status(400).json({ error: 'ID do projeto deve ser um número' });
    }

    const updates: any = { 
      pendencies, 
      ...photoUrls,
      is_trifasico: is_trifasico ?? false,
      mppt_photos: mppt_photos ?? [],
      obra_photos_uploaded_at: obra_photos_uploaded_at ?? {},
      updated_at: new Date() 
    };

    console.log('Executando update em technical_data com:', updates);
    
    // Fallback block for missing columns
    let techError = null;
    try {
      const { error } = await supabase.from('technical_data').update(updates).eq('project_id', projectId).eq('company_id', req.user.company_id);
      techError = error;
      
      if (error && (error.code === 'PGRST204' || error.code === '42703')) {
        console.warn('Fallback ativado para update de installation, colunas novas não existem no banco. Atualizando apenas originais.');
        const fallbackUpdates = {
          pendencies,
          ...photoUrls,
          updated_at: new Date()
        };
        const { error: fallbackError } = await supabase.from('technical_data').update(fallbackUpdates).eq('project_id', projectId).eq('company_id', req.user.company_id);
        techError = fallbackError;
      }
    } catch (e: any) {
      techError = e;
    }

    if (techError) {
      console.error('Erro ao atualizar technical_data:', techError);
      return res.status(500).json({ error: `Erro no Banco (technical_data): ${techError.message}` });
    }

    console.log('Atualizando status do projeto para:', status);
    const { error: projectError } = await supabase.from('projects').update({ installation_status: status, updated_at: new Date() }).eq('id', projectId).eq('company_id', req.user.company_id);
    if (projectError) {
      console.error('Erro ao atualizar projects (installation_status):', projectError);
      return res.status(500).json({ error: `Erro no Banco (projects): ${projectError.message}` });
    }

    if (status === 'approved') {
      console.log('Status "approved" detectado. Movendo para homologation.');
      const { error: stageError } = await supabase.from('projects').update({ current_stage: 'homologation', updated_at: new Date() }).eq('id', projectId).eq('company_id', req.user.company_id);
      if (stageError) console.error('Erro ao atualizar current_stage:', stageError);
    }

    console.log('--- [DEBUG] Fim da rota de instalação: SUCESSO ---');
    res.json({ success: true });
  } catch (err: any) {
    console.error('Erro catastrófico na rota de instalação:', err);
    res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
});

// Homologation Update
app.put('/api/projects/:id/homologation', authenticateToken, async (req: any, res) => {
  const { 
    homologation_status, 
    rejection_reason, 
    homologation_observations, 
    homologation_checklist, 
    homologation_expected_date,
    homologation_protocol,
    homologation_entry_date,
    homologation_notes
  } = req.body;

  console.log('--- PUT /api/projects/:id/homologation ---');
  console.log('ID:', req.params.id);
  console.log('Payload recebido:', req.body);

  const updates: any = { updated_at: new Date() };
  if (homologation_status !== undefined) updates.homologation_status = homologation_status;
  if (rejection_reason !== undefined) updates.rejection_reason = rejection_reason;
  if (homologation_observations !== undefined) updates.homologation_observations = homologation_observations;
  if (homologation_checklist !== undefined) updates.homologation_checklist = homologation_checklist;
  if (homologation_expected_date !== undefined) updates.homologation_expected_date = homologation_expected_date;
  if (homologation_protocol !== undefined) updates.homologation_protocol = homologation_protocol;
  if (homologation_entry_date !== undefined) updates.homologation_entry_date = homologation_entry_date;
  if (homologation_notes !== undefined) updates.homologation_notes = homologation_notes;

  console.log('Updates object que serÃ¡ enviado pro Supabase:', updates);

  // Previous status check
  const { data: project } = await supabase.from('projects').select('homologation_status').eq('id', req.params.id).eq('company_id', req.user.company_id).single();

  const { error: updateError } = await supabase.from('projects').update(updates).eq('id', req.params.id).eq('company_id', req.user.company_id);
  if (updateError) {
    console.error('Supabase Update Error:', updateError);
  } else {
    console.log('Update executado com sucesso no bd!');
  }

    if (homologation_status === 'connection_point_approved') {
      // Busca o client_id e as fotos antes de atualizar o projeto
      const { data: projData } = await supabase.from('projects').select('client_id, client_name').eq('id', req.params.id).eq('company_id', req.user.company_id).single();
      
      // Busca fotos da obra para exclusão
      const { data: techData } = await supabase.from('technical_data').select('*').eq('project_id', req.params.id).eq('company_id', req.user.company_id).single();

      // Atualiza o projeto para finalizado (estágio de conclusão/pós-venda)
      await supabase.from('projects').update({ 
        current_stage: 'completed', 
        status: 'completed', 
        updated_at: new Date() 
      }).eq('id', req.params.id).eq('company_id', req.user.company_id);

      // Exclusão automática dos arquivos físicos no Supabase Storage
      if (techData) {
        const photoFields = [
          'photo_modules', 'photo_inverter', 'photo_inverter_label', 'photo_roof_sealing',
          'photo_grounding', 'photo_ac_voltage', 'photo_dc_voltage', 'photo_generation_plate',
          'photo_ac_stringbox', 'photo_connection_point'
        ];
        
        const filesToDelete: string[] = [];
        for (const field of photoFields) {
          const url = techData[field];
          if (url && typeof url === 'string') {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            if (filename) filesToDelete.push(filename);
          }
        }

        if (filesToDelete.length > 0) {
          console.log(`Excluindo ${filesToDelete.length} fotos do bucket obras-fotos para o projeto ${req.params.id}`);
          try {
            await supabase.storage.from('obras-fotos').remove(filesToDelete);
          } catch (e) {
            console.error(`[DELETE ERROR] Erro ao excluir fotos de obra:`, e);
          }
        }

        // Limpa as referências no banco de dados (technical_data)
        try {
          const resetPhotos: any = {};
          photoFields.forEach(f => resetPhotos[f] = null);
          await supabase.from('technical_data').update(resetPhotos).eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        } catch (e) {
          console.error(`[DELETE ERROR] Erro ao limpar technical_data:`, e);
        }
      }

      // 2. Exclusão dos arquivos PDF das propostas do storage (os registros em proposal_history são preservados
      //    intencionalmente — o histórico não é deletado junto com o projeto)
      try {
        const { data: proposals } = await supabase.from('proposal_history').select('url_arquivo').eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        if (proposals && proposals.length > 0) {
          const proposalFiles = proposals.map((p: any) => p.url_arquivo?.split('/').pop()).filter(Boolean) as string[];
          if (proposalFiles.length > 0) {
            console.log(`Excluindo ${proposalFiles.length} arquivos PDF de propostas do storage para o projeto ${req.params.id}`);
            await supabase.storage.from('propostas').remove(proposalFiles);
          }
          // Apenas zera o link do arquivo; o registro histórico permanece intacto
          await supabase
            .from('proposal_history')
            .update({ url_arquivo: null })
            .eq('project_id', req.params.id)
            .eq('company_id', req.user.company_id);
        }
      } catch (e) {
        console.error(`[DELETE ERROR] Erro ao remover arquivos PDF de propostas do storage:`, e);
      }

      // 3. Exclusão de arquivos extras (uploads: vistoria, contratos, etc.) e documentos de homologação
      try {
        // Mídias de vistoria no technical_data
        if (techData && techData.inspection_media) {
           let inspectionFiles: string[] = [];
           try {
             const mediaArr = JSON.parse(techData.inspection_media);
             inspectionFiles = mediaArr.map((url: string) => url.split('/').pop()).filter(Boolean);
           } catch(e) {}
           if (inspectionFiles.length > 0) {
             await supabase.storage.from('uploads').remove(inspectionFiles);
           }
        }

        // Homologação docs
        const { data: docs } = await supabase.from('documents').select('file_path').eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        if (docs && docs.length > 0) {
          const docsFiles = docs.map(d => d.file_path).filter(Boolean) as string[];
          if (docsFiles.length > 0) {
            await supabase.storage.from('homologacao-docs').remove(docsFiles);
          }
          await supabase.from('documents').delete().eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        }
      } catch (e) {
        console.error(`[DELETE ERROR] Erro ao excluir arquivos extras:`, e);
      }

      // 4. Limpeza de dados do cronograma e stage
      try {
        await supabase.from('projects').update({ 
          current_stage: 'completed', 
          status: 'completed', 
          schedule_notes: null,
          schedule_order: null,
          schedule_status: null,
          schedule_issue_notes: null,
          updated_at: new Date() 
        }).eq('id', req.params.id).eq('company_id', req.user.company_id);
      } catch (e) {
        console.error(`[DELETE ERROR] Erro ao atualizar projeto:`, e);
      }

      // 5. Soft-Delete nos dados comerciais (Limpar notas e links)
      try {
        const { data: commData } = await supabase.from('commercial_data').select('*').eq('project_id', req.params.id).eq('company_id', req.user.company_id).single();
        if (commData) {
           if (commData.inspection_photos) {
              let inspFiles: string[] = [];
              try {
                const inspArr = JSON.parse(commData.inspection_photos);
                inspFiles = inspArr.map((url: string) => url.split('/').pop()).filter(Boolean);
              } catch(e) {}
              if (inspFiles.length > 0) {
                await supabase.storage.from('uploads').remove(inspFiles);
              }
           }
           await supabase.from('commercial_data').update({
             notes: null,
             inspection_photos: null
           }).eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        }
      } catch (e) {
        console.error(`[DELETE ERROR] Erro ao limpar commercial_data:`, e);
      }

      // 5-B. Exclusão do contrato (contract_url) do storage e anulação no banco
      try {
        const { data: commForContract } = await supabase
          .from('commercial_data')
          .select('contract_url')
          .eq('project_id', req.params.id)
          .eq('company_id', req.user.company_id)
          .single();

        if (commForContract?.contract_url) {
          const contractFileName = commForContract.contract_url.split('/').pop();
          if (contractFileName) {
            console.log(`[5-B] Excluindo contract_url do storage: ${contractFileName}`);
            await supabase.storage.from('propostas').remove([contractFileName]);
          }
          await supabase.from('commercial_data').update({ contract_url: null })
            .eq('project_id', req.params.id)
            .eq('company_id', req.user.company_id);
        }
      } catch (e) {
        console.error('[DELETE ERROR] Erro ao excluir contract_url:', e);
      }

      // 6. Limpeza de dados de vistoria textuais em technical_data
      if (techData) {
        try {
           await supabase.from('technical_data').update({
             observations: null,
             inspection_media: null
           }).eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        } catch (e) {
           console.error(`[DELETE ERROR] Erro ao limpar observações em technical_data:`, e);
        }
      }

      // 7. Soft-Delete na tabela clients (Anonimização)
      if (projData?.client_id) {
        try {
          console.log(`Finalizando projeto ${req.params.id}. Anonimizando cliente ${projData.client_id}`);
          // Não setamos client_id = null no projects para manter a relação! Apenas apagamos o PII.
          await supabase.from('clients').update({
            cpf_cnpj: null,
            phone: null,
            email: null,
            address: null
          }).eq('id', projData.client_id).eq('company_id', req.user.company_id);
        } catch (e) {
          console.error(`[DELETE ERROR] Erro ao anonimizar cliente:`, e);
        }
      }

      // 7-B. Anulação de campos de texto livre do projeto (observações e notas de homologação)
      try {
        await supabase.from('projects').update({
          homologation_observations: null,
          homologation_notes: null,
          rejection_reason: null
        }).eq('id', req.params.id).eq('company_id', req.user.company_id);
        console.log(`[7-B] Campos textuais de homologação anulados para o projeto ${req.params.id}`);
      } catch (e) {
        console.error('[DELETE ERROR] Erro ao anular campos textuais do projeto:', e);
      }

    } else if (homologation_status === 'technical_analysis' && project?.homologation_status !== 'technical_analysis') {
    // Log the automatic transition
    await supabase.from('logs').insert({ user_id: req.user.id, action: 'HOMOLOGATION_STARTED', details: `Checklist concluÃ­do. Processo de homologaÃ§Ã£o iniciado para o projeto ID ${req.params.id}`, company_id: req.user.company_id });
  } else if ((homologation_status === null || homologation_status === '') && project?.homologation_status === 'technical_analysis') {
    // Log the regression
    await supabase.from('logs').insert({ user_id: req.user.id, action: 'HOMOLOGATION_SUSPENDED', details: `Checklist reaberto/pendente. Processo de homologação suspenso para o projeto ID ${req.params.id}`, company_id: req.user.company_id });
  }

  res.json({ success: true });
});

app.get('/api/projects/:id/homologation/documents', authenticateToken, async (req: any, res) => {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', req.params.id)
    .eq('type', 'homologation');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(docs || []);
});

app.post('/api/projects/:id/homologation/documents', authenticateToken, upload.single('file'), async (req: any, res) => {
  const { title } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const url = await uploadFile(file, 'homologation-docs');
  if (!url) return res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });

  const { data, error } = await supabase
    .from('documents')
    .insert([{
      project_id: req.params.id,
      title: title || file.originalname,
      url,
      type: 'homologation',
      uploaded_by: req.user.id,
      company_id: req.user.company_id
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// Homologation Documents (R2)
app.post('/api/homologation-documents/upload', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    const { document_type, client_id, project_id } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const ext = file.originalname.split('.').pop();
    const filePath = `homologacao-docs/${req.user.company_id}/${client_id}/${document_type}-${Date.now()}.${ext}`;
    
    const file_url = await uploadToR2(file.buffer, filePath, file.mimetype);
    if (!file_url) return res.status(500).json({ error: 'Erro ao fazer upload para o R2' });

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 dias (2 meses aproximado)

    const { data, error } = await supabase
      .from('homologation_documents')
      .insert([{
        company_id: req.user.company_id,
        client_id: parseInt(client_id),
        project_id: parseInt(project_id),
        document_type,
        file_name: file.originalname,
        file_url,
        file_path: filePath,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Erro no upload do documento de homologacao:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/homologation-documents/:projectId', authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from('homologation_documents')
      .select('*')
      .eq('project_id', req.params.projectId)
      .eq('company_id', req.user.company_id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/homologation-documents/:id', authenticateToken, async (req: any, res) => {
  try {
    const { data: doc, error: fetchError } = await supabase
      .from('homologation_documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', req.user.company_id)
      .single();

    if (fetchError || !doc) return res.status(404).json({ error: 'Documento não encontrado' });

    await deleteFromR2(doc.file_path);

    const { error: deleteError } = await supabase
      .from('homologation_documents')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Presigned URL para upload direto ao R2 (bypassa limite 4.5MB do Vercel) ──
app.get('/api/r2/presigned-url', authenticateToken, async (req: any, res) => {
  try {
    const { fileName, contentType, clientId, documentType } = req.query;

    if (!fileName || !contentType || !clientId || !documentType) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: fileName, contentType, clientId, documentType' });
    }

    const ext = (fileName as string).split('.').pop();
    const filePath = `homologacao-docs/${req.user.company_id}/${clientId}/${documentType}-${Date.now()}.${ext}`;

    const presignedUrl = await generatePresignedUrl(filePath, contentType as string);
    const safeR2Url = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const publicUrl = `${safeR2Url}/${cleanPath}`;

    res.json({ presignedUrl, publicUrl, filePath });
  } catch (error: any) {
    console.error('Erro ao gerar presigned URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Registrar documento de homologação após upload direto ao R2 ──
app.post('/api/homologation-documents/register', authenticateToken, async (req: any, res) => {
  try {
    const { document_type, client_id, project_id, file_name, file_url, file_path } = req.body;

    if (!document_type || !client_id || !project_id || !file_url || !file_path) {
      return res.status(400).json({ error: 'Campos obrigatórios: document_type, client_id, project_id, file_url, file_path' });
    }

    if (isNaN(parseInt(project_id))) {
      return res.status(400).json({ error: 'project_id inválido ou ausente' });
    }

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 dias

    const { data, error } = await supabase
      .from('homologation_documents')
      .insert([{
        company_id: req.user.company_id,
        client_id: parseInt(client_id),
        project_id: parseInt(project_id),
        document_type,
        file_name: file_name || document_type,
        file_url,
        file_path,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Erro ao registrar documento de homologação:', error);
    res.status(500).json({ error: error.message });
  }
});
// Upload de fotos adicionais da Obra para R2
app.post('/api/obra/upload-foto', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    const { campo, project_id } = req.body;
    const file = req.file;

    if (!file || !campo || !project_id) {
      return res.status(400).json({ error: 'Arquivo, campo e project_id são obrigatórios.' });
    }

    const ext = file.originalname.split('.').pop();
    const filePath = `obras-fotos/${req.user.company_id}/${project_id}/${campo}-${Date.now()}.${ext}`;
    
    const file_url = await uploadToR2(file.buffer, filePath, file.mimetype);
    if (!file_url) return res.status(500).json({ error: 'Erro ao fazer upload para o R2' });

    res.json({ 
      url: file_url, 
      filePath, 
      campo, 
      uploadedAt: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error('Erro no upload de foto da obra:', error);
    res.status(500).json({ error: error.message });
  }
});

// Messages
app.get('/api/messages', authenticateToken, async (req: any, res) => {
  const { data: messages } = await supabase
    .from('messages')
    .select('*, users(name, role)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false })
    .limit(50);

  const formatted = messages?.map((m: any) => ({
    ...m,
    sender_name: m.users?.name,
    sender_role: m.users?.role
  })).reverse();

  res.json(formatted || []);
});

app.post('/api/messages', authenticateToken, async (req: any, res) => {
  const { content } = req.body;
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({ sender_id: req.user.id, content, company_id: req.user.company_id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const payload = {
    ...msg,
    sender_id: req.user.id,
    sender_name: req.user.name,
    sender_role: req.user.role
  };


  res.json(payload);
});

app.get('/api/attendance-registry', authenticateToken, async (req: any, res) => {
  try {
    let query = supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        contact_name,
        phone,
        tags,
        last_message_at,
        assigned_to,
        assigned_name,
        status,
        whatsapp_observations (
          id,
          observation,
          user_name,
          created_at
        )
      `)
      .in('status', ['waiting', 'in_progress'])
      .eq('company_id', req.user.company_id)
      .order('created_at', { foreignTable: 'whatsapp_observations', ascending: false });

    // Isolamento para o Vendedor
    if (req.user.role === 'COMMERCIAL') {
      query = query.eq('assigned_to', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar registro de atendimentos:', error);
      return res.status(500).json({ error: 'Erro ao buscar registro de atendimentos' });
    }

    return res.json(data);
  } catch (err) {
    console.error('Exceção ao buscar registro de atendimentos:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// WhatsApp Conversations
app.get('/api/conversations', authenticateToken, async (req: any, res) => {
  const { instance } = req.query;
  let query = supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('company_id', req.user.company_id);

  if (instance) {
    query = query.eq('instance', instance);
  }

  const { data, error } = await query.order('last_message_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// WhatsApp - Buscar mensagens de uma conversa (com validação de bloqueio)
app.get('/api/conversations/:id/messages', authenticateToken, async (req: any, res) => {
  const conversationId = req.params.id;

  const lockCheck = await checkConversationLock(conversationId, req.user.id, req.user.role);
  if (lockCheck.locked) {
    return res.status(403).json({
      error: 'CONVERSATION_LOCKED',
      assignedTo: lockCheck.assignedToName ?? 'outro atendente'
    });
  }

  // Buscar mensagens
  const { data: messages, error: msgError } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
    .limit(500);

  if (msgError) return res.status(500).json({ error: msgError.message });
  res.json(messages || []);
});

// WhatsApp - Update Tag
app.put('/api/conversations/:id/tag', authenticateToken, async (req: any, res) => {
  const conversationId = req.params.id;
  const { tags } = req.body;

  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({ tags: tags ?? [] })
    .eq('id', conversationId)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// WhatsApp - Listar Observações
app.get('/api/conversations/:id/observations', authenticateToken, async (req: any, res) => {
  const conversationId = req.params.id;
  const companyId = req.user.company_id;

  const { data, error } = await supabase
    .from('whatsapp_observations')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// WhatsApp - Adicionar Observação
app.post('/api/conversations/:id/observations', authenticateToken, async (req: any, res) => {
  const conversationId = req.params.id;
  const companyId = req.user.company_id;
  const userId = req.user.id;
  const userName = req.user.name || 'Usuário Desconhecido';
  const { observation } = req.body;

  if (!observation || observation.trim() === '') {
    return res.status(400).json({ error: 'A observação não pode estar vazia.' });
  }

  // Verifica se a conversa pertence à empresa
  const { data: conv, error: convError } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .single();

  if (convError || !conv) {
    return res.status(404).json({ error: 'Conversa não encontrada.' });
  }

  const { data, error } = await supabase
    .from('whatsapp_observations')
    .insert({
      company_id: companyId,
      conversation_id: conversationId,
      user_id: userId,
      user_name: userName,
      observation: observation.trim()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Renomear contato de uma conversa
app.put('/api/conversations/:id/rename', authenticateToken, async (req: any, res) => {
  const conversationId = req.params.id;
  const companyId = req.user.company_id;
  const userName = req.user.name || 'Usuário';
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome não pode estar vazio.' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'O nome deve ter no máximo 100 caracteres.' });
  }

  const novoNome = name.trim();

  const { data: conv, error: convError } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .single();

  if (convError || !conv) {
    return res.status(404).json({ error: 'Conversa não encontrada.' });
  }

  const { error: updateError } = await supabase
    .from('whatsapp_conversations')
    .update({ contact_name: novoNome })
    .eq('id', conversationId)
    .eq('company_id', companyId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  // Mensagem interna registrando o rename
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversationId,
    company_id: companyId,
    message: `✏️ Contato renomeado para "${novoNome}" por ${userName}`,
    is_internal: true,
    from_me: true,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, name: novoNome });
});

// Helper para resolver a instância WhatsApp e as credenciais do tenant autenticado
async function getEvolutionApiCredentials(companyId: string, requestedInstance?: string) {
  if (!companyId) throw new Error('Company ID ausente no contexto.');
  
  let validatedInstance = null;

  // 1. Se uma instância específica foi solicitada (ex: vinda da conversa)
  if (requestedInstance) {
    const { data: instanceLink } = await supabase
      .from('company_instances')
      .select('instance_name')
      .eq('company_id', companyId)
      .eq('instance_name', requestedInstance)
      .maybeSingle();

    if (instanceLink) {
      validatedInstance = instanceLink.instance_name;
    } else {
      // Tentar no campo legado da tabela companies
      const { data: company } = await supabase
        .from('companies')
        .select('whatsapp_instance')
        .eq('id', companyId)
        .eq('whatsapp_instance', requestedInstance)
        .maybeSingle();

      if (company) {
        validatedInstance = company.whatsapp_instance;
      }
    }
  }

  // 2. Se não encontrou ou não foi solicitada, pegar a padrão/primeira da empresa
  if (!validatedInstance) {
    const { data: anyInstance } = await supabase
      .from('company_instances')
      .select('instance_name')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    if (anyInstance) {
      validatedInstance = anyInstance.instance_name;
    } else {
      const { data: company } = await supabase
        .from('companies')
        .select('whatsapp_instance')
        .eq('id', companyId)
        .maybeSingle();
      
      if (company && company.whatsapp_instance) {
        validatedInstance = company.whatsapp_instance;
      }
    }
  }

  if (!validatedInstance) {
    console.error('[WA SEND] Nenhuma instância WhatsApp encontrada para company_id:', companyId);
    throw new Error('Instância WhatsApp não configurada para este tenant.');
  }

  // Normalização final
  validatedInstance = validatedInstance.toString().trim();

  // 3. Obter credenciais corretas por instância
  const EVOLUTION_URL = process.env.VITE_EVOLUTION_URL || process.env.EVOLUTION_API_URL;
  const INSTANCE_ATENDIMENTO = process.env.VITE_EVOLUTION_INSTANCE_ATENDIMENTO || 'atendimento-cliente';
  
  let EVOLUTION_KEY = '';

  if (validatedInstance === INSTANCE_ATENDIMENTO) {
    // Instância Comercial / Atendimento
    EVOLUTION_KEY = process.env.VITE_EVOLUTION_TOKEN_ATENDIMENTO || process.env.EVOLUTION_TOKEN_ATENDIMENTO || '';
  } else {
    // Instância Administrativa (mtsolar) ou Default
    EVOLUTION_KEY = process.env.VITE_EVOLUTION_KEY || process.env.EVOLUTION_API_KEY || '';
  }

  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    console.error(`[WA ERROR] Configuração ausente para instância: ${validatedInstance}`);
    throw new Error('Configuração da Evolution API incompleta no servidor.');
  }

  const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;

  return { baseUrl, apiKey: EVOLUTION_KEY, instanceName: validatedInstance };
}

// Download Media Route (Cloudflare R2 + fallback Supabase legado)
app.get('/api/media/download', authenticateToken, async (req: any, res: any) => {
  try {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'Path is required' });

    let fetchUrl: string;

    // Fallback: se receber uma URL completa (ex: Supabase legado), faz fetch direto
    if (path.startsWith('http://') || path.startsWith('https://')) {
      fetchUrl = path;
    } else {
      // Path relativo → constrói URL do R2 público
      const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      fetchUrl = `${baseUrl}/${cleanPath}`;
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Arquivo não encontrado' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const cleanPath2 = path.startsWith('/') ? path.substring(1) : path;
    const fileName = cleanPath2.split('/').pop() || 'arquivo';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.end(buffer);
  } catch (error: any) {
    console.error('[MEDIA DOWNLOAD ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp - Assume Conversation
app.post('/api/whatsapp/assume', authenticateToken, async (req: any, res) => {
  console.log('[WA DEBUG] body recebido (ASSUME):', JSON.stringify(req.body));
  console.log('[WA DEBUG] company_id do JWT:', req.user?.company_id ?? 'NÃO ENCONTRADO');
  const { conversationId, userId } = req.body;

  try {
    // 1. Get user name
    let userName = 'Usuário';
    const { data: dbUser } = await supabase.from('users').select('name').eq('id', userId).eq('company_id', req.user.company_id).single();
    
    if (dbUser) {
      userName = dbUser.name;
    } else if (req.user.role === 'CEO' && userId === req.user.id) {
      userName = req.user.name || 'CEO User';
    } else {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Generate token (6 chars alfanumeric uppercase)
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 3. Update conversation
    const { data: conv, error } = await supabase
      .from('whatsapp_conversations')
      .update({
        status: 'in_progress',
        assigned_to: userId,
        assigned_name: userName,
        assigned_at: new Date().toISOString(),
        token: token
      })
      .eq('id', conversationId)
      .eq('company_id', req.user.company_id)
      .select('*')
      .single();

    if (error) throw error;

    // 4. Send WhatsApp message
    try {
      const creds = await getEvolutionApiCredentials(req.user.company_id, conv.instance);
      console.log('[WA DEBUG EVOLUTION] URL:', `${creds.baseUrl}/message/sendText/${creds.instanceName}`);
      console.log('[WA DEBUG EVOLUTION] apikey (primeiros 8 chars):', creds.apiKey?.substring(0, 8));
      console.log('[WA DEBUG] instance_name que será usado:', creds.instanceName);
      console.log('[WA DEBUG] URL Evolution:', creds.baseUrl);
      console.log(`[WA SEND] instance_name resolvido: ${creds.instanceName}`);
      console.log(`[WA SEND] Assume (Token: ${token}) na instância: ${creds.instanceName}`);
      const response = await fetch(`${creds.baseUrl}/message/sendText/${creds.instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
        body: JSON.stringify({ 
          number: conv.phone, 
          text: `Olá! 😊 Seja bem-vindo(a) à MT Solar. Meu nome é ${userName} e estou aqui para te ajudar. Como posso ser útil hoje?` 
        })
      });

      if (!response.ok) {
        console.error('Evolution API Error:', await response.text());
      }
    } catch (e: any) {
      console.error('[WA SEND ERROR]', e.message);
    }

    res.json(conv);
  } catch (err: any) {
    console.error("Error assuming conversation:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to resolve WhatsApp media type
function resolveMediaType(mimetype: string, filename: string): string {
  if (!mimetype) return 'document';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  
  // Documentos — todos vão como 'document'
  if (
    mimetype === 'application/pdf' ||
    mimetype.includes('word') ||
    mimetype.includes('excel') ||
    mimetype.includes('spreadsheet') ||
    mimetype.includes('presentation') ||
    mimetype.includes('powerpoint') ||
    mimetype.includes('zip') ||
    mimetype.includes('compressed') ||
    mimetype === 'text/plain' ||
    mimetype === 'text/csv'
  ) return 'document';
  
  // Fallback por extensão do arquivo
  const ext = filename?.split('.').pop()?.toLowerCase();
  const docExts = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','zip','rar'];
  if (ext && docExts.includes(ext)) return 'document';
  
  return 'document'; // fallback seguro
}

function sanitizeConversationStatus(status: string, assignedTo: number | null): string {
  if (assignedTo === null || assignedTo === undefined) return 'waiting';
  return status;
}

// Helper: Validar se a conversa está bloqueada para o usuário
async function checkConversationLock(conversationId: string, userId: number, userRole: string, _companyId?: string) {
  const { data: conv, error } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select(`
      status,
      assigned_to,
      users!whatsapp_conversations_assigned_to_fkey(name)
    `)
    .eq('id', conversationId)
    .single();

  if (error || !conv) return { locked: false };

  // Se não tem dono, nunca bloqueia — independente do status
  if (conv.assigned_to === null || conv.assigned_to === undefined) {
    return { locked: false };
  }

  // Se tem dono mas é o próprio usuário, não bloqueia
  if (Number(conv.assigned_to) === Number(userId)) {
    return { locked: false };
  }

  // CEO nunca é bloqueado
  if (userRole === 'CEO') {
    return { locked: false };
  }

  // Só bloqueia se tem dono, é diferente do usuário atual e não é CEO
  if (conv.status === 'in_progress') {
    const assignedToName = (conv as any).users?.name ?? 'outro atendente';
    return { locked: true, assignedToName };
  }

  return { locked: false };
}

// WhatsApp - Send Audio
app.post('/api/whatsapp/send-audio', authenticateToken, async (req: any, res) => {
  const { phone, audio, conversationId } = req.body;
  console.log(`[WA SEND] Audio request received: phone=${phone}, conversationId=${conversationId}`);

  try {
    let instance = null;
    if (conversationId) {
      const { data: conv } = await supabase.from('whatsapp_conversations').select('instance').eq('id', conversationId).eq('company_id', req.user.company_id).single();
      if (conv) instance = conv.instance;
    }

    // Validação de bloqueio de conversa
    if (conversationId) {
      const lockCheck = await checkConversationLock(conversationId, req.user.id, req.user.role);
      if (lockCheck.locked) {
        return res.status(403).json({ error: 'CONVERSATION_LOCKED', assignedTo: lockCheck.assignedToName ?? 'outro atendente' });
      }
    }

    const creds = await getEvolutionApiCredentials(req.user.company_id, instance);
    console.log(`[WA SEND] instance_name resolvido: ${creds.instanceName}`);
    console.log(`[WA SEND] Enviando áudio na instância: ${creds.instanceName} para ${phone}`);

    const response = await fetch(`${creds.baseUrl}/message/sendWhatsAppAudio/${creds.instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
      body: JSON.stringify({
        number: phone,
        audio: audio, // base64
        delay: 1200,
        encoding: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Salvar no banco
    if (conversationId) {
      const audioBuffer = Buffer.from(audio, 'base64');
      // Caminho no R2: whatsapp-media/{company_id}/{conversationId}/audio-{timestamp}.ogg
      const audioFileName = `whatsapp-media/${req.user.company_id}/${conversationId}/audio-${Date.now()}.ogg`;
      const audioPublicUrl = await uploadToR2(audioBuffer, audioFileName, 'audio/ogg');

      await supabase.from('whatsapp_messages').upsert({
        conversation_id: conversationId,
        phone: phone,
        message: '[Áudio]',
        from_me: true,
        message_id: result.key?.id || `sent-audio-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'sent',
        media_type: 'audio',
        media_url: audioPublicUrl,
        file_name: 'audio.ogg',
        instance: creds.instanceName,
        company_id: req.user.company_id
      }, { onConflict: 'message_id', ignoreDuplicates: true });

      await supabase.from('whatsapp_conversations').update({
        last_message: '[Áudio]',
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('company_id', req.user.company_id);
    }

    res.json(result);
  } catch (err: any) {
    console.error("[WA SEND ERROR] Error sending audio:", err);
    res.status(400).json({ error: err.message });
  }
});

// WhatsApp - Upload Media (Backend bypass for RLS)
app.post('/api/whatsapp/upload-media', authenticateToken, upload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo ausente' });
  const companyId = req.user.company_id;
  const fileName = `${Date.now()}_${req.file.originalname}`;
  const filePath = `${companyId}/${fileName}`;

  console.log(`[WA UPLOAD] Recebido arquivo: ${req.file.originalname} para tenant ${companyId}`);
  console.log('[WA UPLOAD] service_role_key presente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Upload para o Cloudflare R2; URL pública permanente (sem assinatura temporária)
    const publicUrl = await uploadToR2(req.file!.buffer, filePath, req.file!.mimetype);

    console.log(`[WA UPLOAD] Upload concluído no R2: ${filePath}.`);
    res.json({ mediaUrl: publicUrl, filePath });
  } catch (err: any) {
    console.error("[WA UPLOAD ERROR] Detalhes:", err);
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp - Send Media
app.post('/api/whatsapp/send-media', authenticateToken, async (req: any, res) => {
  console.log('[WA DEBUG] body recebido (MEDIA):', JSON.stringify(req.body));
  console.log('[WA DEBUG] company_id do JWT:', req.user?.company_id ?? 'NÃO ENCONTRADO');
  const { phone, mediaUrl, mimetype, filename, caption, conversationId, filePath } = req.body;
  console.log(`[WA MEDIA] Media request received: phone=${phone}, mimetype=${mimetype}, url=${mediaUrl}`);

  if (!filePath) {
    console.error('[WA MEDIA ERROR] filePath ausente no payload.');
    return res.status(400).json({ error: 'filePath ausente no payload' });
  }

  try {
    let instance = null;
    if (conversationId) {
      const { data: conv } = await supabase.from('whatsapp_conversations').select('instance').eq('id', conversationId).eq('company_id', req.user.company_id).single();
      if (conv) instance = conv.instance;
    }

    // Validação de bloqueio de conversa
    if (conversationId) {
      const lockCheck = await checkConversationLock(conversationId, req.user.id, req.user.role);
      if (lockCheck.locked) {
        return res.status(403).json({ error: 'CONVERSATION_LOCKED', assignedTo: lockCheck.assignedToName ?? 'outro atendente' });
      }
    }

    const creds = await getEvolutionApiCredentials(req.user.company_id, instance);
    console.log('[WA DEBUG EVOLUTION] URL:', `${creds.baseUrl}/message/sendMedia/${creds.instanceName}`);
    console.log('[WA DEBUG EVOLUTION] apikey (primeiros 8 chars):', creds.apiKey?.substring(0, 8));
    console.log('[WA DEBUG] instance_name que será usado:', creds.instanceName);
    console.log('[WA DEBUG] URL Evolution:', creds.baseUrl);
    console.log(`[WA SEND] instance_name resolvido: ${creds.instanceName}`);
    console.log(`[WA SEND] Enviando mídia na instância: ${creds.instanceName} para ${phone}`);

    const mediatype = resolveMediaType(mimetype, filename);

    console.log(`[WA SEND] URL que será enviada para a Evolution API fazer o download: ${mediaUrl}`);

    const response = await fetch(`${creds.baseUrl}/message/sendMedia/${creds.instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
      body: JSON.stringify({
        number: phone,
        mediatype: mediatype,
        caption: caption || '',
        media: mediaUrl,
        fileName: filename
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Salvar no banco
    if (conversationId) {
      // Construir URL pública do R2 diretamente a partir do filePath enviado pelo frontend
      const safeR2Url = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const publicUrl = `${safeR2Url}/${cleanPath}`;

      await supabase.from('whatsapp_messages').upsert({
        conversation_id: conversationId,
        phone: phone,
        message: caption || `[${mediatype}]`,
        from_me: true,
        message_id: result.key?.id || `sent-media-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'sent',
        media_type: mediatype,
        media_url: publicUrl,
        file_name: filename,
        instance: creds.instanceName,
        company_id: req.user.company_id
      }, { onConflict: 'message_id', ignoreDuplicates: true });

      await supabase.from('whatsapp_conversations').update({
        last_message: caption || `[${mediatype}]`,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('company_id', req.user.company_id);
    }

    res.json(result);
  } catch (err: any) {
    console.error("[WA SEND ERROR] Error sending media:", err);
    res.status(400).json({ error: err.message });
  }
});

// WhatsApp - Send Text (New Endpoint)
app.post('/api/whatsapp/send', authenticateToken, async (req: any, res) => {
  console.log('[WA DEBUG] body recebido (TEXT):', JSON.stringify(req.body));
  console.log('[WA DEBUG] company_id do JWT:', req.user?.company_id ?? 'NÃO ENCONTRADO');
  const { phone, text, conversationId } = req.body;
  console.log(`[WA SEND] Text request received: phone=${phone}, text="${text?.substring(0, 20)}...", conversationId=${conversationId}`);

  // Validação básica
  if (!phone) return res.status(400).json({ error: 'phone ausente' });
  if (!text) return res.status(400).json({ error: 'message ausente (text)' });

  try {
    let instance = null;
    if (conversationId) {
      const { data: conv } = await supabase.from('whatsapp_conversations').select('instance').eq('id', conversationId).eq('company_id', req.user.company_id).single();
      if (conv) instance = conv.instance;
    }

    // Validação de bloqueio de conversa
    if (conversationId) {
      const lockCheck = await checkConversationLock(conversationId, req.user.id, req.user.role);
      if (lockCheck.locked) {
        return res.status(403).json({ error: 'CONVERSATION_LOCKED', assignedTo: lockCheck.assignedToName ?? 'outro atendente' });
      }
    }

    const creds = await getEvolutionApiCredentials(req.user.company_id, instance);
    console.log('[WA DEBUG EVOLUTION] URL:', `${creds.baseUrl}/message/sendText/${creds.instanceName}`);
    console.log('[WA DEBUG EVOLUTION] apikey (primeiros 8 chars):', creds.apiKey?.substring(0, 8));
    console.log('[WA DEBUG] instance_name que será usado:', creds.instanceName);
    console.log('[WA DEBUG] URL Evolution:', creds.baseUrl);
    console.log(`[WA SEND] Enviando texto na instância: ${creds.instanceName} para ${phone}`);

    const response = await fetch(`${creds.baseUrl}/message/sendText/${creds.instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
      body: JSON.stringify({ number: phone, text })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Salvar no banco
    if (conversationId) {
      await supabase.from('whatsapp_messages').upsert({
        conversation_id: conversationId,
        phone: phone,
        message: text,
        from_me: true,
        message_id: result.key?.id || `sent-text-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'sent',
        media_type: null,
        instance: creds.instanceName,
        company_id: req.user.company_id
      }, { onConflict: 'message_id', ignoreDuplicates: true });

      await supabase.from('whatsapp_conversations').update({
        last_message: text,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('company_id', req.user.company_id);
    }

    res.json(result);
  } catch (err: any) {
    console.error("[WA SEND ERROR] Error sending text:", err);
    res.status(400).json({ error: err.message });
  }
});

// WhatsApp - Transfer Instance
app.post('/api/whatsapp/transfer', authenticateToken, async (req: any, res) => {
  const { conversationId, targetInstance, internalNote } = req.body;

  // Validação de entrada
  if (!conversationId) return res.status(400).json({ error: 'conversationId é obrigatório.' });
  if (!targetInstance) return res.status(400).json({ error: 'targetInstance é obrigatório.' });

  try {
    const { data: conv, error: fetchError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('company_id', req.user.company_id)
      .single();

    if (fetchError || !conv) throw new Error('Conversa não encontrada');

    const creds = await getEvolutionApiCredentials(req.user.company_id, targetInstance);
    const transferDirection = `${conv.instance || 'origem'} → ${creds.instanceName}`;
    console.log(`[TRANSFER] Direção: ${transferDirection} | conversa: ${conversationId}`);

    // Verificar se já existe conversa na instância de destino (respeitando chave única)
    const { data: existingTarget } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('phone', conv.phone)
      .eq('instance', creds.instanceName)
      .eq('company_id', req.user.company_id)
      .maybeSingle();

    const transferData = {
      status: 'waiting',
      assigned_to: null,
      assigned_name: null,
      assigned_at: null,
      tag: 'Transferido',
      last_message: '[Transferido para outra equipe]',
      last_message_at: new Date().toISOString()
    };

    let targetConvId = conversationId;

    if (existingTarget) {
      // Mesclar: mover mensagens para a conversa existente e deletar a antiga
      targetConvId = existingTarget.id;
      
      await supabase
        .from('whatsapp_messages')
        .update({ conversation_id: targetConvId, instance: creds.instanceName })
        .eq('conversation_id', conversationId)
        .eq('company_id', req.user.company_id);

      await supabase
        .from('whatsapp_conversations')
        .update(transferData)
        .eq('id', targetConvId)
        .eq('company_id', req.user.company_id);

      await supabase
        .from('whatsapp_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('company_id', req.user.company_id);
    } else {
      // Apenas atualizar a conversa atual
      const { error: updateError } = await supabase
        .from('whatsapp_conversations')
        .update({ ...transferData, instance: creds.instanceName })
        .eq('id', conversationId)
        .eq('company_id', req.user.company_id);

      if (updateError) throw updateError;

      await supabase
        .from('whatsapp_messages')
        .update({ instance: creds.instanceName })
        .eq('conversation_id', conversationId)
        .eq('company_id', req.user.company_id);
    }

    // Inserir nota interna, se fornecida
    if (internalNote && internalNote.trim() !== '') {
      await supabase.from('whatsapp_messages').upsert({
        conversation_id: targetConvId,
        phone: conv.phone,
        message: `📌 NOTA DE TRANSFERÊNCIA: ${internalNote.trim()}`,
        from_me: true,
        is_internal: true,
        timestamp: new Date().toISOString(),
        instance: creds.instanceName,
        company_id: req.user.company_id
      }, { onConflict: 'message_id', ignoreDuplicates: true });
    }

    const clientName = conv.contact_name ? conv.contact_name.trim() : 'prezado(a) cliente';
    const INSTANCE_ATENDIMENTO_NAME = process.env.VITE_EVOLUTION_INSTANCE_ATENDIMENTO || 'atendimento-cliente';
    const teamName = creds.instanceName === INSTANCE_ATENDIMENTO_NAME ? 'de Atendimento' : 'Administrativa';
    const farewellMsg = `Olá, ${clientName}! 😊 Seu atendimento foi encaminhado para nossa equipe ${teamName}. Em breve um de nossos especialistas entrará em contato. Qualquer dúvida, estamos à disposição! 🌟`;

    // Enviar mensagem de aviso usando a instância de origem
    const originCreds = await getEvolutionApiCredentials(req.user.company_id, conv.instance);
    await fetch(`${originCreds.baseUrl}/message/sendText/${originCreds.instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': originCreds.apiKey },
      body: JSON.stringify({ number: conv.phone, text: farewellMsg })
    });

    // Salvar mensagem de despedida no banco
    await supabase.from('whatsapp_messages').upsert({
      conversation_id: targetConvId,
      phone: conv.phone,
      message: farewellMsg,
      from_me: true,
      timestamp: new Date().toISOString(),
      status: 'sent',
      instance: originCreds.instanceName,
      company_id: req.user.company_id
    }, { onConflict: 'message_id', ignoreDuplicates: true });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[TRANSFER ERROR] Error transferring instance:", err);
    res.status(400).json({ error: err.message });
  }
});


app.post('/api/webhooks/whatsapp', async (req, res) => {
  const body = req.body;
  const payload = body;
  console.log('[WA-WEBHOOK] payload recebido:', JSON.stringify(req.body).slice(0, 500));

  try {
    const remoteJid: string = payload?.data?.key?.remoteJid ?? '';
  if (remoteJid.endsWith('@g.us')) {
    console.log('[WA-WEBHOOK] Mensagem de grupo ignorada:', remoteJid);
    return;
  }

  // Filtro de status de confirmação aplicado APENAS fora de messages.upsert
  // (para não descartar mensagens de leads externos recebidas via messages.upsert)
  if (body.event !== 'messages.upsert') {
    const messageStatus: string = payload?.data?.status ?? '';
    const statusesParaIgnorar = ['DELIVERY_ACK', 'READ', 'PLAYED', 'SERVER_ACK'];
    if (statusesParaIgnorar.includes(messageStatus)) {
      console.log('[WA-WEBHOOK] Status de confirmação ignorado (evento não é messages.upsert):', messageStatus);
      return;
    }
  }

  // 0. Atualização de Status da Mensagem (Event messages.update)
  if (body.event === 'messages.update') {
    // Normalizar instanceName para resolver company_id
    let instanceName = body.instance?.instanceName || body.instanceName || body.instance || body.data?.instance;
    if (typeof instanceName === 'object' && instanceName?.instanceName) instanceName = instanceName.instanceName;
    if (typeof instanceName === 'string' && instanceName.includes('Instance Name:')) instanceName = instanceName.replace('Instance Name:', '').trim();
    const normalizedInstance = instanceName?.toString().trim().toLowerCase().replace(/\s+/g, '-');

    if (normalizedInstance) {
      // Tentar resolver company_id para auditar logs se necessário
      const updates = body.data;
      if (Array.isArray(updates)) {
        for (const upd of updates) {
          if (upd.key?.id && upd.update?.status !== undefined) {
            const newStatus = 
              upd.update.status === 3 ? 'read' :
              upd.update.status === 2 ? 'delivered' :
              upd.update.status === 1 ? 'sent' : null;

            if (newStatus) {
              await supabase
                .from('whatsapp_messages')
                .update({ status: newStatus })
                .eq('message_id', upd.key.id);
            }
          }
        }
      }
    }
  }
  
  // LOGS DE DIAGNÓSTICO SOLICITADOS
  console.log('[WEBHOOK DEBUG] payload keys:', JSON.stringify(Object.keys(body)));
  console.log('[WEBHOOK DEBUG] instance details:', body.instance, body.instanceName, body.data?.instance);

  // Evolução API v2 payload structure: { instance: { instanceName: '...' }, ... } 
  // v2.3.7 pode vir em diferentes locais
  let instanceName = body.instance?.instanceName || body.instanceName || body.instance || body.data?.instance;
  
  if (!instanceName) {
    console.error('[WEBHOOK ERROR] Instance name não encontrado no payload.');
    return res.status(200).send('Instance name missing');
  }

  // Normalização caso venha como objeto na v2
  if (typeof instanceName === 'object' && instanceName?.instanceName) {
    instanceName = instanceName.instanceName;
  }

  // Limpar prefixo "Instance Name: " se presente
  if (typeof instanceName === 'string' && instanceName.includes('Instance Name:')) {
    instanceName = instanceName.replace('Instance Name:', '').trim();
  }

  // Normalizar para lowercase e remover espaços extras
  instanceName = instanceName.toString().trim().toLowerCase().replace(/\s+/g, '-');

  const messageType = body.event;
  console.log('[WEBHOOK] Payload recebido:', instanceName, messageType);

  // Resolvendo company_id pela instância
  let companyId = null;

  if (!companyId) {
    try {
      // 2. Tentar buscar na tabela de vínculos de instância (company_instances)
      const { data: instanceLink } = await supabase
        .from('company_instances')
        .select('company_id')
        .eq('instance_name', instanceName)
        .single();
      
      if (instanceLink) {
        companyId = instanceLink.company_id;
      } else {
        // 3. Fallback para a coluna whatsapp_instance legado na tabela companies
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('whatsapp_instance', instanceName)
          .single();
        
        if (company) {
          companyId = company.id;
        }
      }
    } catch (e) {
      console.error('[WEBHOOK] Erro ao buscar empresa:', e);
    }
  }

  // 4. Fallback final se nada funcionar
  if (!companyId) {
    console.error('[WEBHOOK FALLBACK] ATENÇÃO: instance_name não encontrado em company_instances nem em companies:', instanceName);
    console.error('[WEBHOOK FALLBACK] Verifique se a instância está cadastrada na tabela company_instances.');
    
    await supabaseAdmin.from('webhook_failures').insert({
      payload_raw: body,
      error_message: `Company not found for instance: ${instanceName}`,
      company_id: null  // empresa não foi resolvida neste ponto
    });

    return res.status(200).json({ success: false, error: 'Instance not mapped to any company' });
  }

  console.log('[WEBHOOK] company_id resolvido:', companyId, 'para instância:', instanceName);

  if (!companyId) {
    console.error('[WEBHOOK] Erro: Não foi possível resolver o company_id para a instância:', instanceName);
    
    await supabaseAdmin.from('webhook_failures').insert({
      payload_raw: body,
      error_message: `Company not found for instance: ${instanceName}`,
      company_id: null  // empresa não foi resolvida neste ponto
    });
    
    return res.status(200).json({ success: false, error: 'Company not found' });
  }
  
  // Processa nova mensagem recebida/enviada pela Evolution API
  if (body.event === 'messages.upsert') {
    const message = body.data;
    const phone = message.key.remoteJid.split('@')[0];
    const fromMe = message.key.fromMe;
    const messageId = message.key.id;
    const pushName = message.pushName || null;

    // Filtro de status de confirmação aplicado aqui dentro de messages.upsert
    // Garante que apenas eventos de entrega/leitura sejam ignorados, nunca uma mensagem nova de lead externo
    const msgStatus: string = message?.status ?? '';
    const statusesDeConfirmacao = ['DELIVERY_ACK', 'READ', 'PLAYED', 'SERVER_ACK'];
    if (statusesDeConfirmacao.includes(msgStatus) && fromMe) {
      console.log('[WA-WEBHOOK] messages.upsert ignorado: status de confirmação de mensagem enviada:', msgStatus);
      return;
    }

    let mediaType = null;
    let mediaUrl = null;
    let fileName = null;
    let fileSize = null;

    if (message.message?.imageMessage) {
      mediaType = 'image';
      mediaUrl = message.message.imageMessage.url || message.message.imageMessage.directPath;
      fileName = 'image.jpg';
    } else if (message.message?.audioMessage) {
      mediaType = 'audio';
      mediaUrl = message.message.audioMessage.url || message.message.audioMessage.directPath;
      fileName = 'audio.mp3';
    } else if (message.message?.documentMessage) {
      mediaType = 'document';
      mediaUrl = message.message.documentMessage.url || message.message.documentMessage.directPath;
      fileName = message.message.documentMessage.fileName || 'document';
      const flDoc = message.message.documentMessage.fileLength;
      fileSize = flDoc ? (typeof flDoc === 'object' ? Number(flDoc.low) : Number(flDoc)) : null;
    } else if (message.message?.videoMessage) {
      mediaType = 'video';
      mediaUrl = message.message.videoMessage.url || message.message.videoMessage.directPath;
      fileName = message.message.videoMessage.fileName || 'video.mp4';
      const flVid = message.message.videoMessage.fileLength;
      fileSize = flVid ? (typeof flVid === 'object' ? Number(flVid.low) : Number(flVid)) : null;
    } else if (message.message?.documentWithCaptionMessage) {
      const docMsg = message.message.documentWithCaptionMessage.message?.documentMessage;
      mediaType = 'document';
      mediaUrl = docMsg?.url || docMsg?.directPath;
      fileName = docMsg?.fileName || 'document';
      const flDocCap = docMsg?.fileLength;
      fileSize = flDocCap ? (typeof flDocCap === 'object' ? Number(flDocCap.low) : Number(flDocCap)) : null;
    } else if (message.message?.stickerMessage) {
      mediaType = 'sticker';
      mediaUrl = message.message.stickerMessage.url;
      fileName = 'sticker.webp';
    }

    console.log('[WA-MEDIA] tipo:', mediaType, '| url original:', mediaUrl);

    // --- DOWNLOAD E RE-UPLOAD DE MÍDIA PARA SUPABASE STORAGE ---
    // Função auxiliar: baixa a mídia via Evolution API e faz upload para o bucket whatsapp-media
    async function downloadAndUploadMedia(
      evInstanceName: string,
      msgKey: any,
      msgContent: any,
      mType: string,
      cId: string,
      convId: string | null,
      mId: string,
      fallbackUrl: string | null
    ): Promise<string | null> {
      try {
        // Resolver API key correta para esta instância
        const EVOLUTION_URL = process.env.VITE_EVOLUTION_URL || process.env.EVOLUTION_API_URL || '';
        const INSTANCE_ATENDIMENTO = process.env.VITE_EVOLUTION_INSTANCE_ATENDIMENTO || 'atendimento-cliente';
        let apiKey = '';
        if (evInstanceName === INSTANCE_ATENDIMENTO) {
          apiKey = process.env.VITE_EVOLUTION_TOKEN_ATENDIMENTO || process.env.EVOLUTION_TOKEN_ATENDIMENTO || '';
        } else {
          apiKey = process.env.VITE_EVOLUTION_KEY || process.env.EVOLUTION_API_KEY || '';
        }

        if (!EVOLUTION_URL || !apiKey) {
          console.warn('[WEBHOOK MEDIA] Credenciais da Evolution API ausentes — mantendo URL original.');
          return fallbackUrl;
        }

        const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;
        const endpoint = `${baseUrl}/chat/getBase64FromMediaMessage/${evInstanceName}`;

        console.log(`[WEBHOOK MEDIA] Baixando mídia via Evolution API: ${endpoint}`);

        const evoResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
          body: JSON.stringify({ message: { key: msgKey, message: msgContent } }),
          signal: AbortSignal.timeout(15000) // timeout 15s
        });

        if (!evoResponse.ok) {
          console.warn(`[WEBHOOK MEDIA] Evolution API retornou ${evoResponse.status} — usando URL original.`);
          return fallbackUrl;
        }

        const evoData: any = await evoResponse.json();
        console.log('[WA-DOWNLOAD] status:', evoResponse.status, '| body:', JSON.stringify(evoData).slice(0, 300));
        const base64String: string | undefined = evoData?.base64;

        if (!base64String) {
          console.warn('[WEBHOOK MEDIA] Campo base64 ausente na resposta — usando URL original.');
          return fallbackUrl;
        }

        // Converter base64 para Buffer
        const buffer = Buffer.from(base64String, 'base64');

        // Determinar extensão pelo mediaType
        const extMap: Record<string, string> = {
          image: 'jpg',
          video: 'mp4',
          audio: 'ogg',
          document: 'pdf',
          sticker: 'webp'
        };
        const ext = extMap[mType] || 'bin';

        // Determinar contentType
        const mimeMap: Record<string, string> = {
          image: 'image/jpeg',
          video: 'video/mp4',
          audio: 'audio/mpeg',
          document: 'application/pdf',
          sticker: 'image/webp'
        };
        const contentType = mimeMap[mType] || 'application/octet-stream';

        // Path no bucket: {companyId}/{conversationId}/{messageId}.{ext}
        const storagePath = `${cId}/${convId || 'no-conv'}/${mId}.${ext}`;

        console.log(`[WEBHOOK MEDIA] Fazendo upload para whatsapp-media/${storagePath}`);

        // Upload para o Cloudflare R2
        const publicUrl = await uploadToR2(buffer, storagePath, contentType);
        console.log(`[WEBHOOK MEDIA] Upload concluído no R2. URL pública: ${publicUrl}`);
        return publicUrl;
      } catch (err: any) {
        console.warn('[WEBHOOK MEDIA] Erro inesperado no download/upload de mídia:', err.message, '— usando URL original.');
        return fallbackUrl;
      }
    }
    // --- FIM DA FUNÇÃO AUXILIAR ---

    const text = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || 
                 message.message?.imageMessage?.caption || 
                 message.message?.videoMessage?.caption || 
                 (mediaType ? `[${mediaType}]` : '[Mensagem]');

    if (text) {
      console.log('[WEBHOOK] Tentando processar conversa/mensagem...');
      console.log('[WEBHOOK] Dados da conversa:', JSON.stringify({ phone, pushName, companyId, instanceName }));
      // 1. Find or Create Conversation (UPSERT)
      let conversationId = null;
      let conv: any = null;
      try {
        console.log('[WEBHOOK] Fazendo upsert da conversa para:', phone);
        
        const { data: existingConv } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('phone', phone)
          .eq('company_id', companyId)
          .eq('instance', instanceName)
          .maybeSingle();


        if (existingConv) {
          // Atualizar conversa existente
          let newStatus = existingConv.status;
          if (!fromMe && newStatus !== 'in_progress') newStatus = 'waiting';

          newStatus = sanitizeConversationStatus(newStatus, existingConv.assigned_to);

          // Se pushName veio preenchido, usa ele.
          // Se não veio (mensagem fromMe do Kommo), mantém o nome já salvo na conversa.
          // Se não há nome salvo, tenta buscar na tabela clients pelo telefone.
          let resolvedName = 
            (pushName && pushName.trim() !== '' && pushName !== 'Você') 
              ? pushName 
              : existingConv?.contact_name || null;

          if (!resolvedName || resolvedName === 'Você') {
            const { data: clientMatch } = await supabaseAdmin
              .from('clients')
              .select('name')
              .eq('phone', phone)
              .eq('company_id', companyId)
              .maybeSingle();
            if (clientMatch?.name) resolvedName = clientMatch.name;
          }

          const { data: updated } = await supabase
            .from('whatsapp_conversations')
            .update({
              contact_name: (resolvedName && resolvedName !== 'Você') ? resolvedName : (existingConv.contact_name !== 'Você' ? existingConv.contact_name : null),
              last_message: text,
              last_message_at: new Date().toISOString(),
              status: newStatus
            })
            .eq('id', existingConv.id)
            .select()
            .single();

          conv = updated;
          conversationId = existingConv.id;
          console.log('[WEBHOOK] Conversa existente atualizada. ID:', conversationId, 'instance:', instanceName);
        } else {
          // Criar nova conversa
          // Tenta resolver o nome mesmo quando pushName vem vazio (ex: mensagens fromMe do Kommo)
          let newConvName = (pushName && pushName.trim() !== '' && pushName !== 'Você') ? pushName : null;

          if (!newConvName || newConvName === 'Você') {
            const { data: clientMatch } = await supabaseAdmin
              .from('clients')
              .select('name')
              .eq('phone', phone)
              .eq('company_id', companyId)
              .maybeSingle();
            if (clientMatch?.name) newConvName = clientMatch.name;
          }

          const { data: inserted, error: insertError } = await supabase
            .from('whatsapp_conversations')
            .insert({
              phone,
              company_id: companyId,
              contact_name: (newConvName && newConvName !== 'Você') ? newConvName : null,
              last_message: text,
              last_message_at: new Date().toISOString(),
              status: sanitizeConversationStatus('waiting', null),
              instance: instanceName
            })
            .select()
            .single();

          if (insertError) {
            console.error('[WEBHOOK ERROR] Falha ao criar conversa:', insertError.message);
            await supabaseAdmin.from('webhook_failures').insert({
              payload_raw: body,
              error_message: `Falha ao criar conversa: ${insertError.message}`,
              company_id: companyId  // empresa já estava resolvida neste ponto
            });
          } else {
            conv = inserted;
            conversationId = inserted.id;
            console.log('[WEBHOOK] Nova conversa criada. ID:', conversationId, 'instance:', instanceName);
          }
        }
      } catch (err: any) {
        console.error('[WEBHOOK ERROR] Erro inesperado ao processar conversa:', err.message, err.details);
      }

      // 2. Save Message
      if (conversationId) {
        console.log('[WEBHOOK] Tentando salvar mensagem...');

        // 2a. Se é uma mensagem de mídia, baixa da Evolution API e re-faz upload para o Supabase Storage
        if (mediaType) {
          mediaUrl = await downloadAndUploadMedia(
            instanceName,
            message.key,
            message.message,
            mediaType,
            companyId,
            conversationId,
            messageId,
            mediaUrl
          );
        }

        try {
          const { error: msgError } = await supabase.from('whatsapp_messages').upsert({
            conversation_id: conversationId,
            phone,
            message: text,
            from_me: fromMe,
            message_id: messageId,
            timestamp: new Date().toISOString(),
            status: 'received',
            media_type: mediaType,
            media_url: mediaUrl,
            file_name: fileName,
            file_size: fileSize,
            instance: instanceName,
            company_id: companyId
          }, { onConflict: 'message_id', ignoreDuplicates: true });

          if (msgError) {
            console.error('[WEBHOOK ERROR] Falha ao salvar mensagem:', msgError.message, msgError.details);
            await supabaseAdmin.from('webhook_failures').insert({
              payload_raw: body,
              error_message: `Falha ao salvar mensagem: ${msgError.message}`,
              company_id: companyId  // empresa já estava resolvida neste ponto
            });
          } else {
            console.log('[WEBHOOK] Mensagem salva com sucesso');
          }
        } catch (err: any) {
          console.error('[WEBHOOK ERROR] Erro inesperado ao salvar mensagem:', err.message, err.details);
        }

        // 3. Push Notification for Agents (Melhoria 6)
        if (!fromMe && conv?.assigned_to) {
          try {
            const { data: agentUser } = await supabase
              .from('users')
              .select('push_token')
              .eq('id', conv.assigned_to)
              .eq('company_id', companyId)
              .single();

            if (agentUser?.push_token && admin.apps.length > 0) {
              const pushTitle = conv.contact_name || conv.name || phone;
              const pushBody = mediaType ? "📎 Mídia recebida" : (text ? text.slice(0, 80) : "");

              await sendPushNotification(conv.assigned_to, pushTitle, pushBody, {
                type: 'whatsapp_message',
                conversationId: conversationId
              });
            }
          } catch (err: any) {
            console.error('[WEBHOOK PUSH ERROR] Falha ao enviar notificação push:', err.message);
          }
        }
      }
    }
  }

    // Retorna 200 apenas no final do processamento
    res.status(200).json({ status: 'ok', success: true });
  } catch (err: any) {
    console.error('[WEBHOOK FATAL ERROR] Exceção não tratada no webhook:', err);
    try {
      // companyId pode estar resolvido ou não dependendo do ponto em que a exceção ocorreu
      await supabaseAdmin.from('webhook_failures').insert({
        payload_raw: req.body,
        error_message: `Fatal error: ${err.message || String(err)}`,
        company_id: typeof companyId !== 'undefined' ? companyId : null
      });
    } catch (dbErr) {
      console.error('[WEBHOOK FATAL ERROR] Falha ao salvar na dead letter queue:', dbErr);
    }
    // Retornar 200 mesmo em caso de falha fatal para evitar retries infinitos
    res.status(200).json({ status: 'error', message: err.message });
  }
});

// Rota para diagnosticar falhas de webhook (Apenas CEO/ADMIN)
app.get('/api/webhook-failures', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const { data, error } = await supabaseAdmin
    .from('webhook_failures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Documents
app.get('/api/documents', authenticateToken, async (req: any, res) => {
  const { data: docs } = await supabase
    .from('documents')
    .select('*, projects(title), users(name)')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });

  const formatted = docs?.map((d: any) => ({
    ...d,
    project_title: d.projects?.title,
    uploader_name: d.users?.name
  }));

  res.json(formatted || []);
});

app.post('/api/documents', authenticateToken, upload.single('file'), async (req: any, res) => {
  const { project_id, title, type } = req.body;
  const file = req.file;

  try {
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const url = await uploadFile(file);
    if (!url) return res.status(500).json({ error: 'Upload failed' });

    const { error } = await supabase.from('documents').insert({ project_id, title, url, type: type || 'other', uploaded_by: req.user.id, company_id: req.user.company_id });
    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao fazer upload de documento:", error);
    res.status(500).json({ error: error?.message || "Erro interno ao salvar documento" });
  }
});

app.delete('/api/documents/:id', authenticateToken, async (req: any, res) => {
  await supabase.from('documents').delete().eq('id', req.params.id).eq('company_id', req.user.company_id);
  // Ideally delete from storage too, but skipping for brevity
  res.json({ success: true });
});

// Events
app.get('/api/events', authenticateToken, async (req: any, res) => {
  const { data: events } = await supabase.from('events').select('*').eq('company_id', req.user.company_id).order('event_date', { ascending: true });
  res.json(events || []);
});

app.post('/api/events', authenticateToken, async (req: any, res) => {
  const { title, description, event_date, is_reminder, color } = req.body;
  const { data } = await supabase.from('events').insert({ 
    user_id: req.user.id, 
    title, 
    description, 
    event_date, 
    is_reminder,
    color: color || 'blue',
    company_id: req.user.company_id
  }).select().single();
  res.json({ id: data.id });
});

app.put('/api/events/:id', authenticateToken, async (req: any, res) => {
  const { title, description, event_date, is_reminder, color } = req.body;
  await supabase.from('events').update({ title, description, event_date, is_reminder, color }).eq('id', req.params.id).eq('company_id', req.user.company_id);
  res.json({ success: true });
});

app.delete('/api/events/:id', authenticateToken, async (req: any, res) => {
  await supabase.from('events').delete().eq('id', req.params.id).eq('company_id', req.user.company_id);
  res.json({ success: true });
});

app.delete('/api/events/cleanup', authenticateToken, async (req: any, res) => {
  const limite = new Date();
  limite.setMonth(limite.getMonth() - 2);
  const { count } = await supabase.from('events').delete().lt('event_date', limite.toISOString());
  res.json({ success: true, removidos: count });
});

app.put('/api/events/:id/complete', authenticateToken, async (req: any, res) => {
  const { completed } = req.body;
  await supabase.from('events').update({ completed: !!completed }).eq('id', req.params.id).eq('company_id', req.user.company_id);

  res.json({ success: true });
});


// Proposal History
app.get('/api/proposal-history', authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: history, error, count } = await supabase
      .from('proposal_history')
      .select('*', { count: 'exact' })
      .eq('company_id', req.user.company_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return res.status(500).json({ error: error.message });

    const totalPages = Math.ceil((count || 0) / limit);

    res.json({
      data: history || [],
      total: count || 0,
      page,
      totalPages
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Propostas Ativas (7 dias)
app.get('/api/proposals-active', authenticateToken, async (req: any, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('company_id', req.user.company_id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/proposals', authenticateToken, async (req: any, res) => {
  const { client_name, phone, email, address, proposal_number, margin, kit_value } = req.body;
  const created_by = req.user?.name || req.user?.email || 'Desconhecido';

  const { data, error } = await supabase
    .from('proposals')
    .insert([{
      client_name,
      phone,
      email,
      address,
      proposal_number,
      margin,
      kit_value,
      created_by,
      company_id: req.user.company_id
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Novo endpoint para upload de PDF da proposta
app.post('/api/proposals/upload', authenticateToken, upload.single('pdf'), async (req: any, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const url = await uploadFile(file, 'propostas');
    if (!url) return res.status(500).json({ error: 'Falha no upload do arquivo' });

    res.json({ url });
  } catch (err) {
    console.error('Erro no upload de proposta:', err);
    res.status(500).json({ error: 'Erro interno no upload' });
  }
});

app.post('/api/proposal-history', authenticateToken, async (req: any, res) => {
  const { client_name, margin, kit_value, proposal_number, url_arquivo, raw_data } = req.body;
  const created_by = req.user?.name || req.user?.email || 'Desconhecido';
  
  // Define data de expiração para 30 dias a partir de agora
  const data_geracao = new Date();
  const data_expiracao = new Date();
  data_expiracao.setDate(data_geracao.getDate() + 30);
  console.log(`[PROPOSAL-HISTORY] Nova proposta salva para "${client_name}". Expira em: ${data_expiracao.toISOString()}`);

  const { data, error } = await supabase
    .from('proposal_history')
    .insert([{ 
      client_name, 
      margin, 
      kit_value, 
      proposal_number, 
      url_arquivo,
      raw_data, // Salvando o JSON com todos os dados da proposta
      data_geracao: data_geracao.toISOString(),
      data_expiracao: data_expiracao.toISOString(),
      created_by,
      company_id: req.user.company_id
    }])
    .select()
    .single();
    
  if (error) {
    console.error('Erro ao salvar histórico:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Buscar uma proposta específica para edição
app.get('/api/propostas/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('proposal_history')
    .select('*')
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .single();

  if (error) return res.status(404).json({ error: 'Proposta não encontrada.' });
  res.json(data);
});

// Atualizar uma proposta existente (Edição)
app.put('/api/propostas/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { client_name, margin, kit_value, url_arquivo, raw_data } = req.body;

  const { data, error } = await supabase
    .from('proposal_history')
    .update({ 
      client_name, 
      margin, 
      kit_value, 
      url_arquivo,
      raw_data
      // Não mudamos a data de geração/expiração para preservar o histórico original, ou podemos resetar?
      // Pelo fluxo atual, se o PDF foi recriado, talvez seja bom estender a validade, mas manteremos a original por segurança de histórico.
    })
    .eq('id', id)
    .eq('company_id', req.user.company_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/proposal-history/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('proposal_history')
    .delete()
    .eq('id', id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Service Proposals
app.get('/api/service-proposals', authenticateToken, async (req: any, res) => {
  const { data, error } = await supabase
    .from('service_proposals')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/service-proposals', authenticateToken, async (req: any, res) => {
  const { client_name, services, total_value, execution_time, responsible, validity_date } = req.body;
  const { data, error } = await supabase
    .from('service_proposals')
    .insert({
      client_name,
      services,
      total_value,
      execution_time,
      responsible,
      validity_date,
      created_by: req.user.name,
      company_id: req.user.company_id
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Neoenergia Protocols
app.get('/api/neoenergia', authenticateToken, async (req: any, res) => {
  try {
    let query = supabase
      .from('neoenergia_protocols')
      .select('*')
      .eq('company_id', req.user.company_id)
      .or(`resolved_at.is.null,resolved_at.gt.${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}`)
      .order('created_at', { ascending: false });

    // Vendedor vê apenas os seus protocolos
    if (req.user.role === 'COMMERCIAL') {
      query = query.eq('created_by', req.user.id);
    }

    const { data: protocols, error } = await query;
    if (error) {
      console.error('[NEOENERGIA ERROR]', JSON.stringify(error));
      return res.status(500).json({ error: error.message, details: error });
    }
    return res.json(protocols || []);
  } catch (err: any) {
    console.error('[NEOENERGIA CATCH]', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/neoenergia', authenticateToken, async (req: any, res) => {
  const { client_name, cpf_cnpj, phone, address, pendencia, observacoes, numero_protocolo, status, data_prevista } = req.body;
  try {
    const { data, error } = await supabase
      .from('neoenergia_protocols')
      .insert({
        client_name,
        cpf_cnpj,
        phone,
        address,
        pendencia,
        observacoes,
        numero_protocolo,
        status: status || 'em_andamento',
        data_prevista,
        updated_at: new Date(),
        company_id: req.user.company_id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/neoenergia/:id', authenticateToken, async (req: any, res) => {
  const { pendencia, observacoes, numero_protocolo, status, data_prevista } = req.body;
  try {
    const { data, error } = await supabase
      .from('neoenergia_protocols')
      .update({
        pendencia,
        observacoes,
        numero_protocolo,
        status,
        data_prevista,
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .eq('company_id', req.user.company_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/neoenergia/:id/resolve', authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from('neoenergia_protocols')
      .update({
        status: 'concluido',
        resolved_at: new Date(),
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .eq('company_id', req.user.company_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/neoenergia/:id/novo-protocolo', authenticateToken, async (req: any, res) => {
  const { pendencia, observacoes, numero_protocolo, data_prevista, ...clientData } = req.body;
  try {
    const { data, error } = await supabase
      .from('neoenergia_protocols')
      .insert({
        ...clientData,
        pendencia,
        observacoes,
        numero_protocolo,
        data_prevista,
        parent_id: req.params.id,
        status: 'em_andamento',
        updated_at: new Date(),
        company_id: req.user.company_id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/neoenergia/:id', authenticateToken, async (req: any, res) => {
  try {
    const { error } = await supabase
      .from('neoenergia_protocols')
      .delete()
      .eq('id', req.params.id)
      .eq('company_id', req.user.company_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
app.get('/api/stats', authenticateToken, async (req: any, res) => {
  const isCommercial = req.user.role === 'COMMERCIAL';
  
  // Base query com filtro por vendedor se necessário
  const baseFilter = (query: any) => {
    query = query.eq('company_id', req.user.company_id);
    if (isCommercial) {
      query = query.eq('created_by', req.user.id);
    }
    return query;
  };

  const { count: totalProjects } = await baseFilter(
    supabase.from('projects').select('*', { count: 'exact', head: true })
  );
  
  const { count: completedProjects } = await baseFilter(
    supabase.from('projects').select('*', { count: 'exact', head: true })
  ).or('status.eq.completed,current_stage.eq.completed');

  const { count: pendingInspections } = await baseFilter(
    supabase.from('projects').select('*', { count: 'exact', head: true })
  ).eq('current_stage', 'inspection');

  const { count: pendingInstallations } = await baseFilter(
    supabase.from('projects').select('*', { count: 'exact', head: true })
  ).eq('current_stage', 'installation');

  const activeProjects = (totalProjects || 0) - (completedProjects || 0);

  res.json({
    activeProjects,
    pendingInspections: pendingInspections || 0,
    pendingInstallations: pendingInstallations || 0,
    completedProjects: completedProjects || 0,
    monthlyRevenue: 0
  });
});

// Obra Schedule
app.get('/api/projects-schedule', authenticateToken, async (req: any, res) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, client_name, title, schedule_order, schedule_notes, schedule_status, schedule_issue_notes, current_stage, company_id, client_id, clients (inversor_marca, inversor_modelo, inversor_potencia, modulo_modelo, modulo_potencia, estrutura_tipo, address, city, state)')
    .eq('company_id', req.user.company_id)
    .eq('current_stage', 'installation')
    .or('kit_entregue.eq.true,kit_entregue.is.null')
    .order('schedule_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const mappedProjects = (projects || []).map((project: any) => {
    return {
      ...project,
      inversor_marca: project.clients?.inversor_marca || null,
      inversor_modelo: project.clients?.inversor_modelo || null,
      inversor_potencia: project.clients?.inversor_potencia || null,
      modulo_modelo: project.clients?.modulo_modelo || null,
      modulo_potencia: project.clients?.modulo_potencia || null,
      estrutura_tipo: project.clients?.estrutura_tipo || null,
      address: project.clients?.address || null,
      city: project.clients?.city || null,
      state: project.clients?.state || null
    };
  });

  res.json(mappedProjects);
});

app.put('/api/projects/:id/schedule', authenticateToken, async (req: any, res) => {
  const { schedule_order, schedule_notes, schedule_status, schedule_issue_notes } = req.body;
  const updates: any = {};
  if (schedule_order !== undefined) updates.schedule_order = schedule_order;
  if (schedule_notes !== undefined) updates.schedule_notes = schedule_notes;
  if (schedule_status !== undefined) updates.schedule_status = schedule_status;
  if (schedule_issue_notes !== undefined) updates.schedule_issue_notes = schedule_issue_notes;
  updates.updated_at = new Date();

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.put('/api/projects/schedule/reorder', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { orders } = req.body; // Array of {id, schedule_order}

  try {
    for (const item of orders) {
      await supabase.from('projects').update({ schedule_order: item.schedule_order }).eq('id', item.id).eq('company_id', req.user.company_id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stock
app.get('/api/stock', authenticateToken, async (req: any, res) => {
  const { data: items } = await supabase.from('stock_items').select('*').eq('company_id', req.user.company_id).order('category', { ascending: true });
  res.json(items || []);
});

app.post('/api/stock/withdraw', authenticateToken, async (req: any, res) => {
  const { stock_item_id, quantity, installation_id, installation_name, technician_name, notes } = req.body;
  
  const { data, error } = await supabase.from('stock_withdrawals').insert({
    stock_item_id,
    quantity,
    installation_id,
    installation_name,
    technician_name,
    notes,
    created_by: req.user.id,
    company_id: req.user.company_id
  }).select().single();

  if (error) return res.status(400).json({ error: error.message });
  

  res.json(data);
});

app.put('/api/stock/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { current_quantity, ideal_quantity, low_stock_threshold } = req.body;
  
  await supabase.from('stock_items')
    .update({ current_quantity, ideal_quantity, low_stock_threshold, updated_at: new Date() })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);
    

  res.json({ success: true });
});

// Settings - logo_url is public so it can load on Login page
app.get('/api/settings', async (req: any, res) => {
  const authHeader = req.headers['authorization'];
  console.log(`[SETTINGS] Auth Header: ${authHeader ? authHeader.substring(0, 20) + '...' : 'none'}`);

  try {
    const { data: settings } = await supabase.from('settings').select('*');
    const dict: any = {};
    if (settings) {
      settings.forEach(s => {
        dict[s.key] = s.value;
      });
    }
    res.json({ logo_url: dict.logo_url || null });
  } catch (e) {
    console.error('[SETTINGS] Error fetching settings:', e);
    res.json({ logo_url: null });
  }
});

app.post('/api/settings/logo', authenticateToken, upload.single('logo'), async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Forbidden' });
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const url = await uploadFile(file);
  if (!url) return res.status(500).json({ error: 'Upload failed' });

  await supabase.from('settings').upsert({ key: 'logo_url', value: url });
  res.json({ url });
});

// Agenda Reminders Cron (to be called by Vercel Cron)
app.get('/api/cron/agenda-reminders', async (req, res) => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const in10Mins = new Date(now.getTime() + 70 * 60 * 1000);

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('completed', false)
      .gte('event_date', now.toISOString())
      .lte('event_date', in10Mins.toISOString());

    if (events && events.length > 0) {
      for (const event of events) {
        await sendPushNotification(event.user_id, 'Lembrete de Agenda', `Seu compromisso "${event.title}" começa em aproximadamente 1 hora.`);
      }
    }

    res.json({ success: true, notifiedCount: events?.length || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cleanup expired proposals
app.get('/api/cleanup-proposals', async (req, res) => {
  const execucaoInicio = new Date();
  const prefixoLog = '[CLEANUP-PROPOSALS]';

  try {
    console.log(`${prefixoLog} ========================================`);
    console.log(`${prefixoLog} Execução iniciada em: ${execucaoInicio.toISOString()}`);

    // Busca propostas com data_expiracao vencida que ainda têm arquivo no storage
    const { data: expired, error: fetchError } = await supabase
      .from('proposal_history')
      .select('id, url_arquivo')
      .lt('data_expiracao', execucaoInicio.toISOString())
      .not('url_arquivo', 'is', null);

    if (fetchError) {
      console.error(`${prefixoLog} Erro ao buscar propostas expiradas:`, fetchError);
      // Grava falha na tabela de logs do sistema (não usamos await/throw para não quebrar o fluxo se a tabela não existir)
      supabase.from('cleanup_logs').insert({
        tipo: 'cleanup-proposals',
        executado_em: execucaoInicio.toISOString(),
        expirados_encontrados: 0,
        arquivos_removidos: 0,
        registros_zerados: 0,
        status: 'erro',
        detalhes: `Erro ao buscar propostas: ${fetchError.message}`
      }).then(({ error: logErr }) => {
        if (logErr) console.warn(`${prefixoLog} Aviso: Falha ao logar erro em cleanup_logs:`, logErr.message);
      });
      return res.status(500).json({ error: 'Erro ao buscar propostas' });
    }

    const totalExpirados = expired?.length ?? 0;
    console.log(`${prefixoLog} Propostas expiradas com arquivo encontradas: ${totalExpirados}`);

    let arquivosRemovidosCount = 0;
    let registrosZeradosCount = 0;

    if (expired && expired.length > 0) {
      // Etapa 1: Remove os arquivos físicos do Storage
      const filesToDelete = expired
        .map((p: any) => p.url_arquivo?.split('/').pop())
        .filter(Boolean) as string[];

      if (filesToDelete.length > 0) {
        console.log(`${prefixoLog} Removendo ${filesToDelete.length} arquivo(s) do bucket 'propostas'...`);
        const { error: storageError } = await supabase.storage.from('propostas').remove(filesToDelete);
        if (storageError) {
          console.error(`${prefixoLog} Erro ao remover arquivos do storage:`, storageError);
        } else {
          arquivosRemovidosCount = filesToDelete.length;
          console.log(`${prefixoLog} ${arquivosRemovidosCount} arquivo(s) removidos do storage com sucesso.`);
        }
      }

      // Etapa 2: Zera o campo url_arquivo nos registros (preserva o histórico)
      const { error: updateError } = await supabase
        .from('proposal_history')
        .update({ url_arquivo: null })
        .in('id', expired.map((p: any) => p.id));

      if (updateError) {
        console.error(`${prefixoLog} Erro ao zerar url_arquivo no banco:`, updateError);
      } else {
        registrosZeradosCount = expired.length;
        console.log(`${prefixoLog} ${registrosZeradosCount} registro(s) tiveram url_arquivo zerado no banco.`);
      }
    }

    // Log de resumo final
    console.log(`${prefixoLog} ---- RESUMO DA EXECUÇÃO ----`);
    console.log(`${prefixoLog} Data/Hora:               ${execucaoInicio.toISOString()}`);
    console.log(`${prefixoLog} Expirados encontrados:   ${totalExpirados}`);
    console.log(`${prefixoLog} Arquivos removidos:      ${arquivosRemovidosCount}`);
    console.log(`${prefixoLog} Registros zerados:       ${registrosZeradosCount}`);
    console.log(`${prefixoLog} ============================`);

    // Grava resumo na tabela cleanup_logs (para consulta histórica sem depender dos logs Vercel)
    supabase.from('cleanup_logs').insert({
      tipo: 'cleanup-proposals',
      executado_em: execucaoInicio.toISOString(),
      expirados_encontrados: totalExpirados,
      arquivos_removidos: arquivosRemovidosCount,
      registros_zerados: registrosZeradosCount,
      status: 'sucesso',
      detalhes: `Execução automática concluída com sucesso.`
    }).then(({ error: logErr }) => {
      // Não quebra a execução caso a tabela cleanup_logs ainda não exista no banco
      if (logErr) console.warn(`${prefixoLog} Aviso: Não foi possível gravar resumo em cleanup_logs (tabela pode não existir):`, logErr.message);
    });

    res.json({
      status: 'sucesso',
      executado_em: execucaoInicio.toISOString(),
      expirados_encontrados: totalExpirados,
      arquivos_removidos: arquivosRemovidosCount,
      registros_zerados: registrosZeradosCount
    });
  } catch (err: any) {
    console.error(`${prefixoLog} Erro catastrófico na limpeza de propostas:`, err);
    supabase.from('cleanup_logs').insert({
      tipo: 'cleanup-proposals',
      executado_em: execucaoInicio.toISOString(),
      expirados_encontrados: 0,
      arquivos_removidos: 0,
      registros_zerados: 0,
      status: 'erro',
      detalhes: `Erro catastrófico: ${err?.message ?? 'desconhecido'}`
    }).then(() => {});
    res.status(500).json({ error: 'Falha interna na limpeza de propostas' });
  }
});


// Cron: Mensagem de Início de Expediente (08:30 BRT)
app.post('/api/cron/mensagem-inicio-expediente', async (req, res) => {
  try {
    const { data: conversations } = await supabase
      .from('whatsapp_conversations')
      .select('phone, instance, company_id')
      .eq('status', 'in_progress');

    if (!conversations || conversations.length === 0) {
      return res.json({ success: true, sent: 0 });
    }

    let totalSent = 0;
    for (const conv of conversations) {
      try {
        const creds = await getEvolutionApiCredentials(conv.company_id, conv.instance);
        await fetch(`${creds.baseUrl}/message/sendText/${creds.instanceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
          body: JSON.stringify({
            number: conv.phone,
            text: 'Bom dia! 🌅 Nosso atendimento está iniciando agora. Estamos disponíveis das 08:30 às 17:00. Em que podemos te ajudar?'
          })
        });
        totalSent++;
      } catch (e) {
        console.error('[CRON INICIO-EXPEDIENTE] Erro ao enviar para', conv.phone, ':', e);
      }
    }

    res.json({ success: true, sent: totalSent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cron: Mensagem de Almoço (12:00 BRT)
app.post('/api/cron/mensagem-almoco', async (req, res) => {
  try {
    const { data: conversations } = await supabase
      .from('whatsapp_conversations')
      .select('phone, instance, company_id')
      .eq('status', 'in_progress');

    if (!conversations || conversations.length === 0) {
      return res.json({ success: true, sent: 0 });
    }

    let totalSent = 0;
    for (const conv of conversations) {
      try {
        const creds = await getEvolutionApiCredentials(conv.company_id, conv.instance);
        await fetch(`${creds.baseUrl}/message/sendText/${creds.instanceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
          body: JSON.stringify({
            number: conv.phone,
            text: 'Olá! 🍽️ Nosso atendimento entrará em pausa para o horário de almoço das 12:00 às 13:00. Retornaremos em breve. Obrigado pela compreensão!'
          })
        });
        totalSent++;
      } catch (e) {
        console.error('[CRON ALMOCO] Erro ao enviar para', conv.phone, ':', e);
      }
    }

    res.json({ success: true, sent: totalSent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cron: Mensagem de Fim de Expediente (17:00 BRT)
app.post('/api/cron/mensagem-fim-expediente', async (req, res) => {
  try {
    const { data: conversations } = await supabase
      .from('whatsapp_conversations')
      .select('phone, instance, company_id')
      .eq('status', 'in_progress');

    if (!conversations || conversations.length === 0) {
      return res.json({ success: true, sent: 0 });
    }

    let totalSent = 0;
    for (const conv of conversations) {
      try {
        const creds = await getEvolutionApiCredentials(conv.company_id, conv.instance);
        await fetch(`${creds.baseUrl}/message/sendText/${creds.instanceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': creds.apiKey },
          body: JSON.stringify({
            number: conv.phone,
            text: 'Olá! 🌇 Nosso atendimento está sendo encerrado por hoje. Retornaremos amanhã às 08:30. Qualquer mensagem enviada será respondida no próximo dia útil. Até logo!'
          })
        });
        totalSent++;
      } catch (e) {
        console.error('[CRON FIM-EXPEDIENTE] Erro ao enviar para', conv.phone, ':', e);
      }
    }

    res.json({ success: true, sent: totalSent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MÓDULO: PONTO ELETRÔNICO
// ============================================================

// GET /api/ponto/schedules — Retorna horários configurados da empresa
app.get('/api/ponto/schedules', authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('work_schedules')
      .select('*')
      .eq('company_id', req.user.company_id);

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ponto/schedules — Atualiza ou cria horário por função (CEO/ADMIN)
app.put('/api/ponto/schedules', authenticateToken, async (req: any, res) => {
  try {
    if (!['CEO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { role, entry_time, lunch_start, lunch_end, exit_time } = req.body;

    if (!role || !entry_time || !lunch_start || !lunch_end || !exit_time) {
      return res.status(400).json({ error: 'Todos os horários são obrigatórios' });
    }

    const { data: existing } = await supabaseAdmin
      .from('work_schedules')
      .select('id')
      .eq('company_id', req.user.company_id)
      .eq('role', role)
      .single();

    let result;
    if (existing) {
      result = await supabaseAdmin
        .from('work_schedules')
        .update({ entry_time, lunch_start, lunch_end, exit_time })
        .eq('id', existing.id)
        .eq('company_id', req.user.company_id)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from('work_schedules')
        .insert({ company_id: req.user.company_id, role, entry_time, lunch_start, lunch_end, exit_time })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ponto/registrar — Registra batida com selfie + GPS
app.post('/api/ponto/registrar', authenticateToken, async (req: any, res) => {
  try {
    const { type, latitude, longitude, selfie_base64 } = req.body;

    if (!type || !selfie_base64) {
      return res.status(400).json({ error: 'Tipo e selfie são obrigatórios' });
    }

    const validTypes = ['entry', 'lunch_start', 'lunch_end', 'exit'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de batida inválido' });
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime();

    const filePath = `ponto/${req.user.company_id}/${req.user.id}/${yyyy}-${mm}/${timestamp}.jpg`;
    const base64Data = selfie_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const selfie_url = await uploadToR2(buffer, filePath, 'image/jpeg');

    const { data, error } = await supabaseAdmin
      .from('time_records')
      .insert({
        company_id: req.user.company_id,
        user_id: req.user.id,
        type,
        timestamp: now.toISOString(),
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        selfie_url,
        selfie_path: filePath,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ponto/fotos-verificacao — Verificação de fotos por gestor (CEO/ADMIN)
app.get('/api/ponto/fotos-verificacao', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a gestores.' });
    }

    const { userId, data } = req.query;
    if (!userId || !data) {
      return res.status(400).json({ error: 'Parâmetros userId e data são obrigatórios.' });
    }

    // Monta intervalo do dia inteiro no fuso de Brasília
    const inicioDia = `${data}T00:00:00-03:00`;
    const fimDia = `${data}T23:59:59-03:00`;

    const { data: records, error } = await supabaseAdmin
      .from('time_records')
      .select('id, type, timestamp, selfie_url, latitude, longitude, status')
      .eq('company_id', req.user.company_id)
      .eq('user_id', userId)
      .gte('timestamp', inicioDia)
      .lte('timestamp', fimDia)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    res.json(records || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ponto/historico — Histórico do usuário logado
app.get('/api/ponto/historico', authenticateToken, async (req: any, res) => {
  try {
    const { start, end } = req.query;

    let query = supabaseAdmin
      .from('time_records')
      .select('*')
      .eq('company_id', req.user.company_id)
      .eq('user_id', req.user.id)
      .order('timestamp', { ascending: false });

    if (start) query = query.gte('timestamp', start);
    if (end) query = query.lte('timestamp', end);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ponto/relatorio/:userId — Consolidado mensal (CEO/ADMIN)
app.get('/api/ponto/relatorio/:userId', authenticateToken, async (req: any, res) => {
  try {
    if (!['CEO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { userId } = req.params;
    const { start, end } = req.query;

    let query = supabaseAdmin
      .from('time_records')
      .select('*, users(name, role)')
      .eq('company_id', req.user.company_id)
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (start) query = query.gte('timestamp', start);
    if (end) query = query.lte('timestamp', end);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ponto/usuario/:userId/registros — Exclui todos os registros de ponto de um usuário (apenas CEO)
app.delete('/api/ponto/usuario/:userId/registros', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'CEO') {
      return res.status(403).json({ error: 'Apenas o CEO pode excluir registros de ponto.' });
    }

    const { userId } = req.params;

    // Verificar se o userId informado pertence à mesma company_id do CEO autenticado
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (targetUser.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Acesso negado. O usuário não pertence à sua empresa.' });
    }

    // Buscar IDs dos registros de ponto a serem excluídos para podermos remover os ajustes relacionados
    const { data: recordsToDelete, error: fetchError } = await supabaseAdmin
      .from('time_records')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', req.user.company_id);

    if (fetchError) throw fetchError;

    if (recordsToDelete && recordsToDelete.length > 0) {
      const recordIds = recordsToDelete.map((r) => r.id);

      // Deletar os ajustes relacionados
      const { error: adjError } = await supabaseAdmin
        .from('time_adjustments')
        .delete()
        .in('time_record_id', recordIds);

      if (adjError) throw adjError;

      // Deletar os registros de ponto
      const { error: deleteError } = await supabaseAdmin
        .from('time_records')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', req.user.company_id);

      if (deleteError) throw deleteError;
    }

    res.json({ message: 'Registros excluídos com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ponto/ajuste — Solicita correção de batida
app.post('/api/ponto/ajuste', authenticateToken, async (req: any, res) => {
  try {
    const { time_record_id, justification, new_timestamp } = req.body;

    if (!time_record_id || !justification || !new_timestamp) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const { data: record } = await supabaseAdmin
      .from('time_records')
      .select('id, company_id')
      .eq('id', time_record_id)
      .eq('company_id', req.user.company_id)
      .single();

    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    const { data, error } = await supabaseAdmin
      .from('time_adjustments')
      .insert({
        company_id: req.user.company_id,
        time_record_id,
        requested_by: req.user.id,
        justification,
        new_timestamp,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from('time_records')
      .update({ status: 'adjustment_requested' })
      .eq('id', time_record_id);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ponto/ajuste/:id — Aprovar ou rejeitar ajuste (CEO/ADMIN)
app.put('/api/ponto/ajuste/:id', authenticateToken, async (req: any, res) => {
  try {
    if (!['CEO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const { data: adjustment, error: fetchError } = await supabaseAdmin
      .from('time_adjustments')
      .select('*')
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .single();

    if (fetchError || !adjustment) {
      return res.status(404).json({ error: 'Ajuste não encontrado' });
    }

    await supabaseAdmin
      .from('time_adjustments')
      .update({
        status,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (status === 'approved') {
      await supabaseAdmin
        .from('time_records')
        .update({
          timestamp: adjustment.new_timestamp,
          status: 'approved',
        })
        .eq('id', adjustment.time_record_id);
    } else {
      await supabaseAdmin
        .from('time_records')
        .update({ status: 'pending' })
        .eq('id', adjustment.time_record_id);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ponto/ajustes — Lista ajustes pendentes (CEO/ADMIN)
app.get('/api/ponto/ajustes', authenticateToken, async (req: any, res) => {
  try {
    if (!['CEO', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { data, error } = await supabaseAdmin
      .from('time_adjustments')
      .select('*, time_records(*), users!time_adjustments_requested_by_fkey(name, role)')
      .eq('company_id', req.user.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cron: limpeza de selfies de ponto com mais de 90 dias no R2
app.get('/api/cron/cleanup-r2', async (req, res) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const { data: oldRecords, error } = await supabaseAdmin
      .from('time_records')
      .select('id, selfie_path')
      .lt('timestamp', cutoffDate.toISOString())
      .not('selfie_path', 'is', null);

    if (error) throw error;

    let deleted = 0;
    for (const record of oldRecords ?? []) {
      try {
        await deleteFromR2(record.selfie_path);
        await supabaseAdmin
          .from('time_records')
          .update({ selfie_url: null, selfie_path: null })
          .eq('id', record.id);
        deleted++;
      } catch (e) {
        console.error(`Erro ao deletar selfie ${record.selfie_path}:`, e);
      }
    }

    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cron: limpeza de fotos de obra com mais de 15 dias no R2
app.get('/api/cron/cleanup-obra-fotos', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Busca registros com obra_photos_uploaded_at preenchido
    const { data: records, error } = await supabaseAdmin
      .from('technical_data')
      .select('id, project_id, obra_photos_uploaded_at, photo_tensao_ca_neutro_terra, photo_aterramento_padrao, photo_fase_a_b, photo_fase_a_c, photo_fase_b_c, photo_stringbox_cc, mppt_photos')
      .not('obra_photos_uploaded_at', 'is', null)
      .neq('obra_photos_uploaded_at', '{}');

    if (error) throw error;
    if (!records || records.length === 0) return res.json({ cleaned: 0 });

    const QUINZE_DIAS = 15 * 24 * 60 * 60 * 1000;
    const agora = Date.now();
    let cleaned = 0;

    // Processar em lotes de 20
    for (let i = 0; i < records.length; i += 20) {
      const lote = records.slice(i, i + 20);
      for (const record of lote) {
        const uploadedAt: Record<string, string> = record.obra_photos_uploaded_at || {};
        const novoUploadedAt: Record<string, string> = { ...uploadedAt };
        const fieldsToNull: Record<string, null> = {};

        for (const [campo, dataUpload] of Object.entries(uploadedAt)) {
          if (agora - new Date(dataUpload).getTime() > QUINZE_DIAS) {
            const url: string | null = record[campo as keyof typeof record] as string | null;
            if (url) {
              // Extrai o path relativo da URL para deletar do R2
              try {
                const urlObj = new URL(url);
                const path = urlObj.pathname.replace(/^\//, '');
                await deleteFromR2(path);
              } catch (e) {
                console.error(`Erro ao deletar ${campo} do R2:`, e);
              }
              fieldsToNull[campo] = null;
              delete novoUploadedAt[campo];
              cleaned++;
            }
          }
        }

        // Se houver campos para limpar, atualiza o banco
        if (Object.keys(fieldsToNull).length > 0) {
          await supabaseAdmin
            .from('technical_data')
            .update({ ...fieldsToNull, obra_photos_uploaded_at: novoUploadedAt })
            .eq('id', record.id);
        }
      }
    }

    res.json({ cleaned });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cron: limpeza de documentos de homologação expirados no R2
app.get('/api/cron/cleanup-homologation-docs', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: expiredDocs, error: fetchError } = await supabaseAdmin
      .from('homologation_documents')
      .select('id, file_path')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredDocs || expiredDocs.length === 0) {
      return res.json({ deleted: 0 });
    }

    let deleted = 0;
    for (const doc of expiredDocs) {
      try {
        await deleteFromR2(doc.file_path);
        await supabaseAdmin.from('homologation_documents').delete().eq('id', doc.id);
        deleted++;
      } catch (err) {
        console.error(`Erro ao limpar doc homologação ${doc.id}:`, err);
      }
    }

    res.json({ deleted });
  } catch (err: any) {
    console.error('Erro no cleanup de homologation docs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cron: limpeza de mídias do WhatsApp com mais de 120 dias no Supabase Storage
app.get('/api/cron/cleanup-whatsapp-media', async (req, res) => {
  try {
    const ONE_HUNDRED_TWENTY_DAYS_MS = 120 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - ONE_HUNDRED_TWENTY_DAYS_MS);

    // Buscar registros antigos que possuem media_url
    const { data: records, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id, media_url')
      .lt('timestamp', cutoffDate.toISOString())
      .not('media_url', 'is', null)
      .limit(50);

    if (error) throw error;

    let deleted = 0;
    let errors = 0;

    for (const record of records ?? []) {
      try {
        const mediaUrl = record.media_url;
        if (!mediaUrl) continue;

        const bucketPrefix = 'whatsapp-media/';
        const index = mediaUrl.indexOf(bucketPrefix);
        if (index === -1) {
          errors++;
          continue;
        }

        const path = mediaUrl.slice(index + bucketPrefix.length);
        if (!path) {
          errors++;
          continue;
        }

        // Remover do Cloudflare R2
        try {
          await deleteFromR2(path);
        } catch (deleteErr: any) {
          console.error(`Erro ao remover arquivo ${path} do R2:`, deleteErr);
          errors++;
          continue;
        }

        // Atualizar o registro na tabela
        const { error: updateError } = await supabaseAdmin
          .from('whatsapp_messages')
          .update({ media_url: null })
          .eq('id', record.id);

        if (updateError) {
          console.error(`Erro ao atualizar banco para mensagem ${record.id}:`, updateError);
          errors++;
          continue;
        }

        deleted++;
      } catch (e) {
        console.error(`Erro ao processar limpeza da mensagem ${record.id}:`, e);
        errors++;
      }
    }

    res.json({ deleted, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SOLAR KITS (Apenas ADM e CEO) ---
const requireAdminOrCEO = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'CEO') {
    return res.status(403).json({ error: 'Acesso negado. Apenas ADMIN ou CEO.' });
  }
  next();
};

app.get('/api/solar-kits', authenticateToken, async (req: any, res) => {
  try {
    // Log para debug: confirma qual chave está sendo usada
    const keyUsed = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : (process.env.VITE_SUPABASE_ANON_KEY ? 'ANON_KEY (FALLBACK - SEM BYPASS RLS)' : 'NENHUMA CHAVE');
    console.log(`[solar-kits GET] company_id=${req.user?.company_id} role=${req.user?.role} chave_supabase=${keyUsed}`);

    const { data, error } = await supabase
      .from('solar_kits')
      .select('id, potencia_kwp, consumo_referencia_kwh, valor_total, margem_venda, quantidade_modulos, potencia_modulo_w, marca_modulo, quantidade_inversores, potencia_inversor_kw, marca_inversor, inversor_ampliacao, potencia_inversor_ampliacao_kw, marca_inversor_ampliacao, ativo, created_at, updated_at, company_id')
      .eq('company_id', req.user.company_id)
      .eq('ativo', true)
      .order('potencia_kwp', { ascending: true });
    
    if (error) {
      console.error('[solar-kits GET] Erro detalhado Supabase:', JSON.stringify({
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code
      }, null, 2));
      throw error;
    }

    console.log(`[solar-kits GET] Sucesso. Registros retornados: ${data?.length ?? 0}`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message, details: err.details, hint: err.hint, code: err.code });
  }
});

app.post('/api/solar-kits', authenticateToken, requireAdminOrCEO, async (req: any, res) => {
  try {
    const {
      potencia_kwp,
      consumo_referencia_kwh = null,
      valor_total,
      margem_venda,
      quantidade_modulos,
      potencia_modulo_w,
      marca_modulo,
      quantidade_inversores,
      potencia_inversor_kw,
      marca_inversor,
      inversor_ampliacao,
      potencia_inversor_ampliacao_kw,
      marca_inversor_ampliacao
    } = req.body;
    const payload = {
      potencia_kwp,
      consumo_referencia_kwh,
      valor_total,
      margem_venda,
      quantidade_modulos,
      potencia_modulo_w,
      marca_modulo,
      quantidade_inversores,
      potencia_inversor_kw,
      marca_inversor,
      inversor_ampliacao,
      potencia_inversor_ampliacao_kw,
      marca_inversor_ampliacao,
      company_id: req.user.company_id
    };
    const { data, error } = await supabase.from('solar_kits').insert([payload]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/solar-kits/:id', authenticateToken, requireAdminOrCEO, async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      potencia_kwp,
      consumo_referencia_kwh = null,
      valor_total,
      margem_venda,
      quantidade_modulos,
      potencia_modulo_w,
      marca_modulo,
      quantidade_inversores,
      potencia_inversor_kw,
      marca_inversor,
      inversor_ampliacao,
      potencia_inversor_ampliacao_kw,
      marca_inversor_ampliacao
    } = req.body;
    const updatePayload = {
      potencia_kwp,
      consumo_referencia_kwh,
      valor_total,
      margem_venda,
      quantidade_modulos,
      potencia_modulo_w,
      marca_modulo,
      quantidade_inversores,
      potencia_inversor_kw,
      marca_inversor,
      inversor_ampliacao,
      potencia_inversor_ampliacao_kw,
      marca_inversor_ampliacao
    };
    const { data, error } = await supabase
      .from('solar_kits')
      .update(updatePayload)
      .eq('id', id)
      .eq('company_id', req.user.company_id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/solar-kits/:id', authenticateToken, requireAdminOrCEO, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('solar_kits')
      .update({ ativo: false })
      .eq('id', id)
      .eq('company_id', req.user.company_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cron: limpeza de mídias de vistoria com mais de 60 dias no R2
app.get('/api/cron/cleanup-vistoria-midia', async (req, res) => {
  try {
    const files = await listFromR2('vistoria/');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    const filesToDelete = files
      .filter((f: any) => f.LastModified && new Date(f.LastModified) < cutoffDate && f.Key)
      .map((f: any) => f.Key as string);

    let deleted = 0;
    for (const key of filesToDelete) {
      try {
        await deleteFromR2(key);
        deleted++;
      } catch (err) {
        console.error(`Erro ao apagar arquivo de vistoria ${key}:`, err);
      }
    }

    res.json({ deleted });
  } catch (err: any) {
    console.error('Erro no cleanup de vistoria:', err);
    res.status(500).json({ error: err.message });
  }
});

// Manutenção: corrige conversas in_progress sem dono (estado corrompido — assigned_to = NULL)
app.post('/api/admin/fix-orphan-conversations', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Apenas CEO.' });

  const { data, error } = await supabaseAdmin
    .from('whatsapp_conversations')
    .update({ status: 'waiting' })
    .eq('company_id', req.user.company_id)
    .eq('status', 'in_progress')
    .is('assigned_to', null)
    .select('id');

  if (error) return res.status(500).json({ error: error.message });

  console.log(`[FIX-ORPHAN] ${data?.length ?? 0} conversas corrigidas para status=waiting`);
  res.json({ fixed: data?.length ?? 0 });
});

// ============================================================
// INTEGRAÇÃO KOMMO CRM
// ============================================================

// Helper: chama a API REST do Kommo com o Long-Lived Token
async function kommoApi(endpoint: string, method: string = 'GET', body?: any, timeoutMs: number = 8000) {
  const KOMMO_TOKEN = process.env.KOMMO_LONG_LIVED_TOKEN;
  const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN || 'mtsolarenergia';
  const baseUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    if (!response.ok) {
      console.error(`[KOMMO API] Erro ${response.status} em ${endpoint}`);
      return null;
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return null;
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.warn(`[KOMMO API] Resposta não-JSON recebida: "${text.substring(0, 100)}"`);
      return null;
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// SQL PARA EXECUTAR NO SUPABASE (MIGRATION PENDENTE):
// ALTER TABLE users ADD COLUMN IF NOT EXISTS recebe_leads BOOLEAN DEFAULT false;
// UPDATE users SET recebe_leads = true WHERE role = 'COMMERCIAL' AND name ILIKE '%Soraia%';
// UPDATE users SET recebe_leads = true WHERE role = 'COMMERCIAL' AND name ILIKE '%Manoel%';

// Helper: retorna o vendedor com menos atendimentos ativos entre os que recebem leads (Round-Robin)
async function getRoundRobinVendedor(companyId: string): Promise<{ id: number; name: string } | null> {
  let vendedores: any[] = [];
  
  // 1. Tenta buscar vendedores com a coluna recebe_leads
  let { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, recebe_leads')
    .eq('company_id', companyId)
    .eq('role', 'COMMERCIAL')
    .eq('active', true);

  if (error) {
    console.warn('[ROUND-ROBIN] Coluna recebe_leads pode não existir. Buscando sem ela. Erro:', error.message);
    const retry = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('role', 'COMMERCIAL')
      .eq('active', true);
    vendedores = retry.data || [];
  } else {
    vendedores = data || [];
  }

  if (!vendedores || vendedores.length === 0) {
    console.warn('[ROUND-ROBIN] Nenhum vendedor COMMERCIAL ativo encontrado.');
    return null;
  }

  // 2. Filtra os elegíveis
  let elegiveis = vendedores.filter(v => v.recebe_leads === true);

  // 3. Fallback: Se só tiver 1 vendedor recebendo (ex: só a Soraia) ou nenhum, e Manoel Jordão estiver ativo
  if (elegiveis.length < 2) {
    console.warn('[ROUND-ROBIN] Fallback de segurança: Migration de recebe_leads pendente ou incompleta. Utilizando lista hardcoded (Soraia e Manoel).');
    const fallbackList = vendedores.filter(v => v.name?.includes('Soraia') || v.name?.includes('Manoel'));
    if (fallbackList.length > 0) {
      elegiveis = fallbackList;
    } else {
      elegiveis = vendedores; // Último recurso: todos os comerciais ativos
    }
  }

  // Conta atendimentos ativos por vendedor
  const counts = await Promise.all(
    elegiveis.map(async (v: any) => {
      const { count } = await supabaseAdmin
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('assigned_to', v.id)
        .eq('status', 'in_progress');
      return { ...v, total: count ?? 0 };
    })
  );

  // Retorna o vendedor com menos atendimentos ativos
  counts.sort((a: any, b: any) => a.total - b.total);
  
  console.log(`[ROUND-ROBIN] Distribuição atual:`);
  counts.forEach((v: any) => console.log(`  ${v.name}: ${v.total} atendimentos`));
  console.log(`[ROUND-ROBIN] Escolhido: ${counts[0].name} (${counts[0].total} atendimentos ativos)`);
  
  return counts[0];
}

// Helper: busca dados do contato vinculado ao lead no Kommo
// Implementa retry automático com limite customizável
// Retorna null em todas as dimensões se todas as tentativas falharem
async function getKommoLeadContact(leadId: string, maxTentativas: number = 2): Promise<{ name: string | null; phone: string | null } | null> {
  const ESPERA_MS = 1000;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    console.log(`[KOMMO] Tentativa ${tentativa}/${maxTentativas} para lead ${leadId}`);
    try {
      const leadData = await kommoApi(`/leads/${leadId}?with=contacts`);
      if (!leadData) {
        console.warn(`[KOMMO] Tentativa ${tentativa}/${maxTentativas} — leadData nulo para lead ${leadId}`);
        if (tentativa < maxTentativas) {
          await new Promise(resolve => setTimeout(resolve, ESPERA_MS));
          continue;
        }
        break;
      }

      const contacts = leadData?._embedded?.contacts;
      if (!contacts || contacts.length === 0) return { name: null, phone: null };

      const contactId = contacts[0].id;
      const contactData = await kommoApi(`/contacts/${contactId}`);
      if (!contactData) {
        console.warn(`[KOMMO] Tentativa ${tentativa}/${maxTentativas} — contactData nulo para lead ${leadId}`);
        if (tentativa < maxTentativas) {
          await new Promise(resolve => setTimeout(resolve, ESPERA_MS));
          continue;
        }
        break;
      }

      const contactName = contactData.name || null;

      if (process.env.KOMMO_DEBUG === 'true') {
        console.log(`[KOMMO] Dados brutos do contato lead ${leadId}: ${JSON.stringify(contactData)}`);
      }

      let rawPhone: string | null = contactData.phone || null;

      if (!rawPhone) {
        const fields = contactData.custom_fields_values || [];
        for (const field of fields) {
          if (
            field.field_code === 'PHONE' ||
            field.field_name?.toLowerCase().includes('phone') ||
            field.field_name?.toLowerCase().includes('telefone')
          ) {
            const value = field.values?.[0]?.value;
            if (value) {
              rawPhone = value;
              break;
            }
          }
        }
      }

      let phone: string | null = null;
      if (rawPhone) {
        const digits = rawPhone.replace(/\D/g, '');
        if (digits.length === 10 || digits.length === 11) {
          phone = `55${digits}`;
        } else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
          phone = digits;
        } else {
          phone = digits; // Fallback se não bater os padrões comuns
        }
        console.log(`[KOMMO] Telefone: original=${rawPhone} normalizado=${phone}`);
      }

      return { name: contactName, phone };
    } catch (err: any) {
      console.error(`[KOMMO] Tentativa ${tentativa}/${maxTentativas} falhou para lead ${leadId}: ${err?.message || err}`);
      if (tentativa < maxTentativas) {
        await new Promise(resolve => setTimeout(resolve, ESPERA_MS));
      }
    }
  }

  // Todas as tentativas falharam
  console.error(`[KOMMO] Todas as tentativas falharam para lead ${leadId} — retornando null`);
  return null;
}

// Helper: busca as notas do lead no Kommo e monta resumo para nota interna
async function getKommoLeadNotes(leadId: string): Promise<string> {
  try {
    const notesData = await kommoApi(`/leads/${leadId}/notes?limit=10`);
    if (!notesData) return 'Sem notas disponíveis.';
    const notes = notesData?._embedded?.notes;

    if (!notes || notes.length === 0) return '';

    const linhas = notes
      .filter((n: any) => n.note_type === 'common' || n.note_type === 'service_message')
      .slice(0, 5)
      .map((n: any) => `• ${n.params?.text || n.params?.service || ''}`)
      .filter((l: string) => l.trim() !== '•');

    if (linhas.length === 0) return '';

    return `📋 *Histórico do Kommo:*\n${linhas.join('\n')}`;
  } catch (err) {
    console.error('[KOMMO] Erro ao buscar notas do lead:', err);
    return '';
  }
}

// Webhook: recebe leads do Kommo CRM e distribui via Round-Robin
app.post('/api/kommo/webhook', async (req, res) => {
  try {
    // 1. VALIDAÇÃO DE CREDENCIAIS (já existente — manter)
    const kommoToken = process.env.KOMMO_LONG_LIVED_TOKEN;
    const kommoSubdomain = process.env.KOMMO_SUBDOMAIN;
    const kommoStatusIdLead = process.env.KOMMO_STATUS_ID_LEAD;
    if (!kommoToken || !kommoSubdomain) {
      console.error('[KOMMO WEBHOOK] Credenciais Kommo ausentes');
      return res.status(500).json({ error: 'Credenciais Kommo não configuradas' });
    }

    // 2. EXTRAIR LEADS APLICÁVEIS (já existente — manter lógica atual)
    const body = req.body;

    // PONTO 3: Log de estrutura do payload recebido — essencial para confirmar que o Kommo
    // está enviando webhook e em qual formato (leads.add / leads.status / leads.update)
    console.log(`[KOMMO WEBHOOK] ==== PAYLOAD RECEBIDO ====`);
    console.log(`[KOMMO WEBHOOK] Chaves do body: ${JSON.stringify(Object.keys(body))}`);
    console.log(`[KOMMO WEBHOOK] Chaves de body.leads: ${JSON.stringify(body.leads ? Object.keys(body.leads) : 'sem leads')}`);
    console.log(`[KOMMO WEBHOOK] Payload (500 chars): ${JSON.stringify(body).substring(0, 500)}`);

    const leadsAdd: any[] = body?.leads?.add || [];
    const leadsStatus: any[] = body?.leads?.status || [];
    const leadsUpdate: any[] = body?.leads?.update || [];

    const targetStatusId = kommoStatusIdLead ? parseInt(kommoStatusIdLead) : null;

    // PONTO 1: Log de todos os leads recebidos ANTES do filtro de status_id
    // Isso permite comparar os status_id brutos com KOMMO_STATUS_ID_LEAD nas Vercel Logs
    console.log(`[KOMMO WEBHOOK] ==== LEADS BRUTOS RECEBIDOS ====`);
    console.log(`[KOMMO WEBHOOK] KOMMO_STATUS_ID_LEAD configurado: ${kommoStatusIdLead} (parsed: ${targetStatusId})`);
    console.log(`[KOMMO WEBHOOK] leads.add (${leadsAdd.length}): ${JSON.stringify(leadsAdd.map((l: any) => ({ id: l.id, status_id: l.status_id, status_id_type: typeof l.status_id })))}`);
    console.log(`[KOMMO WEBHOOK] leads.status (${leadsStatus.length}): ${JSON.stringify(leadsStatus.map((l: any) => ({ id: l.id, status_id: l.status_id, status_id_type: typeof l.status_id, match: Number(l.status_id) === targetStatusId })))}`);
    console.log(`[KOMMO WEBHOOK] leads.update (${leadsUpdate.length}): ${JSON.stringify(leadsUpdate.map((l: any) => ({ id: l.id, status_id: l.status_id, status_id_type: typeof l.status_id, match: Number(l.status_id) === targetStatusId })))}`);

    const leadsToProcess = [
      ...leadsAdd,
      ...(targetStatusId
        ? leadsStatus.filter((l: any) => Number(l.status_id) === targetStatusId)
        : []),
      ...(targetStatusId
        ? leadsUpdate.filter((l: any) => Number(l.status_id) === targetStatusId)
        : []),
    ];

    console.log(`[KOMMO WEBHOOK] Leads que passaram pelo filtro: ${leadsToProcess.length} (de add: ${leadsAdd.length}, status filtrados: ${leadsStatus.filter((l:any) => Number(l.status_id) === targetStatusId).length}, update filtrados: ${leadsUpdate.filter((l:any) => Number(l.status_id) === targetStatusId).length})`);

    if (leadsToProcess.length === 0) {
      console.log('[KOMMO WEBHOOK] Nenhum lead aplicável no payload — ignorando.');
      return res.status(200).json({ ok: true });
    }

    console.log(`[KOMMO WEBHOOK] Total de leads para processar: ${leadsToProcess.length}`);

    // 3. BUSCAR EMPRESA ANTES DO res.200
    console.log('[KOMMO WEBHOOK] Buscando empresa MT Solar no banco...');
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, whatsapp_instance')
      .eq('id', 'e4bf6f22-6182-414d-afa4-c5449c014323')
      .single();

    console.log(`[KOMMO WEBHOOK] Empresa: ${company?.name ?? 'null'}, erro: ${companyError?.message ?? 'nenhum'}`);

    if (!company) {
      console.error('[KOMMO WEBHOOK] Empresa não encontrada — abortando.');
      return res.status(200).json({ ok: true });
    }

    // 5. PROCESSAMENTO DOS LEADS (usando variáveis já em memória)
    const companyId = company.id;
    for (const lead of leadsToProcess) {
      try {
        console.log(`[KOMMO WEBHOOK] Iniciando processamento do lead ${lead.id}`);
        const leadId = String(lead.id);
        console.log(`[KOMMO WEBHOOK] Processando lead ID: ${leadId}`);

      // 1. Busca dados do contato no Kommo (nome + telefone) com retry automático
      const contactResult = await getKommoLeadContact(leadId);

      // Se getKommoLeadContact retornou null (todas as tentativas falharam),
      // salva a conversa com dados parciais em vez de ignorar o lead
      let contactName: string | null = null;
      let contactPhone: string | null = null;

      if (contactResult === null) {
        console.warn(`[KOMMO WEBHOOK] Contato não encontrado para lead ${leadId} — salvando com dados parciais`);
        contactPhone = null; // sem telefone real disponível
      } else {
        contactName = contactResult.name;
        contactPhone = contactResult.phone;
      }

      if (!contactName || contactName.trim() === '' || contactName === 'Você') {
        try {
          const notasBot = await getKommoLeadNotes(leadId);
          let foundName = null;
          if (typeof notasBot === 'string') {
            const match = notasBot.match(/Nome:\s*([^\n]+)/i);
            if (match && match[1]) {
              foundName = match[1].trim();
            }
          }
          if (foundName && foundName !== 'Você') {
            contactName = foundName;
          } else {
            contactName = `Lead Kommo #${leadId}`;
          }
        } catch (e) {
          contactName = `Lead Kommo #${leadId}`;
        }
      }

      if (!contactPhone) {
        // Tenta usar telefone do payload do webhook se disponível
        const webhookPhone = lead.main_contact?.phone ||
          lead._embedded?.contacts?.[0]?.phone ||
          null;

        if (webhookPhone) {
          const rawPhone = String(webhookPhone);
          const digits = rawPhone.replace(/\D/g, '');
          if (digits.length === 10 || digits.length === 11) {
            contactPhone = `55${digits}`;
          } else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
            contactPhone = digits;
          } else {
            contactPhone = digits;
          }
          console.log(`[KOMMO] Telefone: original=${rawPhone} normalizado=${contactPhone}`);
          console.log(`[KOMMO WEBHOOK] Usando telefone do payload do webhook para lead ${leadId}: ${contactPhone}`);
        } else {
          // Salva sem telefone usando identificador do lead como "chave"
          // Usa um placeholder único para não bloquear a conversa
          contactPhone = `kommo-lead-${leadId}`;
          console.warn(`[KOMMO WEBHOOK] Lead ${leadId} sem telefone real — usando identificador temporário ${contactPhone}`);
        }
      }

      console.log(`[KOMMO WEBHOOK] Lead: ${contactName} | Telefone: ${contactPhone}`);

      // 2. Verifica se já existe conversa com esse telefone
      const { data: existingConv } = await supabaseAdmin
        .from('whatsapp_conversations')
        .select('id, contact_name')
        .eq('phone', contactPhone)
        .eq('company_id', companyId)
        .maybeSingle();

      if (existingConv) {
        if (contactPhone.startsWith('kommo-lead-')) {
          console.log(`[KOMMO WEBHOOK] Conversa duplicada evitada para lead sem telefone: ${existingConv.id}`);
          continue;
        }

        // Atualiza o nome se estava como "Você" ou null
        if (!existingConv.contact_name || existingConv.contact_name === 'Você') {
          await supabaseAdmin
            .from('whatsapp_conversations')
            .update({ contact_name: contactName })
            .eq('id', existingConv.id);
        }
        console.log(`[KOMMO WEBHOOK] Conversa já existe para ${contactPhone} — nome atualizado.`);

        // Mover lead no Kommo para coluna "CONVERSANDO"
        try {
          await kommoApi(
            `/leads/${lead.id}`,
            'PATCH',
            { status_id: 107282595 },
            8000
          );
          console.log(`[KOMMO WEBHOOK] Lead ${lead.id} movido para CONVERSANDO no Kommo`);
        } catch (kommoMoveErr: any) {
          console.warn(`[KOMMO WEBHOOK] Não foi possível mover lead no Kommo: ${kommoMoveErr.message}`);
        }

        continue;
      }

      // 3. Round-Robin — escolhe o vendedor com menos atendimentos ativos
      const vendedor = await getRoundRobinVendedor(companyId);

      // 4. Cria a conversa no CRM
      const instanceName = process.env.VITE_EVOLUTION_INSTANCE_ATENDIMENTO || 'atendimento-cliente';

      const isTempPhone = contactPhone.startsWith('kommo-lead-');
      const tagsToInsert = isTempPhone ? ['lead-sem-telefone'] : null;

      const insertPayload: any = {
        phone: contactPhone,
        company_id: companyId,
        contact_name: contactName,
        last_message: `Lead do Kommo — ${lead.name || 'Sem título'}`,
        last_message_at: new Date().toISOString(),
        status: vendedor ? 'in_progress' : 'waiting',
        assigned_to: vendedor?.id ?? null,
        assigned_name: vendedor?.name ?? null,
        assigned_at: vendedor ? new Date().toISOString() : null,
        instance: instanceName
      };

      if (tagsToInsert) {
        insertPayload.tags = tagsToInsert;
      }

      const { data: novaConversa, error: convError } = await supabaseAdmin
        .from('whatsapp_conversations')
        .insert(insertPayload)
        .select()
        .single();

      if (convError || !novaConversa) {
        console.error(`[KOMMO WEBHOOK] Erro ao criar conversa:`, convError?.message);
        continue;
      }

      if (isTempPhone) {
        console.log(`[KOMMO WEBHOOK] Conversa criada/encontrada para lead sem telefone: ${novaConversa.id}`);
      } else {
        console.log(`[KOMMO WEBHOOK] Conversa criada: ${novaConversa.id} → atribuída para ${vendedor?.name ?? 'fila'}`);

        // Mover lead no Kommo para coluna "CONVERSANDO"
        try {
          await kommoApi(
            `/leads/${lead.id}`,
            'PATCH',
            { status_id: 107282595 },
            8000
          );
          console.log(`[KOMMO WEBHOOK] Lead ${lead.id} movido para CONVERSANDO no Kommo`);
        } catch (kommoMoveErr: any) {
          console.warn(`[KOMMO WEBHOOK] Não foi possível mover lead no Kommo: ${kommoMoveErr.message}`);
        }
      }

      // 5. Busca histórico do bot e cria nota interna na conversa
      const notasBot = await getKommoLeadNotes(leadId);

      const notaInternaBase = [
        `🤖 *Lead capturado automaticamente do Kommo CRM*`,
        `📌 Lead: ${lead.name || 'Sem título'}`,
        contactName ? `👤 Nome: ${contactName}` : null,
        `📱 Telefone: ${contactPhone}`,
        vendedor ? `👨‍💼 Atribuído para: ${vendedor.name}` : `⏳ Aguardando atendente na fila`,
        notasBot ? `\n${notasBot}` : null
      ].filter(Boolean).join('\n');

      const notaInterna = isTempPhone
        ? `⚠️ *Lead ${leadId} recebido do Kommo sem telefone cadastrado.*\nVerifique o cadastro no Kommo e atualize o número manualmente.\n\n${notaInternaBase}`
        : notaInternaBase;

      await supabaseAdmin
        .from('whatsapp_messages')
        .insert({
          conversation_id: novaConversa.id,
          phone: contactPhone,
          message: notaInterna,
          from_me: true,
          is_internal: true,
          message_id: `kommo-lead-${leadId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'sent',
          company_id: companyId
        });

      // 6. Push notification para o vendedor escolhido
      if (vendedor) {
        await sendPushNotification(
          vendedor.id,
          '🌟 Novo Lead do Kommo',
          `${contactName || contactPhone} foi atribuído para você.`,
          { type: 'whatsapp_message', conversationId: novaConversa.id }
        );
      }

      console.log(`[KOMMO WEBHOOK] Lead ${leadId} processado com sucesso.`);
      } catch (err: any) {
        console.error(`[KOMMO WEBHOOK] Erro ao processar lead ${lead?.id}: ${err?.message || err}`);
        console.error(err?.stack || err);
      }
    }

    // res.200 SOMENTE AQUI — depois de tudo
    return res.status(200).json({ ok: true });
    
  } catch (err: any) {
    console.error(`[KOMMO WEBHOOK] Erro geral: ${err.message}`);
    console.error(err?.stack || err);
    return res.status(200).json({ ok: true }); // sempre 200 pro Kommo não fazer retry
  }
});

// Rota: corrige nomes "Você"/null buscando na API do Kommo pelo telefone (apenas CEO)
// e também corrige conversas com phone temporário 'kommo-lead-%' buscando na API do Kommo.
app.post('/api/kommo/fix-names', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Apenas CEO.' });

  try {
    const { data: conversas, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id, phone, contact_name')
      .eq('company_id', req.user.company_id)
      .or('contact_name.is.null,contact_name.eq.Você,contact_name.eq.,phone.like.kommo-lead-%');

    if (error) throw error;
    if (!conversas || conversas.length === 0) {
      return res.json({ fixed: 0, message: 'Nenhuma conversa para corrigir encontrada.' });
    }

    console.log(`[FIX-NAMES] ${conversas.length} conversas para correção encontradas.`);

    let fixedNames = 0;
    let fixedPhones = 0;
    let notFound = 0;

    for (const conv of conversas) {
      try {
        if (conv.phone.startsWith('kommo-lead-')) {
          const leadIdMatch = conv.phone.match(/kommo-lead-(\d+)/);
          if (leadIdMatch) {
            const leadId = leadIdMatch[1];
            const contactResult = await getKommoLeadContact(leadId);
            if (contactResult && contactResult.phone) {
              await supabaseAdmin
                .from('whatsapp_conversations')
                .update({ phone: contactResult.phone, contact_name: contactResult.name || conv.contact_name })
                .eq('id', conv.id);
              
              console.log(`[KOMMO FIX] Conversa ${conv.id}: phone atualizado de ${conv.phone} para ${contactResult.phone}`);
              fixedPhones++;
              if (!conv.contact_name || conv.contact_name === 'Você') fixedNames++;
            } else {
              console.log(`[KOMMO FIX] Lead ${leadId} ainda sem telefone — mantendo temporário`);
              notFound++;
            }
          } else {
            notFound++;
          }
        } else {
          // Correção apenas de nomes
          const phoneComCodigo = conv.phone.startsWith('55') ? conv.phone : `55${conv.phone}`;
          const phoneSemCodigo = conv.phone.startsWith('55') ? conv.phone.slice(2) : conv.phone;

          const resultado =
            await kommoApi(`/contacts?query=${phoneComCodigo}&limit=1`) ||
            await kommoApi(`/contacts?query=${phoneSemCodigo}&limit=1`);

          const contatos = resultado?._embedded?.contacts;
          if (!contatos || contatos.length === 0) { notFound++; continue; }

          const nome = contatos[0].name;
          if (!nome) { notFound++; continue; }

          await supabaseAdmin
            .from('whatsapp_conversations')
            .update({ contact_name: nome })
            .eq('id', conv.id);

          console.log(`[FIX-NAMES] ${conv.phone} → ${nome}`);
          fixedNames++;
        }

        // Pausa para não sobrecarregar a API do Kommo
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err: any) {
        console.error(`[FIX-NAMES] Erro ao processar ${conv.phone}:`, err.message);
      }
    }

    res.json({
      total: conversas.length,
      fixedNames,
      fixedPhones,
      notFound,
      message: `${fixedNames} nomes e ${fixedPhones} telefones atualizados, ${notFound} não encontrados no Kommo.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rota: lista todos os pipelines e seus respectivos statuses/etapas (apenas CEO)
// Útil para descobrir o ID da etapa "LEAD" para configurar KOMMO_STATUS_ID_LEAD
app.get('/api/kommo/pipeline-stages', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Apenas CEO.' });

  try {
    const pipelinesData = await kommoApi('/leads/pipelines', 'GET', undefined, 15000);
    if (!pipelinesData) {
      return res.status(500).json({ error: 'Falha ao buscar pipelines no Kommo' });
    }

    const pipelines = pipelinesData._embedded?.pipelines || [];
    const result = pipelines.map((p: any) => ({
      id: p.id,
      name: p.name,
      statuses: (p._embedded?.statuses || []).map((s: any) => ({
        id: s.id,
        name: s.name
      }))
    }));

    res.json({ pipelines: result });
  } catch (err: any) {
    console.error('[KOMMO PIPELINES] Erro ao buscar pipelines:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Rota: diagnóstico manual de lead específico do Kommo (apenas CEO)
// Permite inspecionar por que um lead específico não entrou no sistema
app.get('/api/kommo/check-lead/:leadId', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Apenas CEO.' });

  const { leadId } = req.params;
  const companyId = req.user.company_id;

  const diagnostico: any = {
    leadId,
    etapa_falha: null,
    lead_kommo: null,
    conversa_existente: null,
    simulacao: []
  };

  try {
    // (a) Dados brutos do lead no Kommo
    diagnostico.simulacao.push('Buscando lead na API do Kommo...');
    const leadData = await kommoApi(`/leads/${leadId}?with=contacts`);
    if (!leadData) {
      diagnostico.etapa_falha = 'kommo_api_retornou_null';
      diagnostico.simulacao.push('FALHA: kommoApi retornou null para o lead. Token expirado ou lead inválido.');
      return res.json(diagnostico);
    }
    diagnostico.lead_kommo = {
      id: leadData.id,
      name: leadData.name,
      status_id: leadData.status_id,
      pipeline_id: leadData.pipeline_id,
      contacts_embedded: leadData._embedded?.contacts?.map((c: any) => ({ id: c.id, name: c.name })) || []
    };
    diagnostico.simulacao.push(`Lead encontrado: "${leadData.name}" (status_id: ${leadData.status_id})`);

    // Verificar se status_id bate com o filtro configurado
    const kommoStatusIdLead = process.env.KOMMO_STATUS_ID_LEAD;
    const targetStatusId = kommoStatusIdLead ? parseInt(kommoStatusIdLead) : null;
    const statusMatch = targetStatusId ? Number(leadData.status_id) === targetStatusId : false;
    diagnostico.simulacao.push(`KOMMO_STATUS_ID_LEAD=${kommoStatusIdLead} | status_id do lead=${leadData.status_id} | bate com filtro: ${statusMatch}`);
    if (!statusMatch) {
      diagnostico.simulacao.push(`ATENÇÃO: Este lead NÃO passaria pelo filtro de status_id do webhook. Ele só seria processado se viesse em leads.add (novo lead), ou se seu status_id (${leadData.status_id}) fosse igual a KOMMO_STATUS_ID_LEAD (${kommoStatusIdLead}).`);
    }

    // (b) Buscar contato e telefone via getKommoLeadContact
    diagnostico.simulacao.push('Buscando contato via getKommoLeadContact...');
    const contactResult = await getKommoLeadContact(leadId);
    diagnostico.simulacao.push(`Resultado de getKommoLeadContact: ${JSON.stringify(contactResult)}`);

    const contactPhone = contactResult?.phone || `kommo-lead-${leadId}`;
    const contactName = contactResult?.name || `Lead Kommo #${leadId}`;
    diagnostico.simulacao.push(`Telefone que seria usado: ${contactPhone} | Nome: ${contactName}`);

    // (c) Verificar se já existe conversa com esse telefone
    diagnostico.simulacao.push('Verificando conversa existente no banco...');
    const { data: existingConv } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id, contact_name, status, assigned_to, created_at')
      .eq('phone', contactPhone)
      .eq('company_id', companyId)
      .maybeSingle();

    if (existingConv) {
      diagnostico.conversa_existente = existingConv;
      diagnostico.simulacao.push(`Conversa já existe: ID ${existingConv.id} (status: ${existingConv.status}). O webhook atualizaria apenas o nome se necessário.`);
    } else {
      diagnostico.conversa_existente = null;
      diagnostico.simulacao.push(`Nenhuma conversa encontrada para phone="${contactPhone}". O webhook criaria uma nova conversa.`);

      // Simular o round-robin para ver qual vendedor seria escolhido
      const vendedor = await getRoundRobinVendedor(companyId);
      diagnostico.simulacao.push(`Round-Robin escolheria: ${vendedor ? `${vendedor.name} (id: ${vendedor.id})` : 'nenhum vendedor elegível — fila de espera'}`);
    }

    return res.json(diagnostico);
  } catch (err: any) {
    diagnostico.etapa_falha = 'excecao_inesperada';
    diagnostico.simulacao.push(`ERRO: ${err.message}`);
    return res.status(500).json(diagnostico);
  }
});

// ============================================================
// FIM — INTEGRAÇÃO KOMMO CRM
// ============================================================

// Cron: verifica inatividade de conversas e notifica/encerra automaticamente
app.get('/api/cron/check-inatividade', async (req, res) => {
  try {
    const agora = new Date();

    // Data de corte para alerta (10 dias atrás)
    const alertaCutoff = new Date(agora);
    alertaCutoff.setDate(alertaCutoff.getDate() - 10);

    // Data de corte para encerramento (30 dias atrás)
    const encerramentoCutoff = new Date(agora);
    encerramentoCutoff.setDate(encerramentoCutoff.getDate() - 30);

    // Busca conversas in_progress com last_message_at preenchido
    const { data: conversas, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id, phone, contact_name, assigned_to, last_message_at, company_id')
      .eq('status', 'in_progress')
      .not('last_message_at', 'is', null)
      .lte('last_message_at', alertaCutoff.toISOString());

    if (error) throw error;
    if (!conversas || conversas.length === 0) {
      return res.json({ alertas: 0, encerradas: 0 });
    }

    let alertas = 0;
    let encerradas = 0;

    for (const conv of conversas) {
      const ultimaMensagem = new Date(conv.last_message_at);
      const diasSemInteracao = Math.floor(
        (agora.getTime() - ultimaMensagem.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasSemInteracao >= 30) {
        // ENCERRAR automaticamente
        await supabaseAdmin
          .from('whatsapp_conversations')
          .update({
            status: 'closed',
            assigned_to: null,
            assigned_name: null,
            assigned_at: null
          })
          .eq('id', conv.id);

        // Inserir mensagem interna de encerramento
        await supabaseAdmin
          .from('whatsapp_messages')
          .insert({
            conversation_id: conv.id,
            phone: conv.phone,
            message: `⚠️ Atendimento encerrado automaticamente por inatividade de ${diasSemInteracao} dias sem interação.`,
            from_me: true,
            is_internal: true,
            message_id: `auto-close-${conv.id}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: 'sent',
            company_id: conv.company_id
          });

        encerradas++;
        console.log(`[INATIVIDADE] Conversa ${conv.id} encerrada após ${diasSemInteracao} dias.`);

      } else if (diasSemInteracao >= 10 && conv.assigned_to) {
        // ALERTAR o vendedor via push
        const nomeContato = conv.contact_name || conv.phone;
        await sendPushNotification(
          conv.assigned_to,
          '⚠️ Cliente sem resposta',
          `${nomeContato} está há ${diasSemInteracao} dias sem interação.`,
          { type: 'whatsapp_message', conversationId: conv.id }
        );

        alertas++;
        console.log(`[INATIVIDADE] Alerta enviado para vendedor ${conv.assigned_to} — conversa ${conv.id} inativa há ${diasSemInteracao} dias.`);
      }
    }

    res.json({ alertas, encerradas });
  } catch (err: any) {
    console.error('[INATIVIDADE CRON] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Transferir conversa para vendedor específico (apenas CEO)
app.post('/api/whatsapp/transfer-to-agent', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.status(403).json({ error: 'Apenas CEO pode transferir para agente específico.' });

  const { conversationId, targetUserId } = req.body;

  if (!conversationId || !targetUserId) {
    return res.status(400).json({ error: 'conversationId e targetUserId são obrigatórios.' });
  }

  try {
    // Busca dados do vendedor destino
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, push_token')
      .eq('id', targetUserId)
      .eq('company_id', req.user.company_id)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'Vendedor não encontrado.' });
    }

    // Atualiza a conversa com o novo responsável
    const { error: updateError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .update({
        assigned_to: targetUser.id,
        assigned_name: targetUser.name,
        assigned_at: new Date().toISOString(),
        status: 'in_progress'
      })
      .eq('id', conversationId)
      .eq('company_id', req.user.company_id);

    if (updateError) throw updateError;

    // Busca dados da conversa para nota e notificação
    const { data: conv } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('phone, contact_name')
      .eq('id', conversationId)
      .single();

    // Inserir nota interna informando a transferência
    await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        phone: conv?.phone || '',
        message: `🔄 Atendimento transferido pelo CEO para ${targetUser.name}.`,
        from_me: true,
        is_internal: true,
        message_id: `transfer-agent-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'sent',
        company_id: req.user.company_id
      });

    // Push notification para o vendedor que recebeu
    await sendPushNotification(
      targetUser.id,
      '📩 Atendimento transferido',
      `O CEO transferiu o atendimento de ${conv?.contact_name || conv?.phone} para você.`,
      { type: 'whatsapp_message', conversationId }
    );

    res.json({ success: true, assignedTo: targetUser.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for API routes to prevent falling through to SPA HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ 
    error: `Rota não encontrada no Backend`,
    method: req.method,
    path: req.path
  });
});

// Vite Integration
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[BACKEND] Servidor rodando em http://localhost:${PORT}`);
  });
}

export default app;
