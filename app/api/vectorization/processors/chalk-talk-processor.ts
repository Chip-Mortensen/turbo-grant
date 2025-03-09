import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';
import { Database } from '@/types/supabase';
import { encode } from 'gpt-tokenizer';
import { generateEmbeddings } from '@/lib/vectorization/openai';
import OpenAI from 'openai';
import { Readable } from 'stream';

type ChalkTalk = Database['public']['Tables']['chalk_talks']['Row'];

// Maximum duration for audio chunks (10 minutes in seconds)
const CHUNK_SIZE_SECONDS = 600;

export class ChalkTalkProcessor extends ContentProcessor {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(content: ChalkTalk, projectId: string, supabase: SupabaseClient) {
    super(projectId);
    this.supabase = supabase;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async validate(content: ChalkTalk): Promise<boolean> {
    console.log('Starting validation for chalk talk:', { 
      id: content.id, 
      mediaPath: content.media_path,
      vectorizationStatus: content.vectorization_status
    });
    
    // Check if already vectorized
    if (content.vectorization_status === 'completed') {
      console.error('Chalk talk already vectorized');
      return false;
    }

    // Check if media file exists
    try {
      const { data, error } = await this.supabase
        .storage
        .from('chalk-talks')
        .download(content.media_path);
      
      if (error || !data) {
        console.error('Media file not found:', error);
        return false;
      }
    } catch (error) {
      console.error('Error checking media file:', error);
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

      // First, handle transcription
      console.log('Starting transcription process');
      const transcription = await this.transcribeAudio(content);
      
      if (!transcription) {
        throw new Error('Failed to generate transcription');
      }

      console.log('Transcription completed, length:', transcription.length);

      // Update the chalk talk with transcription
      const { error: transcriptionError } = await this.supabase
        .from('chalk_talks')
        .update({
          transcription: transcription,
          transcription_status: 'completed'
        })
        .eq('id', content.id);

      if (transcriptionError) {
        throw new Error(`Failed to update transcription: ${transcriptionError.message}`);
      }

      // Split transcription into chunks for vectorization
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
          console.error(`Error processing chunk ${i + 1}:`, chunkError);
          // Continue with other chunks even if one fails
          continue;
        }
      }

      if (pineconeIds.length === 0) {
        throw new Error('Failed to process any chunks successfully');
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
        throw new Error(`Failed to update chalk talk status: ${updateError.message}`);
      }

      return {
        pineconeIds,
        chunks,
        metadata: {
          totalChunks: chunks.length
        }
      };
    } catch (error) {
      console.error('Error in process:', error);
      
      // Update error status
      try {
        await this.updateStatus('failed', content);
        
        // Update transcription error if we failed during transcription
        if (!content.transcription) {
          await this.supabase
            .from('chalk_talks')
            .update({
              transcription_status: 'error',
              transcription_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', content.id);
        }
      } catch (statusError) {
        console.error('Failed to update error status:', statusError);
      }
      
      throw error;
    }
  }

  private async transcribeAudio(content: ChalkTalk): Promise<string> {
    try {
      // Download the audio file
      console.log(`Downloading audio file from storage: ${content.media_path}`);
      const { data: fileData, error: downloadError } = await this.supabase
        .storage
        .from('chalk-talks')
        .download(content.media_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download audio: ${downloadError?.message || 'No data returned'}`);
      }

      // Process the audio file in chunks
      const audioBuffer = await fileData.arrayBuffer();
      const chunks = await this.splitAudioIntoChunks(audioBuffer);
      console.log(`Split audio into ${chunks.length} chunks`);

      // Process each chunk with Whisper API
      const transcriptionParts: string[] = [];
      let hasErrors = false;

      for (let i = 0; i < chunks.length; i++) {
        try {
          console.log(`Processing chunk ${i + 1}/${chunks.length}`);
          
          // Create a FormData object with the chunk
          const formData = new FormData();
          formData.append('file', new Blob([chunks[i]], { type: 'audio/mpeg' }), `chunk-${i}.mp3`);
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');

          // Call Whisper API
          const response = await this.openai.audio.transcriptions.create({
            file: new File([chunks[i]], `chunk-${i}.mp3`, { type: 'audio/mpeg' }),
            model: 'whisper-1',
            language: 'en'
          });

          if (response.text && response.text.trim() !== '') {
            transcriptionParts.push(response.text);
            console.log(`Chunk ${i + 1} processed successfully`);
          } else {
            console.warn(`Chunk ${i + 1} returned empty transcription`);
            hasErrors = true;
          }
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}:`, error);
          hasErrors = true;
          // Continue with other chunks
        }
      }

      // Combine all transcription parts
      const fullTranscription = transcriptionParts.join(' ');
      
      if (fullTranscription.length === 0) {
        throw new Error('No transcription was generated for any chunk');
      }

      return fullTranscription;
    } catch (error) {
      console.error('Error in transcribeAudio:', error);
      throw error;
    }
  }

  private async splitAudioIntoChunks(audioBuffer: ArrayBuffer): Promise<ArrayBuffer[]> {
    // For now, we'll use a simple byte-based splitting approach
    // In a production environment, you might want to use a proper audio processing library
    const chunks: ArrayBuffer[] = [];
    const totalSize = audioBuffer.byteLength;
    
    // Estimate chunk size based on total size and desired duration
    // This is a rough approximation - in production you'd want to use proper audio duration
    const estimatedBytesPerSecond = totalSize / (60 * 60); // Assume max 1 hour
    const chunkSize = estimatedBytesPerSecond * CHUNK_SIZE_SECONDS;
    
    for (let offset = 0; offset < totalSize; offset += chunkSize) {
      const chunk = audioBuffer.slice(offset, Math.min(offset + chunkSize, totalSize));
      chunks.push(chunk);
    }
    
    return chunks;
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