const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log('⚡ Supabase client connected successfully.');
  } catch (err) {
    console.error('⚠️  Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️  Supabase URL or Key not set. Running with file-backed storage.');
}

module.exports = supabase;
