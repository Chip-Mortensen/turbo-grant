import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPineconeClient } from '@/lib/vectorization/pinecone';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const decodedFilename = decodeURIComponent(filename);
  
  if (!decodedFilename) {
    return NextResponse.json(
      { error: 'Filename is required' },
      { status: 400 }
    );
  }

  // Get the user from Supabase auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Initialize Pinecone client
    const pinecone = await getPineconeClient();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

    // Query Pinecone for all vectors with the matching filename and user ID
    const queryResponse = await index.query({
      vector: Array(3072).fill(0), // Dummy vector for metadata-only query
      topK: 10000,
      includeMetadata: true,
      filter: {
        $and: [
          { userId: { $eq: user.id } },
          { fileName: { $eq: decodedFilename } }
        ]
      }
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return NextResponse.json(
        { message: 'No documents found with the specified filename' },
        { status: 404 }
      );
    }

    // Extract vector IDs to delete
    const vectorIds = queryResponse.matches.map(match => match.id);
    
    // Delete vectors in batches of 100
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < vectorIds.length; i += batchSize) {
      const batch = vectorIds.slice(i, i + batchSize);
      await index.deleteMany(batch);
      deletedCount += batch.length;
    }

    return NextResponse.json({
      message: `Successfully deleted all vectors for "${decodedFilename}"`,
      deletedVectors: deletedCount
    });
  } catch (error) {
    console.error('Error deleting vectors by filename:', error);
    return NextResponse.json(
      { error: 'Failed to delete vectors' },
      { status: 500 }
    );
  }
} 