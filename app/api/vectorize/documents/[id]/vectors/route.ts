import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPineconeClient } from '@/lib/vectorization/pinecone';

export async function GET(
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

    // Query Pinecone to get all vectors for this document
    const queryResponse = await index.query({
      vector: Array(3072).fill(0), // Use a zero vector with proper dimensions
      filter: {
        userId: user.id,
        documentId: id,
        type: 'vectorized_document'
      },
      includeMetadata: true,
      topK: 1000, // Set a reasonable limit
    });

    // Return the vectors with their metadata
    return NextResponse.json({
      vectors: queryResponse.matches
    });
  } catch (error) {
    console.error('Error fetching document vectors:', error);
    return NextResponse.json(
      { error: `Failed to fetch vectors: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 