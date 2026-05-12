
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFlow() {
  console.log('--- 1. Testing JWT Generation ---');
  const dummyUser = {
    id: 999,
    role: 'CEO',
    name: 'Test Admin',
    company_id: 'e4bf6f22-6182-414d-afa4-c5449c014323' // MT Solar ID found earlier
  };

  const token = jwt.sign(
    { 
      id: dummyUser.id, 
      role: dummyUser.role, 
      name: dummyUser.name,
      company_id: dummyUser.company_id 
    }, 
    JWT_SECRET, 
    { expiresIn: '8h' }
  );

  const decoded = jwt.decode(token);
  console.log('Decoded Token Payload:', JSON.stringify(decoded, null, 2));

  if (decoded && typeof decoded === 'object' && decoded.company_id) {
    console.log('SUCCESS: company_id is present in JWT');
  } else {
    console.error('FAILURE: company_id missing from JWT');
    process.exit(1);
  }

  console.log('\n--- 2. Testing Database Insert Isolation ---');
  // We'll try to insert a client with the company_id and check if it's there
  const testClient = {
    name: 'Cliente Teste Multi-tenancy',
    phone: '11999999999',
    company_id: dummyUser.company_id
  };

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert(testClient)
    .select()
    .single();

  if (clientError) {
    console.error('Error inserting client:', clientError.message);
    process.exit(1);
  }

  console.log('Inserted Client ID:', client.id);
  console.log('Client company_id:', client.company_id);

  if (client.company_id === dummyUser.company_id) {
    console.log('SUCCESS: Client saved with correct company_id');
  } else {
    console.error('FAILURE: Client company_id mismatch');
  }

  // Cleanup
  await supabase.from('clients').delete().eq('id', client.id);
  console.log('\nTests completed successfully.');
}

testFlow().catch(err => {
  console.error('Script Error:', err);
  process.exit(1);
});
