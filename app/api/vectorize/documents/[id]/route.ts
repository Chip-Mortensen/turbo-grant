import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPineconeClient } from '@/lib/vectorization/pinecone';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Pinecone client
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    // Query Pinecone to get all vector IDs for this document
    const queryResponse = await index.query({
      vector: Array(3072).fill(0), // Use a zero vector with proper dimensions
      filter: {
        userId: user.id,
        documentId: id,
        type: 'vectorized_document'
      },
      includeMetadata: false,
      topK: 1000, // Set a reasonable limit
    });

    const vectorIds = queryResponse.matches.map(match => match.id);
    
    if (vectorIds.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Delete vectors from Pinecone in batches
    const batchSize = 100;
    for (let i = 0; i < vectorIds.length; i += batchSize) {
      const batch = vectorIds.slice(i, i + batchSize);
      await index.deleteMany(batch);
      console.log(`Deleted batch of ${batch.length} vectors from Pinecone`);
    }

    return NextResponse.json({
      success: true,
      message: 'Document and vectors deleted successfully',
      deletedVectors: vectorIds.length
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: `Failed to delete document: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 