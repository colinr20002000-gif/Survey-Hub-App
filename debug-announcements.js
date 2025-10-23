// Debug script to check announcement target_roles and user departments
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://okldykkmgmcjhgzysris.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbGR5a2ttZ21jamhnenl5c3JpcyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI1MjAxNjM4LCJleHAiOjIwNDA3Nzc2Mzh9.xHEU9SvHkXxQfNrink99b46zogEf9QeZRUZyYMzNK38';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAnnouncements() {
  console.log('🔍 Debugging Announcements and User Departments\n');

  // 1. Get latest announcement
  const { data: announcements, error: announcementError } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (announcementError) {
    console.error('❌ Error fetching announcements:', announcementError);
  } else {
    console.log('📢 Latest 5 Announcements:');
    announcements.forEach((ann, idx) => {
      console.log(`\n  ${idx + 1}. "${ann.title}"`);
      console.log(`     Created: ${ann.created_at}`);
      console.log(`     Target Roles: ${JSON.stringify(ann.target_roles)}`);
      console.log(`     Target Roles Type: ${typeof ann.target_roles}`);
      console.log(`     Target Roles IsArray: ${Array.isArray(ann.target_roles)}`);
      if (Array.isArray(ann.target_roles)) {
        console.log(`     Target Roles Length: ${ann.target_roles.length}`);
        console.log(`     Target Roles Values: ${ann.target_roles.join(', ')}`);
      }
    });
  }

  // 2. Get all users and their departments
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, department, privilege')
    .order('name');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
  } else {
    console.log('\n\n👥 All Users and Their Departments:');
    const departmentGroups = {};

    users.forEach(user => {
      const dept = user.department || 'No Department';
      if (!departmentGroups[dept]) {
        departmentGroups[dept] = [];
      }
      departmentGroups[dept].push(`${user.name} (${user.privilege})`);
    });

    Object.keys(departmentGroups).sort().forEach(dept => {
      console.log(`\n  ${dept}:`);
      departmentGroups[dept].forEach(userName => {
        console.log(`    - ${userName}`);
      });
    });
  }

  // 3. If we have announcements with target_roles, show which users should receive them
  if (announcements && announcements.length > 0) {
    const latestAnnouncement = announcements[0];
    console.log(`\n\n🎯 For announcement: "${latestAnnouncement.title}"`);
    console.log(`   Target Roles: ${JSON.stringify(latestAnnouncement.target_roles)}`);

    if (latestAnnouncement.target_roles && Array.isArray(latestAnnouncement.target_roles)) {
      const matchingUsers = users.filter(user =>
        latestAnnouncement.target_roles.includes(user.department) ||
        latestAnnouncement.target_roles.includes(user.privilege)
      );

      console.log(`\n   Should receive notification (${matchingUsers.length} users):`);
      matchingUsers.forEach(user => {
        console.log(`     ✅ ${user.name} - Department: ${user.department}, Privilege: ${user.privilege}`);
      });

      const nonMatchingUsers = users.filter(user =>
        !latestAnnouncement.target_roles.includes(user.department) &&
        !latestAnnouncement.target_roles.includes(user.privilege)
      );

      console.log(`\n   Should NOT receive notification (${nonMatchingUsers.length} users):`);
      nonMatchingUsers.forEach(user => {
        console.log(`     ❌ ${user.name} - Department: ${user.department}, Privilege: ${user.privilege}`);
      });
    } else {
      console.log('   ℹ️  No target roles set - announcement goes to everyone');
    }
  }
}

debugAnnouncements().catch(console.error);
