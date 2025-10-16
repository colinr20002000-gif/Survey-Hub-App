import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const generativeModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }); // Latest fast model

// In-memory cache for extracted document text (resets on function restart)
const documentCache = new Map<string, { content: string, timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

Deno.serve({ timeout: 300000 }, async (req) => {
  const origin = req.headers.get('origin');
  const allowedOrigins = ['https://www.survey-hub.xyz', 'http://localhost:5173', 'https://localhost:5173', 'http://localhost:5175'];
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : 'https://www.survey-hub.xyz';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { query } = await req.json();
    console.log('💬 Chat query:', query);
    console.log('⏱️ Request started at:', new Date().toISOString());

    console.log('⏱️ Starting document query at:', new Date().toISOString());

    // Get documents (including PDFs with optimized processing)
    const { data: documents, error } = await supabaseAdmin
      .from('policy_documents_db')
      .select('file_name, file_data, content_type, file_size')
      .limit(1); // Only 1 document for speed

    console.log('⏱️ Document query completed at:', new Date().toISOString());
    console.log('📄 Found documents:', documents?.map(d => `${d.file_name} (${d.content_type})`));

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    console.log(`📚 Found ${documents?.length || 0} documents`);

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({
        response: "I couldn't find any documents to search through. Please upload some documents first in the Document Management section."
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('⏱️ Starting document processing at:', new Date().toISOString());

    // Process only text documents for maximum speed (no AI calls needed)
    let contextText = '';
    const maxContextLength = 20000; // Further reduced

    for (const doc of documents) {
      // Skip large files
      if (doc.file_size > 1 * 1024 * 1024) { // 1MB limit
        console.log(`⚠️ Skipping ${doc.file_name} - too large (${Math.round(doc.file_size / 1024 / 1024)}MB)`);
        continue;
      }

      // Check cache first
      const cacheKey = `${doc.file_name}_${doc.file_size}`;
      const cached = documentCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log(`💾 Using cached content for ${doc.file_name}`);
        contextText += `\n\n--- From ${doc.file_name} ---\n${cached.content}`;
        continue;
      }

      // Process both text files and PDFs (optimized)
      if (doc.content_type === 'application/pdf') {
        // Fast PDF processing with minimal thinking
        try {
          console.log(`📄 Processing PDF: ${doc.file_name} (${Math.round(doc.file_size / 1024)}KB)`);
          const pdfPart = {
            inlineData: {
              data: doc.file_data,
              mimeType: 'application/pdf'
            }
          };

          const extractPromise = generativeModel.generateContent({
            contents: [{
              parts: [
                { text: "Extract key text content from this PDF quickly. Return only the most important text, limit to 5000 characters." },
                pdfPart
              ]
            }],
            generationConfig: {
              thinkingConfig: {
                thinkingBudget: 1024 // Light thinking for PDF extraction
              }
            }
          });

          const extractResult = await Promise.race([
            extractPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('PDF timeout')), 20000))
          ]);

          const extractedText = extractResult.response.text();
          const truncatedText = extractedText.substring(0, 5000);

          documentCache.set(cacheKey, { content: truncatedText, timestamp: now });
          contextText += `\n\n--- From ${doc.file_name} ---\n${truncatedText}`;
          console.log(`✅ Processed PDF ${truncatedText.length} characters from ${doc.file_name}`);
        } catch (extractError) {
          console.error(`Error extracting from ${doc.file_name}:`, extractError);
        }
      } else {
        try {
          console.log(`📝 Processing text file: ${doc.file_name}`);
          const textContent = atob(doc.file_data);
          const truncatedText = textContent.substring(0, 6000); // Smaller limit

          // Cache the result
          documentCache.set(cacheKey, { content: truncatedText, timestamp: now });

          contextText += `\n\n--- From ${doc.file_name} ---\n${truncatedText}`;
          console.log(`✅ Processed ${truncatedText.length} characters from ${doc.file_name}`);
        } catch (decodeError) {
          console.error(`Error decoding ${doc.file_name}:`, decodeError);
        }
      }
    }

    console.log('⏱️ Document processing completed at:', new Date().toISOString());

    console.log(`📝 Total context length: ${contextText.length} characters`);

    if (!contextText.trim()) {
      console.log('⚠️ No text content found, using general knowledge mode');
      contextText = 'No specific company documents available. Providing general assistance.';
    }

    console.log('⏱️ Starting AI generation at:', new Date().toISOString());

    // Generate intelligent response using Gemini
    const prompt = contextText.includes('No specific company documents')
      ? `You are a helpful assistant. Answer this question: ${query}`
      : `You are a helpful and professional assistant. Based on the following context from company documents, answer the user's question. If the answer is not in the context, say "I'm sorry, I couldn't find information about that in the available documents."\n\nContext:\n${contextText}\n\nQuestion: ${query}`;

    // Determine thinking budget based on query complexity
    const isComplexQuery = query.length > 100 ||
      /\b(analyze|compare|summarize|explain|calculate|relationship|trend|pattern)\b/i.test(query);

    const resultPromise = generativeModel.generateContent({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: isComplexQuery ? 4096 : 1024, // Adaptive thinking budget
          includeThoughts: false // Set to true to see reasoning process
        }
      }
    });
    const result = await Promise.race([
      resultPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI response timeout')), 10000)) // Even faster timeout
    ]);

    const response = result.response.text();
    const totalTime = Date.now() - startTime;

    console.log('✅ Generated AI response:', response.substring(0, 100) + '...');
    console.log(`⏱️ Total response time: ${totalTime}ms`);

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('❌ Chat function error:', e);
    return new Response(JSON.stringify({
      error: e.message,
      stack: e.stack,
      response: `Error: ${e.message}. Please contact your administrator.`
    }), {
      status: 200, // Return 200 to avoid generic error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});