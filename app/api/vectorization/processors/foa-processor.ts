import { ContentProcessor, ProcessingResult } from '@/lib/vectorization/base-processor';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { FundingOpportunityExtractor, FundingOpportunity } from '@/lib/funding-opportunity-extractor';

type FOA = Database['public']['Tables']['foas']['Row'];

export class FOAProcessor extends ContentProcessor {
  private foa: FOA;
  private supabase: SupabaseClient;
  private extractor: FundingOpportunityExtractor;

  constructor(foa: FOA, projectId: string | null, supabase: SupabaseClient) {
    super(projectId);
    this.foa = foa;
    this.supabase = supabase;
    this.extractor = new FundingOpportunityExtractor();
  }

  async validate(content?: any): Promise<boolean> {
    console.log('Validating FOA:', this.foa.id);
    
    // Basic validation - check if required fields exist
    if (!this.foa.id) {
      console.error('Missing required fields for FOA:', { 
        hasId: !!this.foa.id
      });
      return false;
    }

    // Check if FOA has a URL
    if (!this.foa.grant_url) {
      console.error('FOA does not have a grant URL');
      return false;
    }

    // Validate URL format
    try {
      new URL(this.foa.grant_url);
    } catch (e) {
      console.error('Invalid URL format:', this.foa.grant_url);
      return false;
    }

    console.log('FOA validation successful');
    return true;
  }

  async process(content?: any): Promise<ProcessingResult> {
    console.log('Processing FOA:', this.foa.id);
    console.log('FOA Title:', this.foa.title);
    console.log('FOA Agency:', this.foa.agency);
    console.log('FOA Code:', this.foa.foa_code);
    console.log('FOA Grant URL:', this.foa.grant_url);
    
    try {
      // Update FOA status to processing
      await this.updateStatus('processing');
      
      // Process HTML from URL
      console.log('Processing HTML from URL:', this.foa.grant_url);
      
      if (!this.foa.grant_url) {
        throw new Error('FOA does not have a grant URL');
      }
      
      // Use the FundingOpportunityExtractor to extract data from the URL
      let extractedData: FundingOpportunity;
      try {
        console.log('Extracting data using FundingOpportunityExtractor');
        
        // The extractFromUrl method now automatically preserves the URL
        extractedData = await this.extractor.extractFromUrl(this.foa.grant_url);
        
        console.log('Successfully extracted data from URL');
        
        // Log the extracted data for debugging
        console.log('Extracted funding opportunity data:', {
          agency: extractedData.agency,
          title: extractedData.title,
          foaCode: extractedData.foa_code,
          grantType: extractedData.grant_type,
          descriptionLength: extractedData.description?.length || 0
        });
      } catch (error) {
        console.error('Error extracting funding opportunity information:', error);
        await this.updateStatus('error');
        throw new Error(`Failed to extract funding opportunity information: ${(error as Error).message}`);
      }
      
      // Update FOA record with extracted information
      const { error: updateError } = await this.supabase
        .from('foas')
        .update({
          agency: extractedData.agency,
          title: extractedData.title,
          foa_code: extractedData.foa_code,
          grant_type: extractedData.grant_type,
          description: extractedData.description,
          deadline: extractedData.deadline,
          num_awards: extractedData.num_awards,
          award_ceiling: extractedData.award_ceiling,
          award_floor: extractedData.award_floor,
          letters_of_intent: extractedData.letters_of_intent,
          preliminary_proposal: extractedData.preliminary_proposal,
          animal_trials: extractedData.animal_trials,
          human_trials: extractedData.human_trials,
          organization_eligibility: extractedData.organization_eligibility,
          user_eligibility: extractedData.user_eligibility,
          published_date: extractedData.published_date,
          submission_requirements: extractedData.submission_requirements,
          grant_url: extractedData.grant_url,
          vectorization_status: 'completed'
        })
        .eq('id', this.foa.id);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log('FOA record updated with extracted information');
      
      return {
        pineconeIds: [],
        metadata: {
          type: 'foa',
          projectId: this.projectId || undefined,
          foaId: this.foa.id,
          agency: extractedData.agency,
          title: extractedData.title,
          foaCode: extractedData.foa_code
        }
      };
    } catch (error) {
      console.error('Error processing FOA:', error);
      
      // Update FOA with error status
      await this.updateStatus('error');
      
      throw error;
    }
  }
  
  async updateStatus(status: string): Promise<void> {
    try {
      const { error: updateError } = await this.supabase
        .from('foas')
        .update({
          vectorization_status: status
        })
        .eq('id', this.foa.id);
        
      if (updateError) {
        console.error('Error updating FOA status:', updateError);
      }
    } catch (error) {
      console.error('Exception updating FOA status:', error);
    }
  }
} 