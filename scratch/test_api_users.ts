import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function runTests() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Buscar um usuário CEO e um usuário ADMIN no banco para fins de teste
  const { data: dbUsers, error: dbError } = await supabase
    .from('users')
    .select('id, email, role, name, company_id')
    .limit(50);

  if (dbError || !dbUsers) {
    console.error('Erro ao buscar usuários do banco para teste:', dbError);
    return;
  }

  const ceoUser = dbUsers.find(u => u.role === 'CEO');
  const adminUser = dbUsers.find(u => u.role === 'ADMIN');

  console.log('Usuário CEO encontrado:', ceoUser?.email, 'Company ID:', ceoUser?.company_id);
  console.log('Usuário ADMIN encontrado:', adminUser?.email, 'Company ID:', adminUser?.company_id);

  if (!ceoUser) {
    console.error('Nenhum CEO encontrado para o teste.');
    return;
  }

  // 2. Testar Login como CEO
  console.log('\n--- TESTANDO LOGIN COMO CEO ---');
  let tokenCeo = '';
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: ceoUser.email,
      password: 'admin123'
    });
    tokenCeo = loginRes.data.token;
    console.log('Login CEO bem-sucedido! Token obtido.');
  } catch (err: any) {
    console.log('Falha no login com senha de produção, tentando fallback ceo@mtsolar.com...');
    try {
      const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'ceo@mtsolar.com',
        password: 'admin123'
      });
      tokenCeo = loginRes.data.token;
      console.log('Login com fallback CEO bem-sucedido!');
    } catch (e: any) {
      console.error('Falha crítica no login do CEO:', e.response?.data || e.message);
      return;
    }
  }

  // 3. Testar GET /api/users como CEO
  console.log('\n--- TESTANDO GET /api/users COMO CEO ---');
  try {
    const usersRes = await axios.get('http://localhost:3000/api/users', {
      headers: { Authorization: `Bearer ${tokenCeo}` }
    });
    console.log('GET /api/users retornado com sucesso!');
    console.log(`Quantidade de usuários listados: ${usersRes.data.length}`);
    if (usersRes.data.length > 0) {
      console.log('Exemplo de usuário retornado:', {
        id: usersRes.data[0].id,
        name: usersRes.data[0].name,
        role: usersRes.data[0].role,
        cpf: usersRes.data[0].cpf,
        cargo: usersRes.data[0].cargo
      });
    }
  } catch (err: any) {
    console.error('Erro no GET /api/users:', err.response?.data || err.message);
  }

  // 4. Testar POST /api/users como CEO
  console.log('\n--- TESTANDO POST /api/users (CADASTRO) COMO CEO ---');
  const tempEmail = `temp_${Date.now()}@mtsolar.com`;
  let tempUserId: number | null = null;
  try {
    const createRes = await axios.post('http://localhost:3000/api/users', {
      name: 'Funcionário Teste Fallback',
      email: tempEmail,
      password: 'senha123_teste',
      role: 'TECHNICAL',
      cpf: '111.222.333-44',
      cargo: 'Técnico de Campo',
      data_admissao: '2026-06-01'
    }, {
      headers: { Authorization: `Bearer ${tokenCeo}` }
    });
    tempUserId = createRes.data.id;
    console.log('Cadastro de funcionário bem-sucedido! ID criado:', tempUserId);
  } catch (err: any) {
    console.error('Erro no POST /api/users:', err.response?.data || err.message);
  }

  // 5. Testar se o ADMIN tem permissão de cadastro agora (POST /api/users)
  if (adminUser) {
    console.log('\n--- TESTANDO LOGIN COMO ADMIN ---');
    let tokenAdmin = '';
    const jwtSecret = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
    tokenAdmin = jwt.sign({
      id: adminUser.id,
      role: 'ADMIN',
      name: adminUser.name,
      company_id: adminUser.company_id || ceoUser.company_id
    }, jwtSecret, { expiresIn: '1h' });

    console.log('Token de ADMIN gerado localmente.');

    console.log('\n--- TESTANDO POST /api/users (CADASTRO) COMO ADMIN ---');
    const tempEmailAdmin = `temp_admin_${Date.now()}@mtsolar.com`;
    let tempUserIdAdmin: number | null = null;
    try {
      const createRes = await axios.post('http://localhost:3000/api/users', {
        name: 'Funcionário Teste ADMIN',
        email: tempEmailAdmin,
        password: 'senha123_teste',
        role: 'COMMERCIAL',
        cpf: '555.666.777-88',
        cargo: 'Vendedor',
        data_admissao: '2026-06-01'
      }, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      tempUserIdAdmin = createRes.data.id;
      console.log('Cadastro de funcionário por ADMIN bem-sucedido! ID criado:', tempUserIdAdmin);
    } catch (err: any) {
      console.error('Erro no POST /api/users como ADMIN:', err.response?.data || err.message);
    }

    // Limpar usuário criado por ADMIN
    if (tempUserIdAdmin) {
      await supabase.from('users').delete().eq('id', tempUserIdAdmin);
      console.log('Usuário temporário criado por ADMIN deletado do banco.');
    }
  }

  // Limpar usuário criado por CEO
  if (tempUserId) {
    await supabase.from('users').delete().eq('id', tempUserId);
    console.log('Usuário temporário criado por CEO deletado do banco.');
  }
}

runTests();
