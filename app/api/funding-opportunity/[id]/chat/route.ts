import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { getPineconeClient } from '@/lib/vectorization/pinecone';
import { generateEmbeddings } from '@/lib/vectorization/openai';
import { NextRequest } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { messages } = await request.json();
    const id = params.id;
    
    console.log('Chat API called with FOA ID:', id);
    console.log('Received messages:', messages);
    
    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    console.log('Generating embedding for query:', userMessage.content);
    
    // Generate embedding for the query using our utility
    const embedding = await generateEmbeddings(userMessage.content);

    // Get Pinecone client and index using our utility
    const pinecone = await getPineconeClient();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Search Pinecone for similar vectors
    console.log('Searching Pinecone for similar sections...');
    const queryResponse = await index.query({
      vector: embedding,
      filter: {
        type: 'foa_raw',
        foaId: id
      },
      topK: 3,
      includeMetadata: true,
    });

    console.log('Found similar sections:', queryResponse.matches.length);
    queryResponse.matches.forEach((match, i) => {
      const text = typeof match.metadata?.text === 'string' ? match.metadata.text : '';
      console.log(queryResponse.matches[i].metadata);
    });

    // Construct context from the matched sections
    const context = queryResponse.matches
      .map(match => (typeof match.metadata?.text === 'string' ? match.metadata.text : ''))
      .join('\n\n');

    const supabase = await createClient();

    console.log('Fetching basic FOA data from Supabase...');
    const { data: foa, error: foaError } = await supabase
      .from('foas')
      .select('title, agency')
      .eq('id', id)
      .single();

    if (foaError) {
      console.error('Supabase query error:', foaError);
      return Response.json({ error: 'Error fetching funding opportunity' }, { status: 500 });
    }

    if (!foa) {
      console.error('FOA not found for ID:', id);
      return Response.json({ error: 'Funding opportunity not found' }, { status: 404 });
    }

    console.log('Creating OpenAI chat completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an authoritative AI assistant specializing in funding opportunities. You provide clear, direct answers about the sections of this funding opportunity that are most relevant to each question.

          Funding Opportunity Details:
          Title: ${foa.title}
          Agency: ${foa.agency}

          Relevant sections from the funding opportunity:
          ${context}
          
          Response Requirements:
          - Provide concise, to-the-point answers without unnecessary elaboration
          - Use plain text only - no markdown, bullet points, or special formatting
          - Answer confidently based on the provided sections
          - Focus on what you know rather than what you don't
          - If information is missing, briefly note this at the end of your response
          - Keep responses under 4 sentences when possible
          - Use natural, conversational language`
        },
        ...messages,
      ],
      temperature: 0.3,
      stream: false,
    });

    return Response.json({ message: completion.choices[0].message.content });

  } catch (error) {
    console.error('Chat API Error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 