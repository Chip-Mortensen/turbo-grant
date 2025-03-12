import OpenAI from 'openai';
import { getOrganizationTypes, getNsfProposalTypes } from '@/types/enum-types';

/**
 * Interface representing the extracted funding opportunity information
 */
export interface FundingOpportunity {
  agency: 'NIH' | 'NSF';
  title: string;
  foa_code: string;
  grant_type: Record<string, any>;
  description: string;
  deadline: string;
  num_awards: number;
  award_ceiling?: number;
  award_floor?: number;
  letters_of_intent: boolean;
  preliminary_proposal: boolean;
  animal_trials: boolean;
  human_trials: boolean;
  organization_eligibility: Record<string, any>;
  grant_url?: string;
  published_date: string;
}

/**
 * Extracts funding opportunity information from HTML content using OpenAI
 */
export class FundingOpportunityExtractor {
  private openai: OpenAI;
  
  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Fetches HTML content from a URL and extracts funding opportunity information
   * @param url The URL to fetch HTML content from
   * @returns A Promise resolving to the extracted funding opportunity information
   */
  async extractFromUrl(url: string): Promise<FundingOpportunity> {
    try {
      // Fetch HTML content from the URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      
      // Use the existing method to extract information from HTML
      // Pass the URL as part of the base data
      return this.extractFromHtml(htmlContent, { grant_url: url });
    } catch (error) {
      console.error('Error fetching URL or extracting funding opportunity information:', error);
      throw new Error('Failed to extract funding opportunity information from URL');
    }
  }

  /**
   * Extracts funding opportunity information from HTML content
   * @param htmlContent The HTML content to extract information from
   * @param baseData Optional base data to include in the extracted information
   * @returns A Promise resolving to the extracted funding opportunity information
   */
  async extractFromHtml(htmlContent: string, baseData?: Partial<FundingOpportunity>): Promise<FundingOpportunity> {
    try {
      // Extract text content from HTML
      const textContent = this.stripHtml(htmlContent);
      
      // Use OpenAI to extract structured information
      const extractedInfo = await this.extractWithOpenAI(textContent);
      
      // Merge with base data if provided
      if (baseData) {
        return {
          ...extractedInfo,
          ...baseData
        };
      }
      
      return extractedInfo;
    } catch (error) {
      console.error('Error extracting funding opportunity information:', error);
      throw new Error('Failed to extract funding opportunity information');
    }
  }

