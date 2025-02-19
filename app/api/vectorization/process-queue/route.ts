import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

interface QueueItem {
  id: string;
  content_type: 'description' | 'figure' | 'chalk_talk' | 'researcher';
  content_id: string;
  project_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  retry_count: number;
}

interface ResearcherProfile {
  id: string;
  name: string;
  title: string;
  institution: string;
  bio: string;
  project_id: string;
}

const BATCH_SIZE = 10; // Number of items to process in each batch

// Function to generate embeddings using OpenAI
async function generateEmbeddings(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    encoding_format: "float",
  });
  
  return response.data[0].embedding;
}

// Function to store vector in Pinecone
async function storePineconeVector(
  vector: number[],
  metadata: any,
  id: string
): Promise<void> {
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
  
  await index.upsert([{
    id,
    values: vector,
    metadata
  }]);
}

// Process researcher profile
async function processResearcher(
  content: ResearcherProfile,
  supabase: SupabaseClient
): Promise<void> {
  // Combine profile data into a single text
  const profileText = [
    `Name: ${content.name}`,
    `Title: ${content.title}`,
    `Institution: ${content.institution}`,
    `Biography: ${content.bio}`
  ].join('\n');

  // Generate embedding
  const embedding = await generateEmbeddings(profileText);

  // Store in Pinecone with metadata
  const pineconeId = `researcher_${content.id}`;
  await storePineconeVector(
    embedding,
    {
      type: 'researcher',
      project_id: content.project_id,
      name: content.name,
      title: content.title,
      institution: content.institution
    },
    pineconeId
  );

  // Update the researcher profile with vectorization status
  await supabase
    .from('researcher_profiles')
    .update({
      vectorization_status: 'completed',
      last_vectorized_at: new Date().toISOString(),
      pinecone_id: pineconeId
    })
    .eq('id', content.id);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get the next batch of items to process
    const { data: queueItems, error: fetchError } = await supabase
      .from('processing_queue')
      .select(`
        id,
        content_type,
        content_id,
        project_id,
        status,
        retry_count
      `)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Error fetching queue items:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch queue items' },
        { status: 500 }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ message: 'No items to process' }, { status: 200 });
    }

    // Process each item in the batch
    const results = await Promise.all(
      queueItems.map(async (item: QueueItem) => {
        try {
          // Mark item as processing
          await supabase
            .from('processing_queue')
            .update({ status: 'processing' })
            .eq('id', item.id);

          // Get the content based on type
          const { data: content, error: contentError } = await supabase
            .from(getTableName(item.content_type))
            .select('*')
            .eq('id', item.content_id)
            .single();

          if (contentError || !content) {
            throw new Error(contentError?.message || 'Content not found');
          }

          // Process the content based on its type
          await processContent(content, item.content_type, supabase);

          // Mark queue item as completed
          await supabase
            .from('processing_queue')
            .update({ status: 'completed' })
            .eq('id', item.id);

          return { id: item.id, status: 'success' };
        } catch (err) {
          const error = err as Error;
          console.error(`Error processing item ${item.id}:`, error);

          // Update retry count and status
          const newRetryCount = (item.retry_count || 0) + 1;
          const newStatus = newRetryCount >= 3 ? 'error' : 'pending';

          await supabase
            .from('processing_queue')
            .update({
              status: newStatus,
              retry_count: newRetryCount,
              error_message: error.message
            })
            .eq('id', item.id);

          return { id: item.id, status: 'error', error: error.message };
        }
      })
    );

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('Queue processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getTableName(contentType: 'description' | 'figure' | 'chalk_talk' | 'researcher'): string {
  switch (contentType) {
    case 'description':
      return 'written_descriptions';
    case 'figure':
      return 'scientific_figures';
    case 'chalk_talk':
      return 'chalk_talks';
    case 'researcher':
      return 'researcher_profiles';
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }
}

async function processContent(
  content: any,
  contentType: 'description' | 'figure' | 'chalk_talk' | 'researcher',
  supabase: SupabaseClient
) {
  switch (contentType) {
    case 'description':
      // await processDescription(content, supabase);
      break;
    case 'figure':
      // await processFigure(content, supabase);
      break;
    case 'chalk_talk':
      // await processChalkTalk(content, supabase);
      break;
    case 'researcher':
      await processResearcher(content, supabase);
      break;
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }
} 