import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';
import { Database } from '@/types/supabase';
import { encode } from 'gpt-tokenizer';
import { generateEmbeddings } from '@/lib/vectorization/openai';

type ChalkTalk = Database['public']['Tables']['chalk_talks']['Row'];

export class ChalkTalkProcessor extends ContentProcessor {
  private supabase: SupabaseClient;

  constructor(content: ChalkTalk, projectId: string, supabase: SupabaseClient) {
    super(projectId);
    this.supabase = supabase;
  }

  async validate(content: ChalkTalk): Promise<boolean> {
    console.log('Starting validation for chalk talk:', { 
      id: content.id, 
      mediaPath: content.media_path,
      transcriptionStatus: content.transcription_status
    });
    
    // Check if transcription exists and is completed
    if (!content.transcription || content.transcription_status !== 'completed') {
      console.error('Transcription not ready:', { 
        hasTranscription: !!content.transcription, 
        status: content.transcription_status 
      });
      return false;
    }

    // Check if already vectorized
    if (content.vectorization_status === 'completed') {
      console.error('Chalk talk already vectorized');
      return false;
    }

    // Check if transcription is empty
    if (content.transcription.trim().length === 0) {
      console.error('Transcription is empty');
      return false;
    }

    console.log('Validation successful');
    return true;
  }

  async process(content: ChalkTalk): Promise<ProcessingResult> {
    console.log('Processing chalk talk:', { id: content.id });

    try {
      // Update status to processing
      await this.updateStatus('processing', content);

      // Get the transcription text
      const transcription = content.transcription;
      if (!transcription) {
        throw new Error('Transcription is missing');
      }

      console.log('Transcription length:', transcription.length);

      // Split into chunks using token-based chunking
      const chunks = this.chunkByTokens(transcription);
      console.log('Split into chunks:', chunks.length);

      // Process each chunk
      const pineconeIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          // Generate embedding for chunk
          const embedding = await this.generateEmbeddings(chunk);
          console.log(`Generated embedding for chunk ${i + 1}/${chunks.length}`);

          // Determine if this is a full transcription or a chunk
          const isFullTranscription = chunks.length === 1 && encode(chunk).length <= 4000;
          
          // Store in Pinecone with metadata
          const metadata: ProcessingMetadata = {
            type: 'chalk_talk',
            projectId: this.projectId || undefined,
            chalkTalkId: content.id,
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            documentType: isFullTranscription ? 'full_transcription' : 'chunk',
            text: chunk,
            charCount: chunk.length,
            wordCount: chunk.split(/\s+/).length
          };

          const pineconeId = await this.storePineconeVector(embedding, metadata);
          pineconeIds.push(pineconeId);
          console.log(`Stored ${isFullTranscription ? 'full transcription' : 'chunk'} ${i + 1} in Pinecone with ID: ${pineconeId}`);
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
        await this.updateStatus('failed', content);
        throw new Error(errorMsg);
      }

      // Update the chalk talk status
      const { error: updateError } = await this.supabase
        .from('chalk_talks')
        .update({
          vectorization_status: 'completed',
          pinecone_ids: pineconeIds
        })
        .eq('id', content.id);

      if (updateError) {
        console.error('Error updating chalk talk status:', updateError);
        throw updateError;
      }

      return {
        pineconeIds,
        chunks,
        metadata: {
          totalChunks: chunks.length
        }
      };
    } catch (error) {
      console.error('Error in processChalkTalk:', error);
      
      // Make sure we update the status if it hasn't been done already
      try {
        await this.updateStatus('failed', content);
      } catch (statusError) {
        console.error('Failed to update error status:', statusError);
      }
      
      throw error;
    }
  }

  async updateStatus(status: string, content: ChalkTalk): Promise<void> {
    try {
      console.log(`Updating chalk talk ${content.id} status to ${status}`);
      
      const { error: updateError } = await this.supabase
        .from('chalk_talks')
        .update({ vectorization_status: status })
        .eq('id', content.id);
      
      if (updateError) {
        console.error('Error updating chalk talk status:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating chalk talk status:', error);
      throw error;
    }
  }

  /**
   * Chunks text by token count using gpt-tokenizer with a hybrid approach
   * @param text The text to chunk
   * @param maxTokens Maximum tokens per chunk
   * @returns Array of text chunks
   */
  private chunkByTokens(text: string, maxTokens: number = 2500): string[] {
    try {
      // Split text into paragraphs
      const paragraphs = text.split(/\n\s*\n/);
      const chunks: string[] = [];
      let currentChunk = '';
      let currentTokenCount = 0;

      for (const paragraph of paragraphs) {
        // Skip empty paragraphs
        if (!paragraph.trim()) continue;

        // Get token count for this paragraph
        const paragraphTokens = encode(paragraph).length;
        
        // If a single paragraph exceeds max tokens, split it by sentences
        if (paragraphTokens > maxTokens) {
          console.log(`Large paragraph found (${paragraphTokens} tokens). Splitting by sentences.`);
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          
          for (const sentence of sentences) {
            const sentenceTokens = encode(sentence).length;
            
            // If a single sentence exceeds max tokens, split it by character chunks
            if (sentenceTokens > maxTokens) {
              console.log(`Large sentence found (${sentenceTokens} tokens). Splitting by characters.`);
              let sentenceText = sentence;
              
              while (sentenceText.length > 0) {
                // Try different chunk sizes until we find one that fits within token limit
                let chunkSize = sentenceText.length;
                let chunk = sentenceText;
                let chunkTokens = encode(chunk).length;
                
                // Binary search to find the largest chunk that fits within token limit
                while (chunkTokens > maxTokens) {
                  chunkSize = Math.floor(chunkSize / 2);
                  chunk = sentenceText.slice(0, chunkSize);
                  chunkTokens = encode(chunk).length;
                }
                
                chunks.push(chunk);
                sentenceText = sentenceText.slice(chunk.length);
              }
            } else {
              // Check if adding this sentence would exceed the token limit
              if (currentTokenCount + sentenceTokens > maxTokens) {
                // Save current chunk and start a new one
                chunks.push(currentChunk);
                currentChunk = sentence;
                currentTokenCount = sentenceTokens;
              } else {
                // Add sentence to current chunk
                currentChunk += (currentChunk ? ' ' : '') + sentence;
                currentTokenCount += sentenceTokens;
              }
            }
          }
        } else {
          // Check if adding this paragraph would exceed the token limit
          if (currentTokenCount + paragraphTokens > maxTokens) {
            // Save current chunk and start a new one
            chunks.push(currentChunk);
            currentChunk = paragraph;
            currentTokenCount = paragraphTokens;
          } else {
            // Add paragraph to current chunk
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            currentTokenCount += paragraphTokens;
          }
        }
      }
      
      // Add the last chunk if it's not empty
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      console.log(`Created ${chunks.length} chunks using gpt-tokenizer`);
      return chunks;
    } catch (error) {
      console.error('Error chunking text by tokens:', error);
      
      // Fallback to simple token-based chunking
      console.log('Falling back to simple token-based chunking');
      const chunks: string[] = [];
      let currentChunk = '';
      let currentTokenCount = 0;
      
      // Split text into words
      const words = text.split(/\s+/);
      
      for (const word of words) {
        const wordTokens = encode(word).length;
        
        if (currentTokenCount + wordTokens > maxTokens) {
          chunks.push(currentChunk);
          currentChunk = word;
          currentTokenCount = wordTokens;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
          currentTokenCount += wordTokens;
        }
      }
      
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      return chunks;
    }
  }
} 