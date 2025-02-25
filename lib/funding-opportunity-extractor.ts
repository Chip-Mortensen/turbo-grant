import OpenAI from 'openai';

/**
 * Interface representing the extracted funding opportunity information
 */
export interface FundingOpportunity {
  agency: 'NIH' | 'NSF';
  title: string;
  foa_code: string;
  grant_type: string;
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
  user_eligibility: Record<string, any>;
  grant_url?: string;
  published_date: string;
  submission_requirements: Record<string, any>;
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
   * Extracts funding opportunity information from HTML content
   * @param htmlContent The HTML content to extract information from
   * @returns A Promise resolving to the extracted funding opportunity information
   */
  async extractFromHtml(htmlContent: string): Promise<FundingOpportunity> {
    try {
      // Extract text content from HTML
      const textContent = this.stripHtml(htmlContent);
      
      // Use OpenAI to extract structured information
      const extractedInfo = await this.extractWithOpenAI(textContent);
      
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

    const prompt = `

        You are provided with a funding opportunity document. Extract the relevant information and return it in JSON format. The JSON that is created much be 100% informed by the document text. Please do not make up any information.

The JSON should include the following fields:

The agency, which must be either "NIH" or "NSF" (this field is required).

The title, which is the full title of the funding opportunity (this field is required).

The foa_code, which is the Funding Opportunity Announcement code, such as "PA-25-303" or "NSF 25-535" (this field is required and must be unique).

The grant_type, which indicates the type of grant, such as "R01", "R21", or "K99" (this field is required).

The description, which should provide an in-depth description of the funding opportunity and should include details about every important aspect. This description should be comprehensive (at least 500 words) and cover the purpose, scope, research areas, expected outcomes, and any special considerations of the funding opportunity. Please try to use exerpts from the text where you can. (this field is required).

The deadline, which should be the submission deadline formatted EXACTLY as "Month Day, Year" (e.g., "May 15, 2024") (this field is required). If there are multiple deadlines, please use the one that is closer to today's date, but also after today's date, which is ${formattedDate}.

The num_awards, which is the expected number of awards and should be an integer that is zero or more (this field is required). If the exact number is not specified in the document, use your best estimate based on the document or use 1 as a default.

The award_ceiling, which is the maximum funding amount (numeric, optional).

The award_floor, which is the minimum funding amount (numeric, optional).

The letters_of_intent field should be true if a Letter of Intent (LOI) is required and false if not (default is false).

The preliminary_proposal field should be true if a preliminary proposal is required and false if not (default is false).

The animal_trials field should be true if animal trials are involved and false if not (default is false).

The human_trials field should be true if human trials are involved and false if not (default is false).

The organization_eligibility field should capture eligibility details for organizations and be structured as JSON (this field is required). Make sure that it adheres to boolean for each enum list: Higher Education, Non-Profit, For-Profit, Government, Hospital, Foreign, Individual

The user_eligibility field should capture eligibility details for individual applicants and be structured as JSON (this field is required). Make sure that it adheres to boolean for each enum list: Principal Investigator (PI), Co-Principal Investigator(Co-PI), Co-Investigator (Co-I), Senior Personnel, Postdoctoral Researcher, Graduate Student, Undergraduate Student, Project Administrator, Authorized Organizational Representative (AOR)

The published_date, which is the date the funding opportunity was published, formatted in ISO 8601 format (YYYY-MM-DD) (this field is required).

The submission_requirements field should be a JSON object listing the required documents, formats, and any additional instructions (this field is required).

Return only valid JSON. Do not include extra commentary or formatting.

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
      max_tokens: 4000,
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
    info.grant_type = info.grant_type || '';
    info.description = info.description || '';
    info.deadline = info.deadline || '';
    info.num_awards = info.num_awards || 1;
    info.organization_eligibility = info.organization_eligibility || {};
    info.user_eligibility = info.user_eligibility || {};
    info.published_date = info.published_date || new Date().toISOString().split('T')[0];
    info.submission_requirements = info.submission_requirements || {};
    
    // Ensure grant_url is set
    if (!info.grant_url) {
      console.warn('Missing grant_url field, defaulting to empty string');
      info.grant_url = '';
    }

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