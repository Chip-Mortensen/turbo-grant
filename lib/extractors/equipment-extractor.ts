import OpenAI from 'openai';

export interface Equipment {
  name: string;
  specifications?: string;
  relevance_score: number;
  relevance_details?: string;
}

/**
 * Extracts and analyzes equipment recommendations based on funding opportunity information
 * and equipment catalog data
 */
export class EquipmentExtractor {
  private openai: OpenAI;
  
  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyzes equipment catalog against FOA text to find relevant equipment
   * @param equipmentCatalogText The equipment catalog text to analyze
   * @param foaText The funding opportunity text to analyze against
   * @returns A Promise resolving to an array of relevant equipment
   */
  async analyzeEquipment(equipmentCatalogText: string, foaText: string): Promise<Equipment[]> {
    try {
      const prompt = `
        You are an expert scientific consultant who specializes in matching research equipment to funding opportunity requirements.
        
        I have two pieces of information:
        
        1. Text extracted from a webpage about scientific equipment:
        ${equipmentCatalogText}
        
        2. The text of a Funding Opportunity Announcement (FOA) that my research project is targeting:
        ${foaText}
        
        Create a structured JSON array of up to 10 of the most relevant pieces of equipment in the text.
        The JSON should be in the following format:
        {
          "equipment": [
            {
              "name": "Full equipment name",
              "specifications": "Brief summary of key specifications",
              "relevance_score": 7-10 score of relevance to FOA (if it's less relevant that 7, don't include it),
              "relevance_details": "Brief explanation of how this equipment relates to FOA requirements"
            }
          ]
        }
        
        For each piece of equipment, analyze its relevance to the FOA:
        - How specifically does this equipment address research needs mentioned in the text?
        - Which aspects of the requirements would this equipment help fulfill?
        - Rate each piece of equipment's relevance to the FOA from 1-10
        
        Only include equipment that is actually mentioned in the texts - do not invent details.
        Return ONLY the JSON with no additional text.
        
        Please do not mention the FOA in your response.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      try {
        const parsedContent = JSON.parse(content);
        if (!Array.isArray(parsedContent.equipment)) {
          throw new Error('Invalid response format');
        }
        return this.validateEquipment(parsedContent.equipment);
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        throw new Error('Failed to parse equipment recommendations');
      }
    } catch (error) {
      console.error('Error analyzing equipment:', error);
      throw new Error('Failed to analyze equipment');
    }
  }

  /**
   * Validates the extracted equipment information
   * @param equipment The equipment array to validate
   * @returns The validated equipment array
   */
  private validateEquipment(equipment: any[]): Equipment[] {
    return equipment.map(item => ({
      name: item.name || 'Unknown Equipment',
      specifications: item.specifications,
      relevance_score: typeof item.relevance_score === 'number' ? 
        Math.max(0, Math.min(10, item.relevance_score)) / 10 : 0.5, // Convert 1-10 score to 0-1
      relevance_details: item.relevance_details || 'No details provided'
    }));
  }
} 