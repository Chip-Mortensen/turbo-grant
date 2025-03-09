import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPineconeClient } from '@/lib/vectorization/pinecone';

/**
 * DELETE /api/funding-opportunity/[id]
 * 
 * Deletes a funding opportunity and its associated vectors from Pinecone
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await the params to get the id
    const foaId = (await params).id;
    
    if (!foaId) {
      return NextResponse.json(
        { error: 'FOA ID is required' },
        { status: 400 }
      );
    }

    // Get the FOA to retrieve its Pinecone IDs
    const { data: foa, error: foaError } = await supabase
      .from('foas')
      .select('pinecone_ids')
      .eq('id', foaId)
      .single();

    if (foaError) {
      console.error('Error fetching FOA:', foaError);
      return NextResponse.json(
        { error: 'Failed to fetch FOA' },
        { status: 500 }
      );
    }

    if (!foa) {
      return NextResponse.json(
        { error: 'FOA not found' },
        { status: 404 }
      );
    }

    // Delete vectors from Pinecone if they exist
    if (foa.pinecone_ids && foa.pinecone_ids.length > 0) {
      try {
        console.log(`Deleting ${foa.pinecone_ids.length} vectors from Pinecone`);
        const client = await getPineconeClient();
        const index = client.index(process.env.PINECONE_INDEX_NAME!);
        
        // Delete vectors in batches of 100 to avoid overwhelming the API
        const batchSize = 100;
        for (let i = 0; i < foa.pinecone_ids.length; i += batchSize) {
          const batch = foa.pinecone_ids.slice(i, i + batchSize);
          await index.deleteMany(batch);
          console.log(`Deleted batch ${i / batchSize + 1} of vectors from Pinecone`);
        }
        
        console.log('Successfully deleted all vectors from Pinecone');
      } catch (pineconeError) {
        console.error('Error deleting vectors from Pinecone:', pineconeError);
        // Continue with FOA deletion even if Pinecone deletion fails
      }
    } else {
      console.log('No Pinecone vectors to delete');
    }

    // Delete the FOA from the database
    const { error: deleteError } = await supabase
      .from('foas')
      .delete()
      .eq('id', foaId);

    if (deleteError) {
      console.error('Error deleting FOA:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete FOA' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'FOA and associated vectors deleted successfully',
      id: foaId
    });
  } catch (error) {
    console.error('Error deleting FOA:', error);
    return NextResponse.json(
      { error: 'Failed to delete FOA' },
      { status: 500 }
    );
  }
} 