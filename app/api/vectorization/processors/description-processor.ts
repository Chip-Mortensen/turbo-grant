import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';

interface WrittenDescription {
  id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
}

export class DescriptionProcessor extends ContentProcessor {
  private content: WrittenDescription;
  private supabase: SupabaseClient;

  constructor(content: WrittenDescription, projectId: string, supabase: SupabaseClient) {
    super(projectId);
    this.content = content;
    this.supabase = supabase;
  }

  async validate(): Promise<boolean> {
    // Check required fields
    if (!this.content.file_path || !this.content.file_type) {
      return false;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(this.content.file_type)) {
      return false;
    }

    // Get file metadata from storage
    const { data: fileData, error: fileError } = await this.supabase
      .storage
      .from('written_descriptions')
      .download(this.content.file_path);

    if (fileError || !fileData) {
      console.error('Error downloading file:', fileError);
      return false;
    }

    // Check file size (10MB limit)
    const TEN_MB = 10 * 1024 * 1024;
    if (fileData.size > TEN_MB) {
      console.error('File too large:', fileData.size);
      return false;
    }

    return true;
  }

  async process(): Promise<ProcessingResult> {
    console.log('Processing written description:', { id: this.content.id, fileName: this.content.file_name });

    try {
      // Download file from storage
      const { data: fileData, error: fileError } = await this.supabase
        .storage
        .from('written_descriptions')
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
          type: 'description',
          projectId: this.projectId,
          fileName: this.content.file_name,
          fileType: this.content.file_type,
          chunkIndex: i + 1,
          totalChunks: chunks.length
        };

        const pineconeId = await this.storePineconeVector(embedding, metadata);
        pineconeIds.push(pineconeId);
        console.log(`Stored chunk ${i + 1} in Pinecone with ID: ${pineconeId}`);
      }

      // Update the description status
      const { error: updateError } = await this.supabase
        .from('written_descriptions')
        .update({
          vectorization_status: 'completed',
          last_vectorized_at: new Date().toISOString(),
          pinecone_id: pineconeIds.join(',')
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
      console.error('Error in processDescription:', error);
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
} 