import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';
import { Database } from '@/types/supabase';

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
        throw new Error(`Failed to download file: ${fileError?.message}`);
      }

      // Extract text based on file type
      const text = await this.extractText(fileData);
      console.log('Extracted text length:', text.length);

      // Split into chunks
      const chunks = this.splitIntoChunks(text);
      console.log('Split into chunks:', chunks.length);

      // Process each chunk
      const pineconeIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding for chunk
        const embedding = await this.generateEmbeddings(chunk);
        console.log(`Generated embedding for chunk ${i + 1}/${chunks.length}`);

        // Store in Pinecone with metadata
        const metadata: ProcessingMetadata = {
          type: 'research_description',
          projectId: this.projectId,
          fileName: this.content.file_name,
          fileType: this.content.file_type,
          chunkIndex: i + 1,
          totalChunks: chunks.length,
          text: chunk,
          charCount: chunk.length,
          wordCount: chunk.split(/\s+/).length
        };

        const pineconeId = await this.storePineconeVector(embedding, metadata);
        pineconeIds.push(pineconeId);
        console.log(`Stored chunk ${i + 1} in Pinecone with ID: ${pineconeId}`);
      }

      // Update the description status
      const { error: updateError } = await this.supabase
        .from('research_descriptions')
        .update({
          vectorization_status: 'completed',
          last_vectorized_at: new Date().toISOString(),
          pinecone_ids: pineconeIds
        })
        .eq('id', this.content.id);

      if (updateError) {
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
      throw error;
    }
  }

  private async extractText(file: Blob): Promise<string> {
    const buffer = await file.arrayBuffer();
    
    switch (this.content.file_type) {
      case 'application/pdf': {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(Buffer.from(buffer));
        return pdfData.text;
      }
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        try {
          const mammoth = await import('mammoth');
          const { value, messages } = await mammoth.extractRawText({
            arrayBuffer: buffer
          });

          // Log any warnings or issues
          if (messages.length > 0) {
            console.warn('DOCX processing messages:', messages);
          }

          if (!value || value.trim().length === 0) {
            throw new Error('No text content extracted from DOCX file');
          }

          return value;
        } catch (err) {
          const error = err as Error;
          console.error('Error processing DOCX file:', error);
          throw new Error(`Failed to process DOCX file: ${error.message}`);
        }
      }
      
      case 'text/plain': {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(buffer);
      }
      
      default:
        throw new Error(`Unsupported file type: ${this.content.file_type}`);
    }
  }

  async updateStatus(status: string, error?: string): Promise<void> {
    const updates: any = {
      vectorization_status: status,
      last_vectorized_at: new Date().toISOString()
    };
    
    if (error) {
      updates.vectorization_error = error;
    }
    
    await this.supabase
      .from('research_descriptions')
      .update(updates)
      .eq('id', this.content.id);
  }
} 