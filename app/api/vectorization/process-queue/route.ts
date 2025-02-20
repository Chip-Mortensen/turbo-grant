import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbeddings } from '@/lib/vectorization/openai';
import { getPineconeClient } from '@/lib/vectorization/pinecone';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';
import { DescriptionProcessor } from '../processors/description-processor';

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

class ResearcherProcessor extends ContentProcessor {
  private content: ResearcherProfile;
  private supabase: SupabaseClient;

  constructor(content: ResearcherProfile, projectId: string, supabase: SupabaseClient) {
    super(projectId);
    this.content = content;
    this.supabase = supabase;
  }

  async validate(content: any): Promise<boolean> {
    return !!(this.content.name && this.content.project_id);
  }

  async process(content: any): Promise<ProcessingResult> {
    console.log('Processing researcher profile:', { id: this.content.id, name: this.content.name });
    
    // Combine profile data into a single text
    const profileText = [
      `Name: ${this.content.name}`,
      `Title: ${this.content.title}`,
      `Institution: ${this.content.institution}`,
      `Biography: ${this.content.bio}`
    ].join('\n');

    console.log('Combined profile text length:', profileText.length);

    try {
      // Generate embedding
      const embedding = await this.generateEmbeddings(profileText);
      console.log('Generated embedding for researcher profile');

      // Store in Pinecone with metadata
      const metadata: ProcessingMetadata = {
        type: 'researcher',
        projectId: this.projectId,
        name: this.content.name,
        title: this.content.title,
        institution: this.content.institution
      };
      
      const pineconeId = await this.storePineconeVector(embedding, metadata);
      console.log('Successfully stored researcher vector in Pinecone');

      // Update the researcher profile with vectorization status
      const { error: updateError } = await this.supabase
        .from('researcher_profiles')
        .update({
          vectorization_status: 'completed',
          last_vectorized_at: new Date().toISOString(),
          pinecone_id: pineconeId
        })
        .eq('id', this.content.id);

      if (updateError) {
        console.error('Error updating researcher profile status:', updateError);
        throw updateError;
      }
      console.log('Successfully updated researcher profile status');

      return {
        pineconeIds: [pineconeId],
        metadata
      };
    } catch (error) {
      console.error('Error in processResearcher:', error);
      throw error;
    }
  }
}

async function processContent(
  content: any,
  contentType: 'description' | 'figure' | 'chalk_talk' | 'researcher',
  projectId: string,
  supabase: SupabaseClient
): Promise<void> {
  let processor: ContentProcessor;

  switch (contentType) {
    case 'description':
      processor = new DescriptionProcessor(content, projectId, supabase);
      break;
    case 'figure':
      // TODO: Implement FigureProcessor
      throw new Error('Figure processing not implemented yet');
    case 'chalk_talk':
      // TODO: Implement ChalkTalkProcessor
      throw new Error('Chalk talk processing not implemented yet');
    case 'researcher':
      processor = new ResearcherProcessor(content, projectId, supabase);
      break;
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }

  // Validate content before processing
  const isValid = await processor.validate(content);
  if (!isValid) {
    throw new Error(`Invalid content for type: ${contentType}`);
  }

  // Process the content
  await processor.process(content);
}

export async function POST(request: Request) {
  console.log('Received queue processing request');
  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('Using service role client');

    // First, let's check all queue items regardless of status
    const { data: allItems, error: allItemsError } = await supabase
      .from('processing_queue')
      .select('*');
    
    console.log('All queue items:', allItems);
    console.log('All queue items error:', allItemsError);

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

    console.log('Found pending queue items:', queueItems);
    console.log('Found queue items count:', queueItems?.length || 0);

    if (!queueItems || queueItems.length === 0) {
      console.log('No items to process');
      return NextResponse.json({ message: 'No items to process' }, { status: 200 });
    }

    // Process each item in the batch
    const results = await Promise.all(
      queueItems.map(async (item: QueueItem) => {
        console.log('Processing queue item:', { id: item.id, type: item.content_type });
        try {
          // Mark item as processing
          const { error: updateError } = await supabase
            .from('processing_queue')
            .update({ status: 'processing' })
            .eq('id', item.id);

          if (updateError) {
            console.error('Error updating queue item to processing:', updateError);
            throw updateError;
          }
          console.log('Marked item as processing');

          // Get the content based on type
          const { data: content, error: contentError } = await supabase
            .from(getTableName(item.content_type))
            .select('*')
            .eq('id', item.content_id)
            .single();

          if (contentError || !content) {
            console.error('Error fetching content:', contentError);
            throw new Error(contentError?.message || 'Content not found');
          }
          console.log('Retrieved content for processing');

          // Process the content based on its type
          await processContent(content, item.content_type, item.project_id, supabase);
          console.log('Successfully processed content');

          // Mark queue item as completed
          const { error: completeError } = await supabase
            .from('processing_queue')
            .update({ status: 'completed' })
            .eq('id', item.id);

          if (completeError) {
            console.error('Error marking queue item as completed:', completeError);
            throw completeError;
          }
          console.log('Marked queue item as completed');

          return { id: item.id, status: 'success' };
        } catch (err) {
          const error = err as Error;
          console.error(`Error processing item ${item.id}:`, error);

          // Update retry count and status
          const newRetryCount = (item.retry_count || 0) + 1;
          const newStatus = newRetryCount >= 3 ? 'error' : 'pending';

          const { error: retryError } = await supabase
            .from('processing_queue')
            .update({
              status: newStatus,
              retry_count: newRetryCount,
              error_message: error.message
            })
            .eq('id', item.id);

          if (retryError) {
            console.error('Error updating retry count:', retryError);
          }
          console.log('Updated retry count and status:', { newRetryCount, newStatus });

          return { id: item.id, status: 'error', error: error.message };
        }
      })
    );

    console.log('Finished processing batch with results:', results);
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