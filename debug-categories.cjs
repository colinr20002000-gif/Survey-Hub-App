const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://okldykkmgmcjhgzysris.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenlzcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTAzMzgsImV4cCI6MjA3MjE2NjMzOH0.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Vehicles Categories ---');
  const { data: vData } = await supabase.from('vehicles').select('category').limit(5);
  console.log(vData);

  console.log('--- Dropdown Categories ---');
  const { data: dcData } = await supabase.from('dropdown_categories').select('id, name');
  console.log(dcData);

  if (dcData) {
    const vt = dcData.find(c => c.name === 'vehicle_type');
    if (vt) {
      console.log('--- Vehicle Type Items ---');
      const { data: diData } = await supabase.from('dropdown_items').select('*').eq('category_id', vt.id);
      console.log(diData);
    }
  }

  console.log('--- Equipment Categories ---');
  const { data: ecData } = await supabase.from('equipment_categories').select('*');
  console.log(ecData);
}
main();
