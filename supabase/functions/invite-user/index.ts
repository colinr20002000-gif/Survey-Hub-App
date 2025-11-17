import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Authorization header present:', !!authHeader);

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase admin client for all operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Verify the user using the admin client with the JWT token
    console.log('🔐 Verifying JWT token...');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    console.log('🔐 Auth result:', {
      hasUser: !!requestingUser,
      userEmail: requestingUser?.email,
      errorMessage: authError?.message
    });

    if (authError || !requestingUser) {
      console.error('🔐 Authentication failed:', authError);
      throw new Error('Unauthorized: Invalid authentication');
    }

    // Super admin list (same as frontend)
    const superAdmins = ['colin.rogers@inorail.co.uk'];

    // Check if requesting user has admin privileges or is a super admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('privilege, email')
      .eq('id', requestingUser.id)
      .single();

    if (userError || !userData) {
      throw new Error('Unauthorized: User not found');
    }

    // Check if user is super admin or has sufficient privileges
    const isSuperAdmin = superAdmins.includes(userData.email);
    const hasPrivilege = userData.privilege === 'Admin' || userData.privilege === 'Project Manager';

    if (!isSuperAdmin && !hasPrivilege) {
      throw new Error('Unauthorized: Insufficient privileges. Must be Admin or Project Manager.');
    }

    // Parse request body (no password needed for invite)
    const {
      email, name, username, privilege, teamRole,
      department, organisation, mobile_number, avatar,
      pts_number,
      hire_date, termination_date
    } = await req.json();

    // Validate required fields
    if (!email || !name || !username) {
      throw new Error('Missing required fields: email, name, and username are required');
    }

    console.log('📧 Checking for existing user with email:', email);

    // Check if user already exists in the users table (including soft-deleted)
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, deleted_at')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing user:', checkError);
      throw new Error(`Failed to check for existing user: ${checkError.message}`);
    }

    if (existingUser) {
      if (existingUser.deleted_at) {
        console.log('♻️ Found soft-deleted user, cannot re-invite');
        throw new Error('This user was previously deleted. Please use the restore function instead.');
      } else {
        console.error('❌ User already exists and is active');
        throw new Error('A user with this email already exists');
      }
    }

    console.log('👤 Checking if auth user exists...');
    // Check if auth user already exists
    const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing auth users:', listError);
    } else {
      const existingAuthUser = authUsers?.find(u => u.email === email);
      if (existingAuthUser) {
        console.error('❌ Auth user already exists');
        throw new Error('An auth user with this email already exists');
      }
    }

    console.log('✨ Sending invitation email to:', email);
    // Invite the user (they will set their own password)
    const { data: authUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        username
      },
      redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`
    });

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      throw new Error(`Failed to invite user: ${inviteError.message}`);
    }

    console.log('✅ Invitation sent, auth user created with ID:', authUser.user.id);

    // The on_auth_user_created trigger automatically creates a users table entry
    // We need to update it with the additional fields provided by the admin
    console.log('🔄 Updating user record with additional fields...');

    const { data: dbUser, error: updateDbError } = await supabaseAdmin
      .from('users')
      .update({
        name,
        username,
        privilege: privilege || 'Viewer',
        team_role: teamRole || null,
        department: department || null,
        organisation: organisation || null,
        mobile_number: mobile_number || null,
        avatar: avatar || name.split(' ').map((n: string) => n[0]).join('').substring(0, 3),
        competencies: null,
        pts_number: pts_number || null,
        available_saturday: false,
        available_sunday: false,
        hire_date: hire_date || null,
        termination_date: termination_date || null
      })
      .eq('id', authUser.user.id)
      .select()
      .single();

    if (updateDbError) {
      console.error('Error updating user in database:', updateDbError);

      // Rollback: delete the auth user if database update fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);

      throw new Error(`Failed to update user record: ${updateDbError.message}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        user: dbUser,
        message: 'User invitation sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in invite-user function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
