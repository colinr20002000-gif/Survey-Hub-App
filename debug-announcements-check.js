// Quick debug script to check department values
// Run this in the browser console while on the User Admin page

(async function debugDepartments() {
    // Import supabase from the global scope
    const { createClient } = window.supabase || {};

    if (!createClient) {
        console.log('Please run this on a page where Supabase is loaded');
        return;
    }

    const supabase = createClient(
        'https://okldykkmgmcjhgzysris.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenlzcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNjkyMzgsImV4cCI6MjA0OTc0NTIzOH0.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38'
    );

    console.log('🔍 Fetching users with departments...');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, department')
        .not('department', 'is', null);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`✅ Found ${users.length} users with departments`);

    // Group by department
    const byDepartment = users.reduce((acc, user) => {
        const dept = user.department || 'null';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push({ name: user.name, email: user.email });
        return acc;
    }, {});

    console.log('\n📊 Users by department:');
    Object.entries(byDepartment).forEach(([dept, userList]) => {
        console.log(`\n${dept} (${userList.length} users):`);
        userList.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    });

    console.log('\n🏷️ Unique department values:');
    console.log(Object.keys(byDepartment));

    // Also check dropdown items
    console.log('\n📋 Fetching department dropdown items...');
    const { data: dropdownCats } = await supabase
        .from('dropdown_categories')
        .select('id, name')
        .eq('name', 'department')
        .single();

    if (dropdownCats) {
        const { data: dropdownItems } = await supabase
            .from('dropdown_items')
            .select('display_text, is_active, sort_order')
            .eq('category_id', dropdownCats.id)
            .eq('is_active', true)
            .order('sort_order');

        console.log('✅ Department dropdown options:');
        dropdownItems?.forEach(item => console.log(`  - "${item.display_text}"`));
    }
})();
