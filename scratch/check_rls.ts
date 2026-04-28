import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_table_info', { t_name: 'stock_items' });
  // Since we don't have this RPC, let's try to see if we can query as anon vs service_role
  
  const anonClient = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
  
  const { data: anonData, error: anonError } = await anonClient.from('stock_items').select('*').limit(1);
  console.log('Anon select success:', !!anonData);
  console.log('Anon select error:', anonError?.message);
  
  const { error: anonDeleteError } = await anonClient.from('stock_items').delete().eq('id', 999999);
  console.log('Anon delete error (non-existent):', anonDeleteError?.message);
}

checkRLS();
