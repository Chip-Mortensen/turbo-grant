import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getPineconeClient } from '@/lib/vectorization/pinecone';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    console.log('Starting deletion process for researcher:', id);

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

    // First, check if researcher exists and get their data
    console.log('Fetching researcher data...');
    const { data: researcher, error: fetchError } = await supabase
      .from('researcher_profiles')
      .select('pinecone_id, project_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching researcher:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch researcher' },
        { status: 500 }
      );
    }
    console.log('Found researcher data:', researcher);

    // Check for queue items
    console.log('Checking for queue items...');
    const { data: queueItems, error: queueCheckError } = await supabase
      .from('processing_queue')
      .select('id')
      .match({ 
        content_type: 'researcher',
        content_id: id 
      });

    if (queueCheckError) {
      console.error('Error checking queue items:', queueCheckError);
    } else {
      console.log('Found queue items:', queueItems);
    }

    // Delete processing queue items
    console.log('Deleting queue items...');
    const { data: deletedQueue, error: queueError } = await supabase
      .from('processing_queue')
      .delete()
      .match({ 
        content_type: 'researcher',
        content_id: id 
      })
      .select();

    if (queueError) {
      console.error('Error deleting queue items:', queueError);
      return NextResponse.json(
        { error: 'Failed to delete queue items' },
        { status: 500 }
      );
    }
    console.log('Deleted queue items:', deletedQueue);

    // Delete vectors from Pinecone if they exist
    if (researcher.pinecone_id) {
      console.log('Found Pinecone IDs:', researcher.pinecone_id);
      const pineconeIds = researcher.pinecone_id.split(',');
      console.log('Parsed Pinecone IDs:', pineconeIds);
      
      const pinecone = await getPineconeClient();
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
      
      try {
        // First, verify the vectors exist
        const fetchResponse = await index.fetch(pineconeIds);
        console.log('Found existing vectors:', Object.keys(fetchResponse.records));

        // Delete the vectors
        await index.deleteMany(pineconeIds);
        console.log('Deleted vectors from Pinecone:', pineconeIds);
      } catch (pineconeError) {
        console.error('Error with Pinecone operations:', pineconeError);
        return NextResponse.json(
          { error: 'Failed to delete vectors from Pinecone' },
          { status: 500 }
        );
      }
    } else {
      console.log('No Pinecone IDs found for researcher');
    }

    // Finally, delete the researcher profile
    console.log('Deleting researcher profile...');
    const { data: deletedResearcher, error: deleteError } = await supabase
      .from('researcher_profiles')
      .delete()
      .eq('id', id)
      .select();

    if (deleteError) {
      console.error('Error deleting researcher:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete researcher' },
        { status: 500 }
      );
    }
    console.log('Deleted researcher:', deletedResearcher);

    console.log('Successfully completed deletion process');
    return NextResponse.json({ 
      success: true,
      deleted: {
        researcher: deletedResearcher,
        queueItems: deletedQueue,
        pineconeIds: researcher.pinecone_id ? researcher.pinecone_id.split(',') : []
      }
    });
  } catch (error) {
    console.error('Unexpected error during deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 