import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function testDelete() {
  console.log('Testing delete with ANON key...');
  
  // Try to find an item first
  const { data: items } = await supabase.from('stock_items').select('*').limit(1);
  if (!items || items.length === 0) {
    console.log('No items found to delete.');
    return;
  }
  
  const item = items[0];
  console.log('Attempting to delete item:', item.id);

  const { error } = await supabase
    .from('stock_items')
    .delete()
    .eq('id', item.id);

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully deleted (or no error)! Check if item still exists.');
    const { data: check } = await supabase.from('stock_items').select('*').eq('id', item.id);
    if (check && check.length > 0) {
      console.log('Item STILL EXISTS. RLS probably blocked it silently.');
    } else {
      console.log('Item is GONE.');
    }
  }
}

testDelete();
