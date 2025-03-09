import { getPineconeClient } from '../vectorization/pinecone';
import { ScoredPineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';

interface QueryResult {
  matches: ScoredPineconeRecord<RecordMetadata>[];
  error?: string;
}

/**
 * Get all research description vectors for a project, ordered by chunk index
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
      vector: Array(3072).fill(0)
    });

    // Sort by chunkIndex if available
    const sortedMatches = queryResponse.matches.sort((a, b) => {
      const aIndex = a.metadata?.chunkIndex as number || 0;
      const bIndex = b.metadata?.chunkIndex as number || 0;
      return aIndex - bIndex;
    });

    return {
      matches: sortedMatches
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
 * Get all scientific figure vectors for a project (no chunking)
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
 * Get all chalk talk vectors for a project, ordered by chunk index
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

    // Sort by chunkIndex if available
    const sortedMatches = queryResponse.matches.sort((a, b) => {
      const aIndex = a.metadata?.chunkIndex as number || 0;
      const bIndex = b.metadata?.chunkIndex as number || 0;
      return aIndex - bIndex;
    });

    return {
      matches: sortedMatches
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
 * Get all FOA vectors for a specific FOA, ordered by chunk index
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

    // Sort by chunkIndex if available
    const sortedMatches = queryResponse.matches.sort((a, b) => {
      const aIndex = a.metadata?.chunkIndex as number || 0;
      const bIndex = b.metadata?.chunkIndex as number || 0;
      return aIndex - bIndex;
    });

    return {
      matches: sortedMatches
    };
  } catch (error) {
    console.error('Error fetching FOA vectors:', error);
    return {
      matches: [],
      error: error instanceof Error ? error.message : 'Failed to fetch FOA content'
    };
  }
} 

/**
 * Gets the full text content of an FOA by retrieving all its vector chunks
 * and concatenating the text fields
 * @param foaId The ID of the FOA to retrieve text for
 * @returns A promise that resolves to the full text as a string
 * @throws Error if there's an issue retrieving the text
 */
export async function getFOAText(foaId: string): Promise<string> {
  try {
    const result = await getFOAVectors(foaId);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Extract the 'Text' field from each match's metadata and join them
    const fullText = result.matches
      .map(match => match.metadata?.['text'] as string || '')
      .filter(text => text.trim() !== '') // Filter out empty strings
      .join(' '); // Concatenate all text chunks
        
    return fullText;
    
  } catch (error) {
    console.error('Error extracting FOA text:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
} 

/**
 * Gets the full text content of research descriptions by retrieving all vector chunks
 * and concatenating the text fields
 * @param projectId The ID of the project to retrieve research description text for
 * @returns A promise that resolves to the full text as a string
 * @throws Error if there's an issue retrieving the text
 */
export async function getResearchDescriptionText(projectId: string): Promise<string> {
  try {
    const result = await getResearchDescriptionVectors(projectId);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Extract the 'Text' field from each match's metadata and join them
    const fullText = result.matches
      .map(match => match.metadata?.['text'] as string || '')
      .filter(text => text.trim() !== '') // Filter out empty strings
      .join(' '); // Concatenate all text chunks
    
    return fullText;
    
  } catch (error) {
    console.error('Error extracting research description text:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Gets the full text content of scientific figures by retrieving all vector chunks
 * and concatenating the text fields
 * @param projectId The ID of the project to retrieve scientific figure text for
 * @returns A promise that resolves to the full text as a string
 * @throws Error if there's an issue retrieving the text
 */
export async function getScientificFigureText(projectId: string): Promise<string> {
  try {
    const result = await getScientificFigureVectors(projectId);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Extract the 'Text' field from each match's metadata and join them
    const fullText = result.matches
      .map(match => match.metadata?.['text'] as string || '')
      .filter(text => text.trim() !== '') // Filter out empty strings
      .join(' '); // Concatenate all text chunks
    
    return fullText;
    
  } catch (error) {
    console.error('Error extracting scientific figure text:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Gets the full text content of chalk talk by retrieving all vector chunks
 * and concatenating the text fields
 * @param projectId The ID of the project to retrieve chalk talk text for
 * @returns A promise that resolves to the full text as a string
 * @throws Error if there's an issue retrieving the text
 */
export async function getChalkTalkText(projectId: string): Promise<string> {
  try {
    const result = await getChalkTalkVectors(projectId);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Extract the 'Text' field from each match's metadata and join them
    const fullText = result.matches
      .map(match => match.metadata?.['text'] as string || '')
      .filter(text => text.trim() !== '') // Filter out empty strings
      .join(' '); // Concatenate all text chunks
    
    return fullText;
    
  } catch (error) {
    console.error('Error extracting chalk talk text:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
} 