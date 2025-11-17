import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://okldykkmgmcjhgzysris.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenlzcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgzNTMzMjgsImV4cCI6MjAzMzkyOTMyOH0.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38'
);

const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('project_number', '250374')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Project structure:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nField names:', Object.keys(data));
}
