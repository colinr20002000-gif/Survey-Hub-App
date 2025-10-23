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
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      throw listError;
    }

    const existingBucket = buckets.find(bucket => bucket.name === 'policy-documents');

    if (existingBucket) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'policy-documents bucket already exists',
          bucket: existingBucket
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Create the bucket
    const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('policy-documents', {
      public: false,
      allowedMimeTypes: ['application/pdf', 'text/plain', 'text/markdown'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (createError) {
      throw createError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'policy-documents bucket created successfully',
        bucket: newBucket
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Bucket creation error:', error);
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