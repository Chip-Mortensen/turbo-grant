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
      // Combine all profile data
      const fullText = [
        `Name: ${this.content.name}`,
        `Title: ${this.content.title || 'N/A'}`,
        `Institution: ${this.content.institution || 'N/A'}`,
        this.content.bio || ''
      ].filter(Boolean).join('\n\n');

      const embedding = await this.generateEmbeddings(fullText);
      
      const metadata: ProcessingMetadata = {
        type: 'researcher',
        projectId: this.projectId,
        name: this.content.name,
        title: this.content.title,
        institution: this.content.institution,
        text: fullText,
        bio: this.content.bio || null
      };

      const pineconeId = await this.storePineconeVector(embedding, metadata);

      // Update the researcher profile with vectorization status
      const { error: updateError } = await this.supabase
        .from('researcher_profiles')
        .update({
          vectorization_status: 'completed',
          last_vectorized_at: new Date().toISOString(),
          pinecone_id: pineconeId
        })
        .eq('id', this.content.id);

      if (updateError) {
        console.error('Error updating researcher profile status:', updateError);
        throw updateError;
      }

      return {
        pineconeIds: [pineconeId],
        chunks: [fullText],
        metadata: {
          name: this.content.name,
          title: this.content.title,
          institution: this.content.institution
        }
      };
    } catch (error) {
      console.error('Error in processResearcher:', error);
      throw error;
    }
  }
} 