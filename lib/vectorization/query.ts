import { getPineconeClient } from './pinecone';
import { ScoredPineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';

interface QueryResult {
  matches: ScoredPineconeRecord<RecordMetadata>[];
  error?: string;
}

/**
 * Get all research description vectors for a project
 */
export async function getResearchDescriptionVectors(projectId: string): Promise<QueryResult> {
  try {
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    const queryResponse = await index.query({
      filter: {
        type: 'research_description',
        projectId
      },
      topK: 1000,
      includeMetadata: true,
      vector: Array(3072).fill(0) // Required by Pinecone but won't affect results
    });

    return {
      matches: queryResponse.matches
    };
  } catch (error) {
    console.error('Error fetching research description vectors:', error);
    return {
      matches: [],
      error: error instanceof Error ? error.message : 'Failed to fetch research descriptions'
    };
  }
}

/**
 * Get all scientific figure vectors for a project
 */
export async function getScientificFigureVectors(projectId: string): Promise<QueryResult> {
  try {
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    const queryResponse = await index.query({
      filter: {
        type: 'scientific_figure',
        projectId
      },
      topK: 1000,
      includeMetadata: true,
      vector: Array(3072).fill(0)
    });

    return {
      matches: queryResponse.matches
    };
  } catch (error) {
    console.error('Error fetching scientific figure vectors:', error);
    return {
      matches: [],
      error: error instanceof Error ? error.message : 'Failed to fetch scientific figures'
    };
  }
}

/**
 * Get all chalk talk vectors for a project
 */
export async function getChalkTalkVectors(projectId: string): Promise<QueryResult> {
  try {
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    const queryResponse = await index.query({
      filter: {
        type: 'chalk_talk',
        projectId
      },
      topK: 1000,
      includeMetadata: true,
      vector: Array(3072).fill(0)
    });

    return {
      matches: queryResponse.matches
    };
  } catch (error) {
    console.error('Error fetching chalk talk vectors:', error);
    return {
      matches: [],
      error: error instanceof Error ? error.message : 'Failed to fetch chalk talks'
    };
  }
}

/**
 * Get all FOA vectors for a specific FOA
 */
export async function getFOAVectors(foaId: string): Promise<QueryResult> {
  try {
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    const queryResponse = await index.query({
      filter: {
        type: 'foa_raw',
        foaId
      },
      topK: 1000,
      includeMetadata: true,
      vector: Array(3072).fill(0)
    });

    return {
      matches: queryResponse.matches
    };
  } catch (error) {
    console.error('Error fetching FOA vectors:', error);
    return {
      matches: [],
      error: error instanceof Error ? error.message : 'Failed to fetch FOA content'
    };
  }
} 