const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runSQLScript() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  // Create service client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read the SQL script
  const sqlScript = fs.readFileSync(path.join(__dirname, 'fix_production_auth.sql'), 'utf8');

  console.log('Running production auth fix script...');

  try {
    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Try direct query for simpler statements
          const { error: directError } = await supabase.from('').select().limit(0);
          if (directError) {
            console.error('Direct query also failed:', directError);
          }
        }
      }
    }

    console.log('Script execution completed!');
  } catch (error) {
    console.error('Error running script:', error);
  }
}

runSQLScript();
