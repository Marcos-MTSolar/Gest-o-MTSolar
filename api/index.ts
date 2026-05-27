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
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
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

// Helper to upload file to Supabase Storage
async function uploadFile(file: Express.Multer.File, bucket: string = 'uploads'): Promise<string | null> {
  try {
    const filename = `${Date.now()}-${file.originalname}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      console.error(`Supabase Storage Upload Error (Bucket: ${bucket}):`, error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filename);
    return publicUrlData.publicUrl;
  } catch (e) {
    console.error('Upload helper error:', e);
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
  const { data: users } = await supabase.from('users').select('id, name, email, role, active, created_at').eq('company_id', req.user.company_id);
  res.json(users);
});

app.post('/api/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO') return res.sendStatus(403);
  const { name, email, password, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, password_hash: hash, role, company_id: req.user.company_id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });


  res.json({ id: data.id });
});

app.put('/api/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CEO' && req.user.role !== 'ADMIN') return res.sendStatus(403);

  const { name, email, role, active, password } = req.body;
  const updates: any = { name, email, role, active: active ? true : false };

  if (password) {
    updates.password_hash = bcrypt.hashSync(password, 10);
  }

  await supabase.from('users').update(updates).eq('id', req.params.id).eq('company_id', req.user.company_id);


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

// Helper to send push notifications via FCM
async function sendPushNotification(userId: number, title: string, body: string) {
  try {
    const { data: user } = await supabase.from('users').select('push_token').eq('id', userId).single();
    if (!user?.push_token) {
      console.log(`[PUSH] User ${userId} has no push token registered.`);
      return;
    }

    console.log(`[PUSH] Sending to User ${userId}: ${title}`);
    
    if (admin.apps.length > 0) {
      const message = {
        notification: { title, body },
        token: user.push_token,
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'default',
            icon: 'stock_ticker_update', // Should match your app icon resource
            color: '#001F3F'
          }
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // Legacy but sometimes helps
          userId: String(userId)
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
    name, phone, email, address, city, state, cpf_cnpj,
    proposal_value, payment_method, kit_supplier, pendencies, notes, finance_grace_period 
  } = req.body;

  try {
    const { data: client, error } = await supabase
      .from('clients')
      .insert({ name, phone, email, address, city, state, cpf_cnpj, created_by: req.user.id, company_id: req.user.company_id })
      .select()
      .single();

    if (error) throw error;

    // Initial Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ 
        client_id: client.id, 
        client_name: name, // Persiste o nome para histórico
        title: `Projeto Solar - ${name}`, 
        status: 'pending',
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
  const { name, phone, email, address, city, state, cpf_cnpj } = req.body;
  await supabase.from('clients')
    .update({ name, phone, email, address, city, state, cpf_cnpj })
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id);
  res.json({ success: true });
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
      clients (name, phone, address, city, state),
      commercial_data (*),
      technical_data (*)
    `)
    .eq('id', req.params.id)
    .eq('company_id', req.user.company_id)
    .single();

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { data: documents } = await supabase.from('documents').select('*').eq('project_id', project.id);

  // Flatten
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
    const { data: proj } = await supabase.from('projects').select('client_name').eq('id', req.params.id).eq('company_id', req.user.company_id).single();
    await supabase.from('projects').update({ current_stage: 'inspection', status: 'proposta_enviada', updated_at: new Date() }).eq('id', req.params.id).eq('company_id', req.user.company_id);
    
    // Notify all technical users (since they all see the technical queue)
    const { data: techUsers } = await supabase.from('users').select('id').eq('role', 'TECHNICAL');
    if (techUsers) {
      for (const u of techUsers) {
        await sendPushNotification(u.id, 'Novo Projeto', `Um novo projeto para ${proj?.client_name || 'Cliente'} está disponível para vistoria.`);
      }
    }
  } else if (status === 'pendente_comercial') {
    await supabase.from('projects').update({ status: 'pendente_comercial', updated_at: new Date() }).eq('id', req.params.id).eq('company_id', req.user.company_id);
  }


  res.json({ success: true });
});

