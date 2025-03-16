import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateEmbeddings } from '@/lib/vectorization/openai';
import { getPineconeClient } from '@/lib/vectorization/pinecone';
import { randomUUID } from 'crypto';

// Maximum tokens per chunk
const MAX_TOKENS_PER_CHUNK = 1000;

interface PageInfo {
  pageNumber: number;
  startIndex: number;
  endIndex: number;
}

export async function POST(request: NextRequest) {
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

    // Parse the request body
    const body = await request.json();
    const { fileName, text, pageInfo, metadata = {} } = body;
    
    if (!fileName || !text || !pageInfo || !Array.isArray(pageInfo)) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, text, and pageInfo' },
        { status: 400 }
      );
    }

    // Ensure text is a string
    let textString = typeof text === 'string' ? text : String(text);
    
    // Clean up the text if needed
    if (textString.includes('[object Object]')) {
      console.warn('Text contains [object Object], cleaning up');
      textString = textString.replace(/\[object Object\]/g, '');
      textString = textString.replace(/\{\s*\}/g, '');
      textString = textString.trim();
    }

    // Create semantic chunks while tracking page information
    const chunks = createSemanticChunks(textString, pageInfo, MAX_TOKENS_PER_CHUNK);
    
    console.log(`Created ${chunks.length} semantic chunks across ${pageInfo.length} pages`);

    // Get Pinecone client
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    // Generate a document ID
    const documentId = randomUUID();
    
    // Process each chunk and store in Pinecone
    const vectorIds: string[] = [];
    const createdAt = new Date().toISOString();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      console.log(`Processing chunk ${i + 1}/${chunks.length}, length: ${chunk.text.length} characters, pages: ${chunk.pageNumbers.join(', ')}`);
      
      // Generate embeddings
      const embedding = await generateEmbeddings(chunk.text);
      
      // Create metadata
      const chunkMetadata = {
        userId: user.id,
        fileName,
        text: chunk.text,
        chunkIndex: i,
        totalChunks: chunks.length,
        type: 'vectorized_document',
        documentId, // Store the document ID in each chunk's metadata
        createdAt,
        isMetadata: i === 0, // Mark the first chunk as containing metadata for the whole document
        pageNumbers: chunk.pageNumbers.map(num => num.toString()), // Convert page numbers to strings
        startPage: Math.min(...chunk.pageNumbers).toString(),
        endPage: Math.max(...chunk.pageNumbers).toString(),
        // Add custom metadata
        ...metadata
      };
      
      // Generate ID
      const id = randomUUID();
      vectorIds.push(id);
      
      // Upsert to Pinecone
      await index.upsert([{
        id,
        values: embedding,
        metadata: chunkMetadata
      }]);
    }

    return NextResponse.json({
      success: true,
      documentId,
      chunks: chunks.length,
      vectorIds
    });
  } catch (error) {
    console.error('Error vectorizing document:', error);
    return NextResponse.json(
      { error: `Failed to vectorize document: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

interface TextChunk {
  text: string;
  pageNumbers: number[];
  startIndex: number;
  endIndex: number;
}

/**
 * Create semantic chunks from text while tracking page information
 * 
 * @param text - The full text to chunk
 * @param pageInfo - Information about pages in the text
 * @param maxTokens - Maximum tokens per chunk
 * @returns Array of chunks with page information
 */
function createSemanticChunks(
  text: string, 
  pageInfo: { pageNumber: number; startIndex: number; endIndex: number }[], 
  maxTokens: number = 1000
): TextChunk[] {
  // Split text into sentences, preserving the sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: TextChunk[] = [];
  
  let currentChunk = '';
  let chunkStartIndex = 0;
  let currentPosition = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const trimmedSentence = sentence.trim();
    
    // Find where this sentence appears in the original text
    const sentenceStartIndex = text.indexOf(trimmedSentence, currentPosition);
    if (sentenceStartIndex === -1) continue; // Skip if we can't find the sentence
    
    const sentenceEndIndex = sentenceStartIndex + trimmedSentence.length;
    
    // Update tracking position to avoid finding the same sentence again
    currentPosition = sentenceEndIndex;
    
    // Rough estimation: 1 token ≈ 4 characters
    const wouldExceedLimit = (currentChunk.length + trimmedSentence.length) / 4 > maxTokens;
    
    if (wouldExceedLimit && currentChunk.length > 0) {
      // Calculate the actual end index of the current chunk
      const chunkEndIndex = chunkStartIndex + currentChunk.length;
      
      // Determine which pages this chunk spans
      const pageNumbers = getPageNumbersForChunk(chunkStartIndex, chunkEndIndex, pageInfo);
      
      // Add the chunk with accurate indices
      chunks.push({
        text: currentChunk.trim(),
        pageNumbers,
        startIndex: chunkStartIndex,
        endIndex: chunkEndIndex
      });
      
      // Start a new chunk with this sentence
      currentChunk = trimmedSentence;
      chunkStartIndex = sentenceStartIndex;
    } else {
      // If this is the first sentence in a chunk, record its start position
      if (currentChunk.length === 0) {
        chunkStartIndex = sentenceStartIndex;
      }
      
      // Add the sentence with proper spacing
      if (currentChunk.length > 0) {
        currentChunk += ' ' + trimmedSentence;
      } else {
        currentChunk = trimmedSentence;
      }
    }
  }
  
  // Add the last chunk if there is one
  if (currentChunk) {
    const chunkEndIndex = chunkStartIndex + currentChunk.length;
    const pageNumbers = getPageNumbersForChunk(chunkStartIndex, chunkEndIndex, pageInfo);
    
    chunks.push({
      text: currentChunk.trim(),
      pageNumbers,
      startIndex: chunkStartIndex,
      endIndex: chunkEndIndex
    });
  }
  
  // Validate that all chunks have page numbers
  for (const chunk of chunks) {
    if (chunk.pageNumbers.length === 0) {
      console.warn(`Chunk with no page numbers detected: "${chunk.text.substring(0, 50)}..."`);
      // Assign a default page number (first page) if we couldn't determine the pages
      chunk.pageNumbers = [1];
    }
  }
  
  return chunks;
}

/**
 * Determine which pages a chunk spans
 * 
 * @param chunkStartIndex - Start index of the chunk in the original text
 * @param chunkEndIndex - End index of the chunk in the original text
 * @param pageInfo - Information about pages in the text
 * @returns Array of page numbers that the chunk spans
 */
function getPageNumbersForChunk(
  chunkStartIndex: number, 
  chunkEndIndex: number, 
  pageInfo: { pageNumber: number; startIndex: number; endIndex: number }[]
): number[] {
  const pageNumbers: Set<number> = new Set();
  const overlappingPages: { pageNumber: number; reason: string }[] = [];
  
  for (const page of pageInfo) {
    // Check if this page overlaps with the chunk
    const chunkStartsInPage = chunkStartIndex >= page.startIndex && chunkStartIndex <= page.endIndex;
    const chunkEndsInPage = chunkEndIndex >= page.startIndex && chunkEndIndex <= page.endIndex;
    const chunkContainsPage = chunkStartIndex <= page.startIndex && chunkEndIndex >= page.endIndex;
    
    if (chunkStartsInPage || chunkEndsInPage || chunkContainsPage) {
      pageNumbers.add(page.pageNumber);
      
      // Track why this page was included for debugging
      let reason = '';
      if (chunkStartsInPage) reason += 'starts in page, ';
      if (chunkEndsInPage) reason += 'ends in page, ';
      if (chunkContainsPage) reason += 'contains page, ';
      
      overlappingPages.push({
        pageNumber: page.pageNumber,
        reason: reason.slice(0, -2) // Remove trailing comma and space
      });
    }
  }
  
  const result = Array.from(pageNumbers).sort((a, b) => a - b);
  
  // Log detailed information about page detection
  if (result.length > 0) {
    console.log(`Chunk spans pages ${result.join(', ')}. Details:`, 
      overlappingPages.map(p => `Page ${p.pageNumber}: ${p.reason}`).join('; '));
  } else {
    console.warn(`No pages detected for chunk from index ${chunkStartIndex} to ${chunkEndIndex}. Page info:`, 
      pageInfo.map(p => `Page ${p.pageNumber}: ${p.startIndex}-${p.endIndex}`).join('; '));
  }
  
  return result;
}

// Note: The helper functions below are kept for reference but are no longer used
// since we're now using page-based chunks directly.

// Function to find the start index of a chunk in the original text
function getChunkStartIndex(fullText: string, chunks: string[], chunkIndex: number): number {
  if (chunkIndex === 0) return 0;
  
  let currentIndex = 0;
  for (let i = 0; i < chunkIndex; i++) {
    currentIndex += chunks[i].length;
    // Account for potential spaces between chunks
    if (fullText[currentIndex] === ' ') currentIndex++;
  }
  
  return currentIndex;
}

// Function to split text into chunks
function splitIntoChunks(text: string, maxTokens: number = 1000): string[] {
  // Split text into sentences, preserving the sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    // Rough estimation: 1 token ≈ 4 characters
    if ((currentChunk.length + trimmedSentence.length) / 4 > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    
    // Add the sentence with proper spacing
    if (currentChunk.length > 0) {
      currentChunk += ' ' + trimmedSentence;
    } else {
      currentChunk = trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
} 