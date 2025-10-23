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
    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      throw bucketsError;
    }

    const policyDocsBucket = buckets.find(bucket => bucket.name === 'policy-documents');

    if (!policyDocsBucket) {
      return new Response(
        JSON.stringify({
          error: 'policy-documents bucket not found',
          availableBuckets: buckets.map(b => b.name)
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Test a small upload
    const testData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const testFileName = `test_${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('policy-documents')
      .upload(testFileName, testData, {
        contentType: 'text/plain',
        cacheControl: '0'
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({
          error: 'Upload test failed',
          details: uploadError.message,
          bucket: policyDocsBucket
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

    // Clean up test file
    await supabaseAdmin.storage.from('policy-documents').remove([testFileName]);

    return new Response(
      JSON.stringify({
        success: true,
        bucket: policyDocsBucket,
        message: 'Storage bucket is working correctly',
        testUpload: 'passed'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Storage check error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
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