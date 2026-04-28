import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function testDelete() {
  const { data: item, error: err1 } = await supabase
    .from('stock_items')
    .insert({ category: 'TEST', specification: 'DELETE ME', unit: 'un', current_quantity: 0, ideal_quantity: 0 })
    .select()
    .single();

  if (err1) {
    console.error('Error inserting:', err1);
    return;
  }

  console.log('Inserted item:', item.id);

  const { error: err2 } = await supabase
    .from('stock_items')
    .delete()
    .eq('id', item.id);

  if (err2) {
    console.error('Error deleting:', err2);
  } else {
    console.log('Successfully deleted item!');
  }
}

testDelete();
