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
    const { fileName } = await req.json();

    // Get the manifest file
    const { data: manifestData, error: manifestError } = await supabaseAdmin.storage
      .from('policy-documents')
      .download(`${fileName}.manifest`);

    if (manifestError) {
      throw new Error(`Manifest not found: ${manifestError.message}`);
    }

    const manifestText = await manifestData.text();
    const manifest = JSON.parse(manifestText);

    // Download all chunks
    const chunks = [];
    for (let i = 0; i < manifest.totalChunks; i++) {
      const chunkFileName = `${fileName}.part${i.toString().padStart(3, '0')}`;
      const { data: chunkData, error: chunkError } = await supabaseAdmin.storage
        .from('policy-documents')
        .download(chunkFileName);

      if (chunkError) {
        throw new Error(`Chunk ${i} not found: ${chunkError.message}`);
      }

      chunks.push(await chunkData.arrayBuffer());
    }

    // Reassemble the file
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const reassembledFile = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
      reassembledFile.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    // Upload the reassembled file
    const { error: uploadError } = await supabaseAdmin.storage
      .from('policy-documents')
      .upload(fileName, reassembledFile, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Clean up chunks and manifest
    const filesToRemove = [`${fileName}.manifest`];
    for (let i = 0; i < manifest.totalChunks; i++) {
      filesToRemove.push(`${fileName}.part${i.toString().padStart(3, '0')}`);
    }

    await supabaseAdmin.storage
      .from('policy-documents')
      .remove(filesToRemove);

    return new Response(
      JSON.stringify({
        message: `Successfully reassembled ${fileName}`,
        originalName: manifest.originalFileName,
        size: totalSize
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Reassembly error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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