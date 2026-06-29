import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runQueries() {
  console.log('--- PASSO 1: Estado real (ultimos 50) ---');
  const { data: step1, error: err1 } = await supabase
    .from('proposal_history')
    .select('id, client_name, proposal_number, created_at, data_expiracao, url_arquivo, company_id')
    .order('created_at', { ascending: false })
    .limit(50);
  if (err1) console.error('Erro 1:', err1);
  else console.table(step1);

  console.log('\n--- PASSO 2: Expirados com url_arquivo preenchido ---');
  const { data: step2, error: err2 } = await supabase
    .from('proposal_history')
    .select('id, client_name, data_expiracao, url_arquivo')
    .lt('data_expiracao', new Date().toISOString())
    .not('url_arquivo', 'is', null);
  if (err2) console.error('Erro 2:', err2);
  else console.table(step2);

  console.log('\n--- PASSO 3: Agrupamento por company_id ---');
  // Since we can't easily group by natively via supabase-js without an RPC or complex queries, we fetch all and group in JS.
  const { data: allProposals, error: err3 } = await supabase.from('proposal_history').select('company_id');
  if (err3) {
    console.error('Erro 3:', err3);
  } else {
    const counts: Record<string, number> = {};
    for (const p of allProposals || []) {
      counts[p.company_id] = (counts[p.company_id] || 0) + 1;
    }
    console.log('Company IDs counts:', counts);
  }

  // Get companies to compare
  const { data: companies } = await supabase.from('companies').select('id, name');
  console.log('\n--- Companies ---');
  console.table(companies);
}

runQueries();
