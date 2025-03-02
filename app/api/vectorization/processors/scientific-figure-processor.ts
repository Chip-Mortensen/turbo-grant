import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';
import { Database } from '@/types/supabase';
import { encode } from 'gpt-tokenizer';
import { generateEmbeddings, generateImageDescription } from '@/lib/vectorization/openai';

type ScientificFigure = Database['public']['Tables']['scientific_figures']['Row'];

export class ScientificFigureProcessor extends ContentProcessor {
  private content: ScientificFigure;
  private supabase: SupabaseClient;

  constructor(content: ScientificFigure, projectId: string, supabase: SupabaseClient) {
    super(projectId);
    this.content = content;
    this.supabase = supabase;
  }

  async validate(): Promise<boolean> {
    console.log('Starting validation for scientific figure:', { 
      id: this.content.id, 
      imagePath: this.content.image_path,
    });
    
    // Check required fields
    if (!this.content.image_path) {
      console.error('Missing required field: image_path');
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
      const bucketExists = buckets.some(b => b.name === 'scientific-figures');
      if (!bucketExists) {
        console.error('Bucket "scientific-figures" does not exist');
        return false;
      }

      // Get file metadata from storage
      console.log('Attempting to download file');
      const { data: fileData, error: fileError } = await this.supabase
        .storage
        .from('scientific-figures')
        .download(this.content.image_path);

      if (fileError) {
        console.error('Error downloading file:', {
          error: fileError,
          path: this.content.image_path,
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
    console.log('Processing scientific figure:', { id: this.content.id });

    try {
      // Download image from storage
      const { data: fileData, error: fileError } = await this.supabase
        .storage
        .from('scientific-figures')
        .download(this.content.image_path);

      if (fileError || !fileData) {
        const errorMsg = `Failed to download image: ${fileError?.message}`;
        console.error(errorMsg);
        await this.updateStatus('error', errorMsg);
        throw new Error(errorMsg);
      }

      // Convert image to base64
      const buffer = await fileData.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      console.log('Converted image to base64');

      // Generate AI description using OpenAI Vision API
      console.log('Generating AI description using Vision API');
      const description = await generateImageDescription(base64Image);
      console.log('Generated AI description, length:', description.length);

      // Combine caption with AI description if available
      let fullText = description;
      if (this.content.caption) {
        fullText = `Caption: ${this.content.caption}\n\nDescription: ${description}`;
        console.log('Combined caption with AI description');
      }

      // Generate embedding for the combined text
      console.log('Generating embedding for text');
      const embedding = await generateEmbeddings(fullText);
      console.log('Generated embedding');

      // Store in Pinecone with metadata
      const metadata: ProcessingMetadata = {
        type: 'scientific_figure',
        projectId: this.projectId || undefined,
        figureId: this.content.id,
        caption: this.content.caption || undefined,
        text: fullText,
        charCount: fullText.length,
        wordCount: fullText.split(/\s+/).length
      };

      const pineconeId = await this.storePineconeVector(embedding, metadata);
      console.log(`Stored vector in Pinecone with ID: ${pineconeId}`);

      // Update the figure record
      const { error: updateError } = await this.supabase
        .from('scientific_figures')
        .update({
          vectorization_status: 'completed',
          ai_description: description,
          pinecone_id: pineconeId
        })
        .eq('id', this.content.id);

      if (updateError) {
        console.error('Error updating figure status:', updateError);
        throw updateError;
      }

      return {
        pineconeIds: [pineconeId],
        metadata: {
          figureId: this.content.id,
          description: description
        }
      };
    } catch (error) {
      console.error('Error in process:', error);
      
      // Make sure we update the status if it hasn't been done already
      try {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await this.updateStatus('error', errorMsg);
      } catch (statusError) {
        console.error('Failed to update error status:', statusError);
      }
      
      throw error;
    }
  }

  async updateStatus(status: string, error?: string): Promise<void> {
    console.log(`Updating figure status to ${status}${error ? ' with error: ' + error : ''}`);
    
    try {
      const { error: updateError } = await this.supabase
        .from('scientific_figures')
        .update({
          vectorization_status: status,
        })
        .eq('id', this.content.id);

      if (updateError) {
        console.error('Error updating figure status:', updateError);
        throw updateError;
      }
    } catch (err) {
      console.error('Error in updateStatus:', err);
      throw err;
    }
  }
} 