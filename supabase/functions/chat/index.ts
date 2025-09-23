import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.1.3';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
const generativeModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } }); }
  try {
    const { query } = await req.json();
    const embeddingResponse = await embeddingModel.embedContent(query);
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embeddingResponse.embedding.value,
      match_threshold: 0.70,
      match_count: 5,
    });
    if (error) throw error;
    const contextText = documents.map((doc: any) => doc.content).join('\n\n---\n\n');
    const prompt = `You are a helpful and professional HR assistant. Based ONLY on the following context from the company's internal documents, answer the user's question. If the answer is not in the context, say "I'm sorry, I couldn't find information about that in the company policies."\n\nContext:\n${contextText}\n\nQuestion:\n${query}`;
    const result = await generativeModel.generateContent(prompt);
    return new Response(JSON.stringify({ response: result.response.text() }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});