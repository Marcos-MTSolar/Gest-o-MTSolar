import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUpload() {
  const fileContent = Buffer.from('test');
  const { data, error } = await supabase.storage
    .from('homologacao-docs')
    .upload(`test_${Date.now()}.pdf`, fileContent, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.error('Upload Error:', error);
  } else {
    console.log('Upload Success:', data);
  }
}

testUpload();
