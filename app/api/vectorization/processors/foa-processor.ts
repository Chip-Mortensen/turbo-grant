import { ContentProcessor, ProcessingResult } from '@/lib/vectorization/base-processor';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { FundingOpportunityExtractor, FundingOpportunity } from '@/lib/funding-opportunity-extractor';
import { encode } from 'gpt-tokenizer';

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

  /**
   * Strips HTML tags from content to get plain text
   * @param html The HTML content to strip
   * @returns Plain text content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
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
      
      // Fetch the raw HTML content for later processing
      let rawTextContent = '';
      let extractedData: FundingOpportunity;
      
      try {
        console.log('Fetching HTML content from URL');
        const response = await fetch(this.foa.grant_url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        
        const htmlContent = await response.text();
        
        // Strip HTML tags to get raw text content
        rawTextContent = this.stripHtml(htmlContent);
        
        console.log('Raw text content length:', rawTextContent.length);
        
        // Use the FundingOpportunityExtractor to extract structured data
        console.log('Extracting data using FundingOpportunityExtractor');
        extractedData = await this.extractor.extractFromHtml(htmlContent, { grant_url: this.foa.grant_url });
        
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
      
      // Generate embeddings and store in Pinecone for the FOA description
      const descriptionPineconeIds: string[] = [];
      try {
        console.log('Generating embeddings for FOA description');
        
        // Check if description exists and has content
        if (!extractedData.description || extractedData.description.trim().length === 0) {
          throw new Error('FOA description is empty or missing');
        }
        
        // Generate embedding for the description
        const embedding = await this.generateEmbeddings(extractedData.description);
        console.log('Successfully generated embedding for FOA description');
        
        // Prepare metadata for Pinecone
        // Flatten organization_eligibility
        const orgEligibility = extractedData.organization_eligibility || {};
        const flattenedOrgEligibility = {
          org_higher_education: !!orgEligibility['Higher Education'],
          org_non_profit: !!orgEligibility['Non-Profit'],
          org_for_profit: !!orgEligibility['For-Profit'],
          org_government: !!orgEligibility['Government'],
          org_hospital: !!orgEligibility['Hospital'],
          org_foreign: !!orgEligibility['Foreign'],
          org_individual: !!orgEligibility['Individual']
        };
        
        // Flatten user_eligibility
        const userEligibility = extractedData.user_eligibility || {};
        const flattenedUserEligibility = {
          user_pi: !!userEligibility['Principal Investigator (PI)'],
          user_co_pi: !!userEligibility['Co-Principal Investigator(Co-PI)'],
          user_co_i: !!userEligibility['Co-Investigator (Co-I)'],
          user_senior_personnel: !!userEligibility['Senior Personnel'],
          user_postdoc: !!userEligibility['Postdoctoral Researcher'],
          user_grad_student: !!userEligibility['Graduate Student'],
          user_undergrad: !!userEligibility['Undergraduate Student'],
          user_project_admin: !!userEligibility['Project Administrator'],
          user_aor: !!userEligibility['Authorized Organizational Representative (AOR)']
        };
        
        // Format deadline as ISO date if possible
        let formattedDeadline = extractedData.deadline;
        let deadlineTimestamp: number | undefined;
        try {
          if (extractedData.deadline) {
            const deadlineDate = new Date(extractedData.deadline);
            if (!isNaN(deadlineDate.getTime())) {
              formattedDeadline = deadlineDate.toISOString().split('T')[0]; // YYYY-MM-DD
              deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000); // Unix timestamp in seconds
            }
          }
        } catch (e) {
          console.warn('Could not format deadline as ISO date:', e);
        }
        
        // Create metadata object
        const metadata = {
          type: 'foa_description' as const,
          foaId: this.foa.id,
          projectId: this.projectId || undefined,
          agency: extractedData.agency,
          // Only include grant_type for NIH
          ...(extractedData.agency === 'NIH' ? { grant_type: extractedData.grant_type } : {}),
          title: extractedData.title,
          foa_code: extractedData.foa_code,
          deadline_timestamp: deadlineTimestamp, // Store only the timestamp for filtering
          award_floor: typeof extractedData.award_floor === 'number' ? extractedData.award_floor : undefined,
          award_ceiling: typeof extractedData.award_ceiling === 'number' ? extractedData.award_ceiling : undefined,
          animal_trials: !!extractedData.animal_trials,
          human_trials: !!extractedData.human_trials,
          // Include flattened eligibility fields
          ...flattenedOrgEligibility,
          ...flattenedUserEligibility,
          // Include the text for full-text search
          text: extractedData.description
        };
        
        // Store vector in Pinecone
        console.log('Storing vector in Pinecone with metadata');
        const pineconeId = await this.storePineconeVector(embedding, metadata);
        descriptionPineconeIds.push(pineconeId);
        console.log('Successfully stored vector in Pinecone with ID:', pineconeId);
      } catch (error) {
        console.error('Error generating embeddings or storing in Pinecone for description:', error);
        // Continue with the process even if vectorization fails
        // We'll still update the FOA record with the extracted information
      }
      
      // Process raw content
      const rawContentPineconeIds: string[] = [];
      try {
        if (rawTextContent && rawTextContent.length > 0) {
          console.log('Processing raw content for vectorization');
          console.log('Raw content length:', rawTextContent.length);
          console.log('Raw content sample (first 200 chars):', rawTextContent.substring(0, 200));
          
          // Chunk the raw content by tokens
          const chunks = this.chunkByTokens(rawTextContent);
          console.log(`Split raw content into ${chunks.length} chunks`);
          
          // Process each chunk
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Processing chunk ${i + 1}/${chunks.length}, length: ${chunk.length}`);
            console.log(`Chunk ${i + 1} sample (first 100 chars):`, chunk.substring(0, 100));
            
            try {
              // Generate embedding for the chunk
              const embedding = await this.generateEmbeddings(chunk);
              console.log(`Generated embedding for chunk ${i + 1}, embedding length:`, embedding.length);
              
              // Create metadata with the text content included
              const metadata = {
                type: 'foa_raw' as const,
                foaId: this.foa.id,
                chunkIndex: i + 1,
                totalChunks: chunks.length,
                text: chunk // Include the actual text content in the metadata
              };
              
              console.log(`Storing chunk ${i + 1} in Pinecone with metadata type:`, metadata.type);
              
              // Store in Pinecone
              const pineconeId = await this.storePineconeVector(embedding, metadata);
              rawContentPineconeIds.push(pineconeId);
              console.log(`Successfully stored raw chunk ${i + 1} in Pinecone with ID: ${pineconeId}`);
            } catch (chunkError) {
              console.error(`Error processing chunk ${i + 1}:`, chunkError);
              // Continue with next chunk
            }
          }
        } else {
          console.warn('No raw content available for vectorization');
        }
      } catch (error) {
        console.error('Error processing raw content:', error);
        // Continue with the process even if raw content vectorization fails
      }
      
      // Combine all Pinecone IDs
      const allPineconeIds = [...descriptionPineconeIds, ...rawContentPineconeIds];
      console.log(`Total Pinecone IDs: ${allPineconeIds.length} (${descriptionPineconeIds.length} description, ${rawContentPineconeIds.length} raw)`);
      
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
          vectorization_status: 'completed',
          pinecone_ids: allPineconeIds.length > 0 ? allPineconeIds : null
        })
        .eq('id', this.foa.id);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log('FOA record updated with extracted information and vectorization status');
      
      return {
        pineconeIds: allPineconeIds,
        metadata: {
          type: 'foa_description' as const,
          foaId: this.foa.id,
          projectId: this.projectId || undefined,
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
  
  /**
   * Chunks text by token count using gpt-tokenizer
   * @param text The text to chunk
   * @param maxTokens Maximum tokens per chunk
   * @returns Array of text chunks
   */
  private chunkByTokens(text: string, maxTokens: number = 4000): string[] {
    console.log('Chunking text by tokens, text length:', text.length);
    
    try {
      // Split text into sentences or paragraphs first
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
      const chunkSize = 12000; // Approximate character count for 4000 tokens
      
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      
      return chunks;
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