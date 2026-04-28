import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (tablesError) {
        // Fallback: try to select from a table we suspect exists
        const { error: usersError } = await supabase.from('users').select('id').limit(1);
        console.log('Users table exists:', !usersError);
        
        const { error: profilesError } = await supabase.from('profiles').select('id').limit(1);
        console.log('Profiles table exists:', !profilesError);

        const { data: projectsData, error: projectsError } = await supabase.from('projects').select('id').limit(1);
        if (!projectsError && projectsData && projectsData.length > 0) {
            console.log('Projects ID type sample:', typeof projectsData[0].id);
        }
    } else {
        console.log('Tables:', tables.map(t => t.table_name));
    }
}

checkSchema();
