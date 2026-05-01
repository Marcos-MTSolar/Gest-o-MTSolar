import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAnonUpload() {
  // First we need to "login" because the policy is for 'authenticated'
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ceo@mtsolar.com',
    password: 'admin123'
  });

  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }

  const fileContent = Buffer.from('test anon');
  const { data, error } = await supabase.storage
    .from('homologacao-docs')
    .upload(`test_anon_${Date.now()}.pdf`, fileContent, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.error('Upload Error:', error);
  } else {
    console.log('Upload Success:', data);
  }
}

testAnonUpload();
