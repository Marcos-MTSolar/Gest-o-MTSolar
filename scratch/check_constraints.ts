import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('get_table_info', { t_name: 'stock_withdrawals' });
  // Since we don't have this RPC, let's try to query information_schema if possible via SQL RPC
  
  const { data: constraints, error: err2 } = await supabase.from('stock_withdrawals').select('*').limit(1);
  console.log('Stock withdrawals columns:', Object.keys(constraints?.[0] || {}));
  
  // Let's try to see if we can trigger a foreign key error
  const { error: err3 } = await supabase.from('stock_withdrawals').insert({
    stock_item_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
    quantity: 1,
    installation_name: 'TEST'
  });
  console.log('Foreign key error sample:', err3?.message);
}

checkConstraints();
