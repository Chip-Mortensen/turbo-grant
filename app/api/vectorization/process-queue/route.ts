import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';
import { ResearchDescriptionProcessor } from '../processors/research-description-processor';
import { FOAProcessor } from '../processors/foa-processor';
import { Database } from '@/types/supabase';

// Use the Database type but define a simpler type for our processing logic
type QueueItem = {
  id: string;
  content_type: 'research_description' | 'scientific_figure' | 'chalk_talk' | 'foa';
  content_id: string;
  project_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  retry_count: number;
};

const BATCH_SIZE = 5; // Number of items to process in each batch

async function processContent(
  content: any,
  contentType: 'research_description' | 'scientific_figure' | 'chalk_talk' | 'foa',
  projectId: string | null,
  supabase: SupabaseClient
): Promise<void> {
  console.log(`Processing content of type: ${contentType}, project ID: ${projectId || 'NULL'}`);
  console.log('Content data:', JSON.stringify(content, null, 2).substring(0, 200) + '...');
  
  let processor: ContentProcessor;

  switch (contentType) {
    case 'research_description':
      console.log('Creating ResearchDescriptionProcessor');
      if (!projectId) {
        throw new Error('Project ID is required for research descriptions');
      }
      processor = new ResearchDescriptionProcessor(content, projectId, supabase);
      break;
    case 'scientific_figure':
      // TODO: Implement FigureProcessor
      throw new Error('Scientific figure processing not implemented yet');
    case 'chalk_talk':
      // TODO: Implement ChalkTalkProcessor
      throw new Error('Chalk talk processing not implemented yet');
    case 'foa':
      console.log('Creating FOAProcessor');
      processor = new FOAProcessor(content, projectId, supabase);
      break;
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }

  // Validate content before processing
  console.log('Validating content');
  const isValid = await processor.validate(content);
  if (!isValid) {
    console.error('Content validation failed');
    throw new Error(`Invalid content for type: ${contentType}`);
  }
  console.log('Content validation successful');

  // Process the content
  console.log('Starting content processing');
  const result = await processor.process(content);
  console.log('Content processing completed successfully', result);
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
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // First, let's check all queue items regardless of status
    const { data: allItems, error: allItemsError } = await supabase
      .from('processing_queue')
      .select('*');
    
    console.log('All queue items count:', allItems?.length || 0);
    if (allItemsError) {
      console.error('Error fetching all queue items:', allItemsError);
    }

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

function getTableName(contentType: 'research_description' | 'scientific_figure' | 'chalk_talk' | 'foa'): string {
  switch (contentType) {
    case 'research_description':
      return 'research_descriptions';
    case 'scientific_figure':
      return 'scientific_figures';
    case 'chalk_talk':
      return 'chalk_talks';
    case 'foa':
      return 'foas';
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }
} 