// Kit Purchase Update
app.put('/api/projects/:id/kit', authenticateToken, async (req: any, res) => {
  const { kit_purchased, inverter_model, inverter_power, module_model, module_power } = req.body;

  // Let's assume these columns might not exist if we missed a migration, but KitPurchase requires them.
  // We'll update projects table. If it fails, we catch the error gracefully vs crashing.
  try {
    const updatePayload: any = {
      kit_purchased,
      updated_at: new Date()
    };

    // Some schemas put these in technical_data. We'll try to put them in technical_data.
    await supabase.from('technical_data').update({
      inverter_model, inverter_power, module_model, module_power, updated_at: new Date()
    }).eq('project_id', req.params.id).eq('company_id', req.user.company_id);

    // Update main project status
    await supabase.from('projects').update({ ...updatePayload, status: 'kit_definido' }).eq('id', req.params.id).eq('company_id', req.user.company_id);


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
      const url = await uploadFile(file);
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

  // Update project stage when vistoria is finalized â€” goes directly to homologation
  if (status === 'vistoria_concluida') {
    await supabase.from('projects').update({ current_stage: 'homologation', status: 'vistoria_concluida', updated_at: new Date() }).eq('id', req.params.id).eq('company_id', req.user.company_id);
  }


  res.json({ success: true });
});


// Installation Update - Receives metadata and URLs from frontend to avoid 413 error
app.put('/api/projects/:id/installation', authenticateToken, async (req: any, res) => {
  try {
    const { pendencies, status, ...photoUrls } = req.body;
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
      updated_at: new Date() 
    };

    console.log('Executando update em technical_data com:', updates);
    const { error: techError } = await supabase.from('technical_data').update(updates).eq('project_id', projectId).eq('company_id', req.user.company_id);
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

      // Atualiza o projeto para finalizado
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

      // 2. Exclusão das propostas do storage
      try {
        const { data: proposals } = await supabase.from('proposal_history').select('url_arquivo').eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        if (proposals && proposals.length > 0) {
          const proposalFiles = proposals.map(p => p.url_arquivo?.split('/').pop()).filter(Boolean) as string[];
          if (proposalFiles.length > 0) {
            console.log(`Excluindo ${proposalFiles.length} propostas do storage para o projeto ${req.params.id}`);
            await supabase.storage.from('propostas').remove(proposalFiles);
          }
          await supabase.from('proposal_history').delete().eq('project_id', req.params.id).eq('company_id', req.user.company_id);
        }
      } catch (e) {
        console.error(`[DELETE ERROR] Erro ao excluir propostas:`, e);
      }

      // 3. Exclusão dos dados comerciais
      try {
        console.log(`Removendo dados comerciais para o projeto ${req.params.id}`);
        await supabase.from('commercial_data').delete().eq('project_id', req.params.id).eq('company_id', req.user.company_id);
      } catch (e) {
        console.error(`[DELETE ERROR] Erro ao excluir commercial_data:`, e);
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
        console.error(`[DELETE ERROR] Erro ao limpar dados do cronograma:`, e);
      }

      // 5. Exclusão dos dados sensíveis do cliente (tabela clients)
      if (projData?.client_id) {
        try {
          console.log(`Finalizando projeto ${req.params.id}. Removendo dados do cliente ${projData.client_id}`);
          await supabase.from('projects').update({ client_id: null }).eq('id', req.params.id).eq('company_id', req.user.company_id);
          await supabase.from('clients').delete().eq('id', projData.client_id).eq('company_id', req.user.company_id);
        } catch (e) {
          console.error(`[DELETE ERROR] Erro ao limpar dados do cliente:`, e);
        }
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

  // Buscar a conversa para verificar status e responsável
  const { data: conv, error: convError } = await supabase
    .from('whatsapp_conversations')
    .select('id, status, assigned_to, assigned_name, company_id')
    .eq('id', conversationId)
    .eq('company_id', req.user.company_id)
    .single();

  if (convError || !conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  // Validação de bloqueio: conversa em atendimento por outro agente
  if (
    conv.status === 'in_progress' &&
    conv.assigned_to !== null &&
    Number(conv.assigned_to) !== Number(req.user.id) &&
    req.user.role !== 'CEO'
  ) {
    return res.status(403).json({
      error: 'CONVERSATION_LOCKED',
      assignedTo: conv.assigned_name || 'Outro agente'
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

// Helper: Validar se a conversa está bloqueada para o usuário
async function checkConversationLock(conversationId: string, userId: number, userRole: string, companyId: string): Promise<{ locked: boolean; assignedTo?: string }> {
  if (!conversationId) return { locked: false };
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('status, assigned_to, assigned_name')
    .eq('id', conversationId)
    .eq('company_id', companyId)
    .single();
  if (
    conv?.status === 'in_progress' &&
    conv?.assigned_to !== null &&
    Number(conv?.assigned_to) !== Number(userId) &&
    userRole !== 'CEO'
  ) {
    return { locked: true, assignedTo: conv?.assigned_name || 'Outro agente' };
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
      const lockCheck = await checkConversationLock(conversationId, req.user.id, req.user.role, req.user.company_id);
      if (lockCheck.locked) {
        return res.status(403).json({ error: 'CONVERSATION_LOCKED', assignedTo: lockCheck.assignedTo });
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
      const audioFileName = `${req.user.company_id}/${conversationId}/audio-${Date.now()}.ogg`;
      await supabaseAdmin.storage
        .from('whatsapp-media')
        .upload(audioFileName, audioBuffer, {
          contentType: 'audio/ogg',
          upsert: false
        });
      const { data: audioPublicUrlData } = supabaseAdmin.storage
        .from('whatsapp-media')
        .getPublicUrl(audioFileName);
      const audioPublicUrl = audioPublicUrlData.publicUrl;

      await supabase.from('whatsapp_messages').insert({
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
      });

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
    const { error: uploadError } = await supabaseAdmin.storage
      .from('whatsapp-media')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error("[WA UPLOAD] Erro no upload do Supabase:", uploadError);
      throw uploadError;
    }

    const { data: signedUrlData, error: signedError } = await supabaseAdmin.storage
      .from('whatsapp-media')
      .createSignedUrl(filePath, 600);

    if (signedError) {
      console.error("[WA UPLOAD] Erro ao gerar URL assinada:", signedError);
      throw signedError;
    }

    console.log(`[WA UPLOAD] Upload concluído: ${filePath}. URL assinada gerada.`);
    res.json({ mediaUrl: signedUrlData.signedUrl, filePath });
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

  try {
    let instance = null;
    if (conversationId) {
      const { data: conv } = await supabase.from('whatsapp_conversations').select('instance').eq('id', conversationId).eq('company_id', req.user.company_id).single();
      if (conv) instance = conv.instance;
    }

    // Validação de bloqueio de conversa
    if (conversationId) {
      const lockCheck = await checkConversationLock(conversationId, req.user.id, req.user.role, req.user.company_id);
      if (lockCheck.locked) {
        return res.status(403).json({ error: 'CONVERSATION_LOCKED', assignedTo: lockCheck.assignedTo });
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
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      await supabase.from('whatsapp_messages').insert({
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
      });

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
      const lockCheck = await checkConversationLock(conversationId, req.user.id, req.user.role, req.user.company_id);
      if (lockCheck.locked) {
        return res.status(403).json({ error: 'CONVERSATION_LOCKED', assignedTo: lockCheck.assignedTo });
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
      await supabase.from('whatsapp_messages').insert({
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
      });

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
      await supabase.from('whatsapp_messages').insert({
        conversation_id: targetConvId,
        phone: conv.phone,
        message: `📌 NOTA DE TRANSFERÊNCIA: ${internalNote.trim()}`,
        from_me: true,
        is_internal: true,
        timestamp: new Date().toISOString(),
        instance: creds.instanceName,
        company_id: req.user.company_id
      });
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
    await supabase.from('whatsapp_messages').insert({
      conversation_id: targetConvId,
      phone: conv.phone,
      message: farewellMsg,
      from_me: true,
      timestamp: new Date().toISOString(),
      status: 'sent',
      instance: originCreds.instanceName,
      company_id: req.user.company_id
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[TRANSFER ERROR] Error transferring instance:", err);
    res.status(400).json({ error: err.message });
  }
});


app.post('/api/webhooks/whatsapp', async (req, res) => {
  const body = req.body;
  console.log('[WA-WEBHOOK] payload recebido:', JSON.stringify(req.body).slice(0, 500));

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

  // 4. Fallback final (MT Solar) se nada funcionar
  if (!companyId) {
    console.error('[WEBHOOK FALLBACK] ATENÇÃO: instance_name não encontrado em company_instances nem em companies:', instanceName);
    console.error('[WEBHOOK FALLBACK] Verifique se a instância está cadastrada na tabela company_instances.');
    // NÃO processar mensagem de instância desconhecida — retornar 200 para não gerar retries
    return res.status(200).json({ success: false, error: 'Instance not mapped to any company' });
  }

  console.log('[WEBHOOK] company_id resolvido:', companyId, 'para instância:', instanceName);

  if (!companyId) {
    console.error('[WEBHOOK] Erro: Não foi possível resolver o company_id para a instância:', instanceName);
    return res.status(200).json({ success: false, error: 'Company not found' }); // Return 200 to avoid Evolution API retries
  }
  
  // Logic to handle incoming message from Evolution API
  if (body.event === 'messages.upsert') {
    const message = body.data;
    const phone = message.key.remoteJid.split('@')[0];
    const fromMe = message.key.fromMe;
    const messageId = message.key.id;
    const pushName = message.pushName || null;

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

        const uploadResult = await supabaseAdmin.storage
          .from('whatsapp-media')
          .upload(storagePath, buffer, { contentType, upsert: true });
        console.log('[WA-UPLOAD] resultado:', JSON.stringify(uploadResult).slice(0, 200));
        const { error: uploadError } = uploadResult;

        if (uploadError) {
          console.warn('[WEBHOOK MEDIA] Erro no upload para Supabase Storage:', uploadError.message, '— usando URL original.');
          return fallbackUrl;
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('whatsapp-media')
          .getPublicUrl(storagePath);

        console.log(`[WEBHOOK MEDIA] Upload concluído. URL pública: ${publicUrlData.publicUrl}`);
        return publicUrlData.publicUrl;
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

          const { data: updated } = await supabase
            .from('whatsapp_conversations')
            .update({
              contact_name: pushName || existingConv.contact_name,
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
          const { data: inserted, error: insertError } = await supabase
            .from('whatsapp_conversations')
            .insert({
              phone,
              company_id: companyId,
              contact_name: pushName || null,
              last_message: text,
              last_message_at: new Date().toISOString(),
              status: fromMe ? 'in_progress' : 'waiting',
              instance: instanceName
            })
            .select()
            .single();

          if (insertError) {
            console.error('[WEBHOOK ERROR] Falha ao criar conversa:', insertError.message);
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
          const { error: msgError } = await supabase.from('whatsapp_messages').insert({
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
          });

          if (msgError) {
            console.error('[WEBHOOK ERROR] Falha ao salvar mensagem:', msgError.message, msgError.details);
          } else {
            console.log('[WEBHOOK] Mensagem salva com sucesso');
          }
        } catch (err: any) {
          console.error('[WEBHOOK ERROR] Erro inesperado ao salvar mensagem:', err.message, err.details);
        }

        // 3. Push Notification for Agents
        if (conv?.assigned_to && !fromMe) {
          await sendPushNotification(conv.assigned_to, 'WhatsApp', `Nova mensagem de ${conv.contact_name || phone}: ${text.substring(0, 50)}...`);
        } else if (!fromMe) {
          // If not assigned, maybe notify admins? 
          // (Implementation detail: usually we don't spam everyone, but here we could)
        }
      }
    }
  }

  res.json({ success: true });
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
  const { data: history, error } = await supabase
    .from('proposal_history')
    .select('*')
    .eq('company_id', req.user.company_id)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(history || []);
});

// Propostas Ativas (7 dias)
app.get('/api/proposals-active', authenticateToken, async (req: any, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('company_id', req.user.company_id)
    .gte('created_at', sevenDaysAgo)
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
  
  // Define data de expiração para 7 dias a partir de agora
  const data_geracao = new Date();
  const data_expiracao = new Date();
  data_expiracao.setDate(data_geracao.getDate() + 7);

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
    const { data: protocols, error } = await supabase
      .from('neoenergia_protocols')
      .select('*')
      .eq('company_id', req.user.company_id)
      .or(`resolved_at.is.null,resolved_at.gt.${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(protocols || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
  // Count all projects that are not completed
  const { count: totalProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('company_id', req.user.company_id);
  const { count: completedProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true })
    .eq('company_id', req.user.company_id)
    .or('status.eq.completed,current_stage.eq.completed');
  const { count: pendingInspections } = await supabase.from('projects').select('*', { count: 'exact', head: true })
    .eq('company_id', req.user.company_id)
    .eq('current_stage', 'inspection');
  const { count: pendingInstallations } = await supabase.from('projects').select('*', { count: 'exact', head: true })
    .eq('company_id', req.user.company_id)
    .eq('current_stage', 'installation');

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
    .select('id, client_name, title, schedule_order, schedule_notes, schedule_status, schedule_issue_notes, current_stage, company_id')
    .eq('company_id', req.user.company_id)
    .neq('current_stage', 'completed')
    .order('schedule_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(projects || []);
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
  try {
    console.log('Iniciando limpeza de propostas expiradas...');
    const { data: expired, error: fetchError } = await supabase
      .from('proposal_history')
      .select('id, url_arquivo')
      .lt('data_expiracao', new Date().toISOString());
    
    if (fetchError) {
      console.error('Erro ao buscar propostas expiradas:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar propostas' });
    }

    if (expired && expired.length > 0) {
      const filesToDelete = expired
        .map(p => p.url_arquivo?.split('/').pop())
        .filter(Boolean) as string[];

      if (filesToDelete.length > 0) {
        console.log(`Deletando ${filesToDelete.length} arquivos do storage bucket 'propostas'`);
        const { error: storageError } = await supabase.storage.from('propostas').remove(filesToDelete);
        if (storageError) console.error('Erro ao deletar arquivos do storage:', storageError);
      }

      const { error: deleteError } = await supabase.from('proposal_history').delete().in('id', expired.map(p => p.id));
      if (deleteError) console.error('Erro ao deletar registros do banco:', deleteError);
      
      console.log(`Limpeza concluída. ${expired.length} propostas removidas.`);
      res.json({ message: `Sucesso! ${expired.length} propostas expiradas foram removidas.` });
    } else {
      console.log('Nenhuma proposta expirada encontrada.');
      res.json({ message: 'Nenhuma proposta expirada para remover.' });
    }
  } catch (err) {
    console.error('Erro catastrófico na limpeza de propostas:', err);
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
