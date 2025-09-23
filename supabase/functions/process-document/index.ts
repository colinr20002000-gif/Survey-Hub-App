import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.1.3';
import { RecursiveCharacterTextSplitter } from 'npm:langchain/text_splitters';
import { getDocument, GlobalWorkerOptions } from 'npm:pdfjs-dist@4.4.168';

GlobalWorkerOptions.workerSrc = `https://npm.jspm.io/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
const multimodalModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

async function fileToGenerativePart(data: Uint8Array, mimeType: string) {
  return { inlineData: { data: btoa(String.fromCharCode(...data)), mimeType } };
}

Deno.serve(async (req) => {
  try {
    const { record: file } = await req.json();
    const { name: fileName, bucket_id: bucketName } = file;
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage.from(bucketName).download(fileName);
    if (downloadError) throw downloadError;
    const fileBuffer = await fileData.arrayBuffer();

    const pdf = await getDocument(fileBuffer).promise;
    let fullTextContent = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullTextContent += textContent.items.map((item: any) => item.str).join(' ');

      const operatorList = await page.getOperatorList();
      for (const op of operatorList.fnArray) {
        if (op === 90) { /* OPS.paintImageXObject */
          const [imgName] = operatorList.argsArray[operatorList.fnArray.indexOf(op)];
          const img = await page.objs.get(imgName);
          if (img?.data) {
            const imagePart = await fileToGenerativePart(img.data, img.kind === 1 ? 'image/jpeg' : 'image/png');
            const result = await multimodalModel.generateContent(["Describe this image (chart, diagram, etc.) in detail.", imagePart]);
            fullTextContent += `\n[Image Description: ${result.response.text()}]\n`;
          }
        }
      }
    }
    await supabaseAdmin.from('documents').delete().eq('file_name', fileName);
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
    const chunks = await splitter.splitText(fullTextContent);
    const embeddingsResponse = await embeddingModel.batchEmbedContents({ requests: chunks.map((content) => ({ content })) });
    const documentsToInsert = chunks.map((content, i) => ({ content, file_name: fileName, embedding: embeddingsResponse.embeddings[i].value }));
    await supabaseAdmin.from('documents').insert(documentsToInsert);

    return new Response(JSON.stringify({ message: `Successfully processed ${fileName}` }));
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500 });
  }
});