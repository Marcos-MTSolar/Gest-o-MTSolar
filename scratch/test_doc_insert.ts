import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testDocInsert() {
  const { data, error } = await supabase.from('documents').insert({
    project_id: 37,
    title: 'Test Doc Public',
    url: 'https://example.com/test.pdf',
    type: 'rg_cpf'
  }).select();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success:', data);
  }
}

testDocInsert();
