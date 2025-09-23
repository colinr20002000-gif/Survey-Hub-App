import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.1.3';

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const generativeModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } }); }

  try {
    const { query } = await req.json();
    console.log('💬 Chat query:', query);

    // Get documents from database storage
    const { data: documents, error } = await supabaseAdmin
      .from('policy_documents_db')
      .select('file_name, file_data, content_type, file_size')
      .limit(5);

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    console.log(`📚 Found ${documents?.length || 0} documents`);

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({
        response: "I couldn't find any documents to search through. Please upload some documents first in the Document Management section."
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Process documents and extract content
    let contextText = '';

    for (const doc of documents) {
      if (doc.content_type === 'application/pdf') {
        try {
          // Use Gemini 2.5 Pro to extract text from PDF
          const pdfPart = {
            inlineData: {
              data: doc.file_data,
              mimeType: 'application/pdf'
            }
          };

          console.log(`📄 Extracting text from ${doc.file_name} (${Math.round(doc.file_size / 1024)}KB)`);

          const extractResult = await generativeModel.generateContent([
            "Extract all text content from this PDF document. Return only the text content, no additional commentary or explanations.",
            pdfPart
          ]);

          const extractedText = extractResult.response.text();
          contextText += `\n\n--- From ${doc.file_name} ---\n${extractedText}`;
          console.log(`✅ Extracted ${extractedText.length} characters from ${doc.file_name}`);

        } catch (extractError) {
          console.error(`Error extracting from ${doc.file_name}:`, extractError);
          contextText += `\n\n--- ${doc.file_name} (extraction failed) ---`;
        }
      } else {
        // For text files, decode base64 directly
        try {
          const textContent = atob(doc.file_data);
          contextText += `\n\n--- From ${doc.file_name} ---\n${textContent}`;
        } catch (decodeError) {
          console.error(`Error decoding ${doc.file_name}:`, decodeError);
        }
      }
    }

    console.log(`📝 Total context length: ${contextText.length} characters`);

    if (!contextText.trim()) {
      return new Response(JSON.stringify({
        response: "I'm sorry, I couldn't extract any readable content from the uploaded documents."
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Generate intelligent response using Gemini 2.5 Pro
    const prompt = `You are a helpful and professional assistant. Based on the following context from company documents, answer the user's question. If the answer is not in the context, say "I'm sorry, I couldn't find information about that in the available documents."\n\nContext:\n${contextText}\n\nQuestion: ${query}`;

    const result = await generativeModel.generateContent(prompt);
    const response = result.response.text();

    console.log('✅ Generated AI response:', response.substring(0, 100) + '...');

    return new Response(JSON.stringify({ response }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    console.error('❌ Chat function error:', e);
    return new Response(JSON.stringify({
      error: e.message,
      stack: e.stack,
      response: `Error: ${e.message}. Please contact your administrator.`
    }), {
      status: 200, // Return 200 to avoid generic error message
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});