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
    const { fileName, fileData, contentType } = await req.json();

    // Decode base64 data
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    console.log(`🔄 Uploading ${fileName}, size: ${binaryData.length} bytes`);

    // Upload directly using admin client with minimal memory usage
    const { data, error } = await supabaseAdmin.storage
      .from('policy-documents')
      .upload(fileName, binaryData, {
        contentType: contentType || 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    console.log(`✅ Successfully uploaded ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully uploaded ${fileName}`,
        path: data.path
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
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