import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testPublicUpload() {
  const fileContent = Buffer.from('test public');
  const { data, error } = await supabase.storage
    .from('homologacao-docs')
    .upload(`test_public_${Date.now()}.pdf`, fileContent, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.error('Upload Error:', error);
  } else {
    console.log('Upload Success:', data);
  }
}

testPublicUpload();