  /**
   * Strips HTML tags from content to get plain text
   * @param html The HTML content to strip
   * @returns Plain text content
   */
  private stripHtml(html: string): string {
    // Simple HTML stripping - in production, consider using a proper HTML parser
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Uses OpenAI to extract structured information from text content
   * @param textContent The text content to extract information from
   * @returns A Promise resolving to the extracted funding opportunity information
   */
  private async extractWithOpenAI(textContent: string): Promise<FundingOpportunity> {
    // Get today's date in Month Day, Year format
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Get all organization types from the centralized utility
    const organizationTypes = getOrganizationTypes();
    
    // Get all NSF proposal types from the centralized utility
    const nsfProposalTypes = getNsfProposalTypes();

    const prompt = `

        You are provided with a funding opportunity document. Extract the relevant information and return it in JSON format. The JSON that is created much be 100% informed by the document text. Please do not make up any information.

        The JSON should include the following fields:

        The agency, which must be either "NIH" or "NSF" (this field is required).

        The title, which is the full title of the funding opportunity (this field is required).

        The foa_code, which is the Funding Opportunity Announcement code, such as "PA-25-303" or "NSF 25-535" (this field is required and must be unique).

        The grant_type, which should be a JSON object where the keys are the grant types (such as "R01", "R21", "K99") and the values are boolean true. For example, if the grant type is "R01", the field should be {"R01": true}. If multiple grant types are mentioned, include all of them as keys with true values. (this field is required). 
        
        IMPORTANT: In an NSF application, the grant_type field could also be listed as a proposal type under any of these: ${nsfProposalTypes.join(', ')}. If it's an NSF application and there isn't any proposal type or it's a standard proposal, please use 'research' as the key and true as the value for grant_type. IMPORTANT: If multiple are mentioned, please include all of them as keys with true values.

        The description, which should provide an in-depth description of the funding opportunity and should include details about every important aspect. This description should be comprehensive (around 100-300 words) and cover the purpose, scope, research areas, expected outcomes, and any special considerations of the funding opportunity. Please try to use exerpts from the text where you can. (this field is required).

        The deadline, which should be the submission deadline formatted EXACTLY as "Month Day, Year" (e.g., "May 15, 2024") (this field is required). If there are multiple deadlines, please use the one that is closer to today's date, but also after today's date, which is ${formattedDate}.

        The num_awards, which is the expected number of awards and should be an integer that is zero or more (this field is required). If the exact number is not specified in the document, use your best estimate based on the document or use 1 as a default.

        The award_ceiling, which is the maximum funding amount (numeric, optional).

        The award_floor, which is the minimum funding amount (numeric, optional).

        The letters_of_intent field should be true if a Letter of Intent (LOI) is required and false if not (default is false).

        The preliminary_proposal field should be true if a preliminary proposal is required and false if not (default is false).

        The animal_trials field should be true if animal trials are involved and false if not (default is false).

        The human_trials field should be true if human trials are involved and false if not (default is false).

        The organization_eligibility field should capture eligibility details for organizations and be structured as JSON (this field is required). IMPORTANT: Make sure that it adheres to boolean for each enum list:   

        ${organizationTypes.map(type => `"${type}"`).join('\n        ')}
        
        IMPORTANT: If it mentions local governments, please make sure that county_government and city_township_government are both true.

        The published_date, which is the date the funding opportunity was published, formatted in ISO 8601 format (YYYY-MM-DD) (this field is required).
        
        Return only valid JSON. Do not include extra commentary or formatting.

        Example: 

        {
          agency: 'NSF',
          title: 'Translation and Diffusion (TD)',
          foa_code: 'NSF 25-528',
          grant_type: { research: true, conference: true },
          description: 'The Translation and Diffusion (TD) program aims to facilitate the reciprocal process of translating and diffusing scientific knowledge to and from practice in STEM education. This funding opportunity encourages the scientific study of theories, frameworks, and models for the translation and diffusion of knowledge, particularly in PreK-12 STEM education. It invites proposals in four categories: Research on Translation or Diffusion, Proof-of-Concept Research, Synthesis proposals, and Conference/Workshop proposals. The program emphasizes the importance of overcoming barriers to the application of research insights in educational practice and aims to enrich the sciences informing STEM education. Proposals may request funding for up to $1 million for research projects with a duration of up to three years, or up to $500,000 for synthesis projects. The program also encourages broadening participation in STEM by supporting underrepresented communities.',
          deadline: 'April 01, 2025',
          num_awards: 15,
          award_ceiling: 1000000,
          award_floor: 25000,
          letters_of_intent: false,
          preliminary_proposal: false,
          animal_trials: false,
          human_trials: false,
          organization_eligibility: {
            city_township_government: true,
            county_government: true,
            for_profit: true,
            independent_school_district: false,
            individual: false,
            native_american_tribal_government: false,
            native_american_tribal_organization: false,
            non_profit: true,
            others: false,
            private_higher_education_institution: true,
            public_higher_education_institution: true,
            public_housing_authorities: false,
            small_business: true,
            special_district_governments: false,
            state_governments: true,
            unrestricted: false
          },
          published_date: '2024-12-20'
        }

        Document text:
        ${textContent}
        `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    try {
      const parsedContent = JSON.parse(content) as FundingOpportunity;
      console.log(parsedContent);
      return this.validateExtractedInfo(parsedContent);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Failed to parse extracted information');
    }
  }

  /**
   * Validates the extracted funding opportunity information
   * @param info The extracted funding opportunity information to validate
   * @returns The validated funding opportunity information
   */
  private validateExtractedInfo(info: any): FundingOpportunity {
    // Set default values for missing fields instead of validating required fields
    info.agency = info.agency || 'NIH';
    info.title = info.title || '';
    info.foa_code = info.foa_code || '';
    
    // Convert grant_type from string to object if it's a string
    if (typeof info.grant_type === 'string' && info.grant_type.trim() !== '') {
      const grantTypeValue = info.grant_type.trim();
      info.grant_type = { [grantTypeValue]: true };
    } else if (!info.grant_type || typeof info.grant_type !== 'object') {
      info.grant_type = {};
    }
    
    info.description = info.description || '';
    info.deadline = info.deadline || '';
    info.num_awards = info.num_awards || 1;
    info.organization_eligibility = info.organization_eligibility || {};
    info.published_date = info.published_date || new Date().toISOString().split('T')[0];
    
    // Validate agency only if it's provided
    if (info.agency && info.agency !== 'NIH' && info.agency !== 'NSF') {
      info.agency = 'NIH'; // Default to NIH if invalid
    }
    
    // Validate deadline format (should be "Month Day, Year") only if it's provided
    if (info.deadline) {
      // Check if the deadline is in the expected format
      const deadlineRegex = /^[A-Z][a-z]+ \d{1,2}, \d{4}$/;
      if (!deadlineRegex.test(info.deadline)) {
        console.warn(`Deadline format is not in "Month Day, Year" format: ${info.deadline}`);
        try {
          // Try to reformat the date if possible
          const date = new Date(info.deadline);
          if (!isNaN(date.getTime())) {
            info.deadline = date.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
            console.log(`Reformatted deadline to: ${info.deadline}`);
          }
        } catch (e) {
          console.error('Failed to reformat deadline:', e);
          // Keep the original format if reformatting fails
        }
      }
    }
    
    // Validate published_date format (should be ISO 8601: YYYY-MM-DD) only if it's provided
    if (info.published_date) {
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoDateRegex.test(info.published_date)) {
        console.warn(`Published date is not in ISO 8601 format: ${info.published_date}`);
        try {
          // Try to reformat the date if possible
          const date = new Date(info.published_date);
          if (!isNaN(date.getTime())) {
            info.published_date = date.toISOString().split('T')[0]; // Get YYYY-MM-DD part
            console.log(`Reformatted published_date to: ${info.published_date}`);
          }
        } catch (e) {
          console.error('Failed to reformat published_date:', e);
          // Keep the original format if reformatting fails
        }
      }
    }
    
    // Validate num_awards is a non-negative integer
    if (typeof info.num_awards !== 'number' || isNaN(info.num_awards)) {
      console.warn('Invalid num_awards value, defaulting to 1');
      info.num_awards = 1;
    } else if (info.num_awards < 0 || !Number.isInteger(info.num_awards)) {
      // Convert to a positive integer
      info.num_awards = Math.max(0, Math.round(info.num_awards));
    }
    
    // Set default values for boolean fields if not provided
    info.letters_of_intent = info.letters_of_intent ?? false;
    info.preliminary_proposal = info.preliminary_proposal ?? false;
    info.animal_trials = info.animal_trials ?? false;
    info.human_trials = info.human_trials ?? false;
    
    return info as FundingOpportunity;
  }
} 