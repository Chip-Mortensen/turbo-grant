import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';
import { Database } from '@/types/supabase';
import { encode } from 'gpt-tokenizer';
// Import file processing utilities
import { getTextFromPdf, getTextFromDocx, getTextFromTxt } from '@/lib/file-processing';
import { generateEmbeddings } from '@/lib/vectorization/openai';

type ResearchDescription = Database['public']['Tables']['research_descriptions']['Row'];

export class ResearchDescriptionProcessor extends ContentProcessor {
  private content: ResearchDescription;
  private supabase: SupabaseClient;

  constructor(content: ResearchDescription, projectId: string, supabase: SupabaseClient) {
    super(projectId);
    this.content = content;
    this.supabase = supabase;
  }

  async validate(): Promise<boolean> {
    console.log('Starting validation for research description:', { 
      id: this.content.id, 
      fileName: this.content.file_name,
      filePath: this.content.file_path,
      fileType: this.content.file_type
    });
    
    // Check required fields
    if (!this.content.file_path || !this.content.file_type) {
      console.error('Missing required fields:', { 
        hasFilePath: !!this.content.file_path, 
        hasFileType: !!this.content.file_type 
      });
      return false;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(this.content.file_type)) {
      console.error('Invalid file type:', this.content.file_type);
      return false;
    }

    try {
      console.log('Checking storage buckets');
      // Check if bucket exists
      const { data: buckets, error: bucketsError } = await this.supabase
        .storage
        .listBuckets();

      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        return false;
      }

      console.log('Available buckets:', buckets.map(b => b.name));
      const bucketExists = buckets.some(b => b.name === 'research-descriptions');
      if (!bucketExists) {
        console.error('Bucket "research-descriptions" does not exist');
        return false;
      }

      // List files in bucket to verify path
      console.log('Listing files in bucket for project:', this.content.project_id);
      const { data: files, error: listError } = await this.supabase
        .storage
        .from('research-descriptions')
        .list(this.content.project_id || '');

      if (listError) {
        console.error('Error listing files in bucket:', listError);
        return false;
      }

      console.log('Files in bucket:', files);
      console.log('Looking for file path:', this.content.file_path);

      // Get file metadata from storage
      console.log('Attempting to download file');
      const { data: fileData, error: fileError } = await this.supabase
        .storage
        .from('research-descriptions')
        .download(this.content.file_path);

      if (fileError) {
        console.error('Error downloading file:', {
          error: fileError,
          path: this.content.file_path,
          message: fileError.message,
          name: fileError.name,
          details: JSON.stringify(fileError)
        });
        return false;
      }

      if (!fileData) {
        console.error('No file data returned');
        return false;
      }

      console.log('File downloaded successfully, size:', fileData.size);
      // Check file size (10MB limit)
      const TEN_MB = 10 * 1024 * 1024;
      if (fileData.size > TEN_MB) {
        console.error('File too large:', fileData.size);
        return false;
      }

      console.log('Validation successful');
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Unexpected error in validate:', error);
      return false;
    }
  }

  async process(): Promise<ProcessingResult> {
    console.log('Processing research description:', { id: this.content.id, fileName: this.content.file_name });

    try {
      // Download file from storage
      const { data: fileData, error: fileError } = await this.supabase
        .storage
        .from('research-descriptions')
        .download(this.content.file_path);

      if (fileError || !fileData) {
        const errorMsg = `Failed to download file: ${fileError?.message}`;
        console.error(errorMsg);
        await this.updateStatus('failed', errorMsg);
        throw new Error(errorMsg);
      }

      // Extract text based on file type
      let text: string;
      try {
        const buffer = await fileData.arrayBuffer();
        text = await this.extractText(buffer, this.content.file_type);
        console.log('Extracted text length:', text.length);
      } catch (extractError) {
        const errorMsg = extractError instanceof Error 
          ? `Text extraction failed: ${extractError.message}` 
          : 'Text extraction failed';
        console.error(errorMsg);
        await this.updateStatus('failed', errorMsg);
        throw extractError;
      }

      // Split into chunks using token-based chunking
      const chunks = this.chunkByTokens(text);
      console.log('Split into chunks:', chunks.length);

      // Process each chunk
      const pineconeIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          // Generate embedding for chunk
          const embedding = await this.generateEmbeddings(chunk);
          console.log(`Generated embedding for chunk ${i + 1}/${chunks.length}`);

          // Determine if this is a full document or a chunk
          const isFullDocument = chunks.length === 1 && encode(chunk).length <= 4000;
          
          // Store in Pinecone with metadata
          const metadata: ProcessingMetadata = {
            type: 'research_description',
            projectId: this.projectId || undefined,
            fileName: this.content.file_name,
            fileType: this.content.file_type,
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            documentType: isFullDocument ? 'full_document' : 'chunk',
            text: chunk,
            charCount: chunk.length,
            wordCount: chunk.split(/\s+/).length
          };

          const pineconeId = await this.storePineconeVector(embedding, metadata);
          pineconeIds.push(pineconeId);
          console.log(`Stored ${isFullDocument ? 'full document' : 'chunk'} ${i + 1} in Pinecone with ID: ${pineconeId}`);
        } catch (chunkError) {
          const errorMsg = chunkError instanceof Error 
            ? `Error processing chunk ${i + 1}: ${chunkError.message}` 
            : `Error processing chunk ${i + 1}`;
          console.error(errorMsg);
          
          // Continue with other chunks even if one fails
          continue;
        }
      }

      if (pineconeIds.length === 0) {
        const errorMsg = 'Failed to process any chunks successfully';
        console.error(errorMsg);
        await this.updateStatus('failed', errorMsg);
        throw new Error(errorMsg);
      }

      // Update the description status
      const { error: updateError } = await this.supabase
        .from('research_descriptions')
        .update({
          vectorization_status: 'completed',
          pinecone_ids: pineconeIds
        })
        .eq('id', this.content.id);

      if (updateError) {
        console.error('Error updating description status:', updateError);
        throw updateError;
      }

      return {
        pineconeIds,
        chunks,
        metadata: {
          fileName: this.content.file_name,
          fileType: this.content.file_type,
          totalChunks: chunks.length
        }
      };
    } catch (error) {
      console.error('Error in processResearchDescription:', error);
      
      // Make sure we update the status if it hasn't been done already
      try {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await this.updateStatus('failed', errorMsg);
      } catch (statusError) {
        console.error('Failed to update error status:', statusError);
      }
      
      throw error;
    }
  }

  private async extractText(buffer: ArrayBuffer, fileType: string): Promise<string> {
    console.log(`Extracting text from ${fileType} file`);
    
    // Convert ArrayBuffer to Buffer for Node.js APIs
    const nodeBuffer = Buffer.from(buffer);
    
    try {
      // Normalize the file type by handling MIME types
      const normalizedType = this.normalizeFileType(fileType);
      console.log(`Normalized file type: ${normalizedType}`);
      
      // Process based on normalized file type
      switch (normalizedType) {
        case 'pdf':
          return await getTextFromPdf(nodeBuffer);
          
        case 'docx':
          return await getTextFromDocx(nodeBuffer);
          
        case 'txt':
          return getTextFromTxt(nodeBuffer);
          
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${fileType} file:`, error);
      throw error;
    }
  }

  /**
   * Normalize file type by handling MIME types and extensions
   * @param fileType - The file type or MIME type
   * @returns Normalized file type (pdf, docx, txt, etc.)
   */
  private normalizeFileType(fileType: string): string {
    // Convert to lowercase for consistent comparison
    const type = fileType.toLowerCase();
    
    // Handle MIME types
    if (type.includes('application/pdf')) {
      return 'pdf';
    }
    
    if (type.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      return 'docx';
    }
    
    if (type.includes('text/plain')) {
      return 'txt';
    }
    
    // Handle file extensions
    if (type === 'pdf') {
      return 'pdf';
    }
    
    if (type === 'docx') {
      return 'docx';
    }
    
    if (type === 'txt') {
      return 'txt';
    }
    
    // If we can't determine the type, return the original
    return type;
  }

  async updateStatus(status: string, error?: string): Promise<void> {
    const updates: any = {
      vectorization_status: status
    };
    
    await this.supabase
      .from('research_descriptions')
      .update(updates)
      .eq('id', this.content.id);
  }

  /**
   * Chunks text by token count using gpt-tokenizer with a hybrid approach
   * @param text The text to chunk
   * @param maxTokens Maximum tokens per chunk
   * @returns Array of text chunks
   */
  private chunkByTokens(text: string, maxTokens: number = 2500): string[] {
    console.log('Chunking text by tokens, text length:', text.length);
    
    // Check if the entire text is under a reasonable token limit for a single chunk
    const totalTokens = encode(text).length;
    console.log(`Total tokens in document: ${totalTokens}`);
    
    // If the document is small enough, return it as a single chunk
    if (totalTokens <= 4000) {
      console.log('Document is small enough for a single chunk');
      return [text];
    }
    
    try {
      // Split text into paragraphs first
      const paragraphs = text.split(/\n\s*\n/);
      console.log(`Split text into ${paragraphs.length} paragraphs`);
      
      const chunks: string[] = [];
      let currentChunk = '';
      let currentTokenCount = 0;
      
      // Process each paragraph
      for (const paragraph of paragraphs) {
        if (paragraph.trim().length === 0) continue;
        
        // Get token count for this paragraph
        const paragraphTokens = encode(paragraph);
        const paragraphTokenCount = paragraphTokens.length;
        
        // If adding this paragraph would exceed the max tokens, start a new chunk
        if (currentTokenCount + paragraphTokenCount > maxTokens && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = '';
          currentTokenCount = 0;
        }
        
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n';
        }
        currentChunk += paragraph;
        currentTokenCount += paragraphTokenCount;
        
        // If this single paragraph is too large, we need to split it further
        if (paragraphTokenCount > maxTokens) {
          // Split into sentences
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          
          // Reset current chunk since we're going to process sentences
          chunks.pop(); // Remove the chunk we just added
          currentChunk = '';
          currentTokenCount = 0;
          
          // Process each sentence
          for (const sentence of sentences) {
            const sentenceTokens = encode(sentence);
            const sentenceTokenCount = sentenceTokens.length;
            
            // If adding this sentence would exceed the max tokens, start a new chunk
            if (currentTokenCount + sentenceTokenCount > maxTokens && currentChunk.length > 0) {
              chunks.push(currentChunk);
              currentChunk = '';
              currentTokenCount = 0;
            }
            
            // Add sentence to current chunk
            if (currentChunk.length > 0 && !currentChunk.endsWith(' ')) {
              currentChunk += ' ';
            }
            currentChunk += sentence;
            currentTokenCount += sentenceTokenCount;
            
            // If this single sentence is still too large (rare), we'll have to split by character count
            if (sentenceTokenCount > maxTokens) {
              // This is a fallback for extremely long sentences
              const words = sentence.split(' ');
              
              // Reset current chunk since we're going to process words
              chunks.pop(); // Remove the chunk we just added
              currentChunk = '';
              currentTokenCount = 0;
              
              // Process each word
              for (const word of words) {
                const wordTokens = encode(word + ' ');
                const wordTokenCount = wordTokens.length;
                
                // If adding this word would exceed the max tokens, start a new chunk
                if (currentTokenCount + wordTokenCount > maxTokens && currentChunk.length > 0) {
                  chunks.push(currentChunk);
                  currentChunk = '';
                  currentTokenCount = 0;
                }
                
                // Add word to current chunk
                currentChunk += word + ' ';
                currentTokenCount += wordTokenCount;
              }
            }
          }
        }
      }
      
      // Add the last chunk if it's not empty
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      
      console.log(`Created ${chunks.length} chunks using gpt-tokenizer`);
      return chunks;
    } catch (error) {
      console.error('Error chunking text by tokens:', error);
      
      // Fallback to simple character-based chunking
      console.log('Falling back to character-based chunking');
      const chunks: string[] = [];
      const chunkSize = 7500; // Approximate character count for 2500 tokens
      
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      
      return chunks;
    }
  }
} 