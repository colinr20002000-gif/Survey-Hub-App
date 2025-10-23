import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    const { fileName, fileData, contentType, fileSize } = await req.json();

    console.log(`📁 Storing in database: ${fileName}, Size: ${fileSize} bytes`);

    // Store file data directly in database instead of storage
    const { data, error } = await supabaseAdmin
      .from('policy_documents_db')
      .insert({
        file_name: fileName,
        content_type: contentType,
        file_size: fileSize,
        file_data: fileData, // base64 encoded
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    console.log(`✅ Successfully stored ${fileName} in database`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully stored ${fileName} in database`,
        id: data.id
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Database storage error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});