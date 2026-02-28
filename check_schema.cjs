const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) console.error(error);
  else console.log("users table:", Object.keys(data[0]));
  
  const { data: tsData, error: tsError } = await supabase.from('timesheets').select('*').limit(1);
  if (tsError) console.error(tsError);
  else console.log("timesheets table:", Object.keys(tsData[0]));
}
main();