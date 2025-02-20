import { SupabaseClient } from '@supabase/supabase-js';
import { ContentProcessor, ProcessingMetadata, ProcessingResult } from '@/lib/vectorization/base-processor';

interface ResearcherProfile {
  id: string;
  name: string;
  title: string;
  institution: string;
  bio: string;
  project_id: string;
}

export class ResearcherProcessor extends ContentProcessor {
  private content: ResearcherProfile;
  private supabase: SupabaseClient;

  constructor(content: ResearcherProfile, projectId: string, supabase: SupabaseClient) {
    super(projectId);
    this.content = content;
    this.supabase = supabase;
  }

  async validate(content: any): Promise<boolean> {
    // Check required fields
    if (!this.content.name || !this.content.project_id) {
      console.error('Missing required fields:', {
        hasName: !!this.content.name,
        hasProjectId: !!this.content.project_id
      });
      return false;
    }
    return true;
  }

  async process(content: any): Promise<ProcessingResult> {
    console.log('Processing researcher profile:', { id: this.content.id, name: this.content.name });
    
    try {
      // Combine basic profile data
      const basicInfo = [
        `Name: ${this.content.name}`,
        `Title: ${this.content.title || 'N/A'}`,
        `Institution: ${this.content.institution || 'N/A'}`
      ].join('\n');

      // Process biography separately if it exists
      const bioChunks = this.content.bio ? 
        this.splitIntoChunks(this.content.bio) : 
        [];

      console.log('Split biography into chunks:', bioChunks.length);

      const pineconeIds: string[] = [];
      const allChunks: string[] = [];

      // First, process the basic info
      const basicInfoEmbedding = await this.generateEmbeddings(basicInfo);
      const basicMetadata: ProcessingMetadata = {
        type: 'researcher',
        projectId: this.projectId,
        name: this.content.name,
        title: this.content.title,
        institution: this.content.institution,
        chunkType: 'basic_info',
        text: basicInfo,
        charCount: basicInfo.length,
        wordCount: basicInfo.split(/\s+/).length
      };

      const basicInfoId = await this.storePineconeVector(basicInfoEmbedding, basicMetadata);
      pineconeIds.push(basicInfoId);
      allChunks.push(basicInfo);

      // Then process biography chunks if they exist
      for (let i = 0; i < bioChunks.length; i++) {
        const chunk = bioChunks[i];
        const embedding = await this.generateEmbeddings(chunk);
        
        const metadata: ProcessingMetadata = {
          type: 'researcher',
          projectId: this.projectId,
          name: this.content.name,
          title: this.content.title,
          institution: this.content.institution,
          chunkType: 'biography',
          chunkIndex: i + 1,
          totalBioChunks: bioChunks.length,
          text: chunk,
          charCount: chunk.length,
          wordCount: chunk.split(/\s+/).length
        };

        const pineconeId = await this.storePineconeVector(embedding, metadata);
        pineconeIds.push(pineconeId);
        allChunks.push(chunk);
        console.log(`Stored biography chunk ${i + 1}/${bioChunks.length} in Pinecone`);
      }

      // Update the researcher profile with vectorization status
      const { error: updateError } = await this.supabase
        .from('researcher_profiles')
        .update({
          vectorization_status: 'completed',
          last_vectorized_at: new Date().toISOString(),
          pinecone_id: pineconeIds.join(',')
        })
        .eq('id', this.content.id);

      if (updateError) {
        console.error('Error updating researcher profile status:', updateError);
        throw updateError;
      }

      return {
        pineconeIds,
        chunks: allChunks,
        metadata: {
          name: this.content.name,
          title: this.content.title,
          institution: this.content.institution,
          totalChunks: allChunks.length,
          hasBiography: bioChunks.length > 0
        }
      };
    } catch (error) {
      console.error('Error in processResearcher:', error);
      throw error;
    }
  }
} 