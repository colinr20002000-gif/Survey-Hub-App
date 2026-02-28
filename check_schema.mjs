import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://okldykkmgmcjhgzysris.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenlzcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTAzMzgsImV4cCI6MjA3MjE2NjMzOH0.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38';
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