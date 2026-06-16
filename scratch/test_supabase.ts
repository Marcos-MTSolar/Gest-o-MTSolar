import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testQueryErrors() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('--- TESTANDO SELECT COM COLUNAS QUE NÃO EXISTEM ---');
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, active, created_at, cpf, cargo, data_admissao');

  if (error) {
    console.log('Objeto de erro retornado pelo Supabase:');
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('Details:', error.details);
    console.log('Hint:', error.hint);
  } else {
    console.log('Sucesso surpreendente! Data:', data);
  }
}

testQueryErrors();
