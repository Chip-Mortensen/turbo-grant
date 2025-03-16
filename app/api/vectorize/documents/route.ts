import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPineconeClient } from '@/lib/vectorization/pinecone';

export async function GET(request: NextRequest) {
  try {
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

    // Query Pinecone for document metadata (only records where isMetadata=true)
    const queryResponse = await index.query({
      vector: Array(3072).fill(0), // Use a zero vector with proper dimensions
      filter: {
        userId: user.id,
        type: 'vectorized_document',
        isMetadata: true
      },
      includeMetadata: true,
      topK: 100, // Limit to 100 documents
    });

    // Process the results to get document metadata
    const documents = queryResponse.matches.map(match => {
      const metadata = match.metadata as any;
      return {
        id: metadata.documentId,
        fileName: metadata.fileName,
        fileType: metadata.fileType || 'unknown',
        createdAt: metadata.createdAt,
        userId: user.id,
        chunks: metadata.totalChunks || 1
      };
    });

    // For each document, query to get all its vector IDs
    for (const doc of documents) {
      if (doc.chunks > 1) {
        const vectorsResponse = await index.query({
          vector: Array(3072).fill(0), // Use a zero vector with proper dimensions
          filter: {
            userId: user.id,
            documentId: doc.id,
            isMetadata: { $ne: true } // Exclude the metadata vector we already have
          },
          includeMetadata: false,
          topK: doc.chunks
        });
        
        // We don't need to store vector IDs anymore
      }
    }
    
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching vectorized documents:', error);
    return NextResponse.json(
      { error: `Failed to fetch documents: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 