import OpenAI from 'openai';
import { DocumentProcessor } from '../base-processor';
import { GenerationResult, GenerationContext } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OutlineItem {
  heading: string;
  description: string;
  percentage: number;
}

interface ProjectOutline {
  items: OutlineItem[];
  error?: string;
}

interface SectionContent {
  heading: string;
  content: string;
  targetWordCount: number;
}

interface FullProjectContent {
  sections: SectionContent[];
  error?: string;
}

const SYSTEM_PROMPT = `You are a research grant writing expert that helps organize project descriptions into clear, compelling narratives.

Your task is to analyze provided research content and generate a structured outline for a formal research project description.
The outline must be organized as an ordered array of items, with each item containing a heading, description, and percentage allocation.

The outline must include these items in order:
1. Project Summary/Abstract
2. Background and Significance
3. Specific Aims/Objectives
4. Research Strategy/Approach
5. Innovation and Impact
6. Preliminary Results
7. Timeline and Milestones

For each item:
- Provide a contextually appropriate heading that reflects the specific project
- Write a clear description of what content should be included, based solely on the available materials
- Estimate what percentage of the final report this section should comprise (all percentages must sum to 100)
- Focus on creating a cohesive research narrative
- Be specific and definitive - do not use conditional language
- Reference specific details from the provided content

Your response must be a JSON object with an "items" array where each item has:
- "heading": string
- "description": string
- "percentage": number (representing the recommended percentage of the final report)

The items must be returned in the specified order to maintain the logical flow of the research narrative.
Ensure the percentage estimates sum to exactly 100.`;

const SECTION_CONTENT_PROMPT = `You are a research grant writing expert. Write a detailed section for a research grant proposal.
Use a formal academic tone and be specific, drawing from the provided research materials.
Your response should be approximately {TARGET_WORDS} words to fill {TARGET_PAGES} pages.
Focus only on the assigned section: {SECTION_HEADING}

Guidelines for this section:
{SECTION_DESCRIPTION}

IMPORTANT FORMATTING REQUIREMENTS:
- Use plain text only
- Use regular paragraph breaks with single newlines
- Write in continuous prose with clear paragraph transitions
- Citations or references should be written in plain text (e.g., "Smith et al., 2023")
- DO NOT include any special characters or formatting
- DO NOT include any headers or subheaders
- DO NOT include bullet points or numbered lists
- DO NOT include any markdown formatting

Format your response as a JSON object with a single "content" field containing the plain text content.
The content should use only newline characters to separate paragraphs.
Do not include the section heading - just the content text.`;

const TOTAL_PAGES = 15;
const WORDS_PER_PAGE = 750;
const TOTAL_WORDS = TOTAL_PAGES * WORDS_PER_PAGE;

export class ProjectDescriptionProcessor extends DocumentProcessor {
  async generateContent({ document, context }: GenerationContext): Promise<GenerationResult> {
    try {
      // Generate outline first
      const outline = await this.generateOutline(context);
      if (outline.error || outline.items.length === 0) {
        throw new Error(outline.error || 'Failed to generate outline');
      }

      // Generate content for each section in parallel
      const sectionPromises = outline.items.map(async (item) => {
        const targetWords = Math.round((item.percentage / 100) * TOTAL_WORDS);
        const targetPages = (item.percentage / 100) * TOTAL_PAGES;

        const prompt = SECTION_CONTENT_PROMPT
          .replace('{TARGET_WORDS}', targetWords.toString())
          .replace('{TARGET_PAGES}', targetPages.toFixed(1))
          .replace('{SECTION_HEADING}', item.heading)
          .replace('{SECTION_DESCRIPTION}', item.description);

        const userPrompt = this.constructSectionPrompt(context, item.heading);

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        });

        const response = JSON.parse(completion.choices[0].message.content || '{}');
        
        return {
          heading: item.heading,
          content: response.content || '',
          targetWordCount: targetWords
        };
      });

      const sections = await Promise.all(sectionPromises);

      // Convert sections to HTML
      const htmlContent = sections.map(section => {
        const formattedContent = this.formatToHTML(section.content);
        return `<h1>${section.heading}</h1>\n${formattedContent}\n`;
      }).join('\n');

      return { content: htmlContent };
    } catch (error) {
      console.error('Error generating project description:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to generate project description'
      };
    }
  }

  private async generateOutline(context: GenerationContext['context']): Promise<ProjectOutline> {
    try {
      const userPrompt = this.constructOutlinePrompt(context);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        items: response.items || []
      };
    } catch (error) {
      console.error('Error generating project outline:', error);
      return {
        items: [],
        error: error instanceof Error ? error.message : 'Failed to generate project outline'
      };
    }
  }

  private constructOutlinePrompt(context: GenerationContext['context']): string {
    const sections = [
      context.researchDescriptions.length > 0 ? `Research Descriptions: ${context.researchDescriptions}` : '',
      context.scientificFigures.length > 0 ? `Scientific Figures: ${context.scientificFigures}` : '',
      context.chalkTalks.length > 0 ? `Chalk Talks: ${context.chalkTalks}` : '',
      context.foaContent ? `FOA Content: ${context.foaContent}` : ''
    ];

    console.log(
      `Construct Outline Prompt:
      
      Research Descriptions: ${context.researchDescriptions.substring(0, 10)}
      Scientific Figures: ${context.scientificFigures.substring(0, 10)}
      Chalk Talks: ${context.chalkTalks.substring(0, 10)}
      FOA Content: ${context.foaContent?.substring(0, 10)}`)

    return `Analyze the following research content and generate a structured outline for this specific project:\n\n${
      sections.filter(Boolean).join('\n\n')
    }`;
  }

  private constructSectionPrompt(
    context: GenerationContext['context'],
    sectionHeading: string
  ): string {
    const sections = [
      context.researchDescriptions.length > 0 ? `Research Descriptions: ${context.researchDescriptions}` : '',
      context.scientificFigures.length > 0 ? `Scientific Figures: ${context.scientificFigures}` : '',
      context.chalkTalks.length > 0 ? `Chalk Talks: ${context.chalkTalks}` : '',
      context.foaContent ? `FOA Content: ${context.foaContent}` : ''
    ];

    console.log(
      `Construct Section Prompt:
      
      Research Descriptions: ${context.researchDescriptions.substring(0, 10)}
      Scientific Figures: ${context.scientificFigures.substring(0, 10)}
      Chalk Talks: ${context.chalkTalks.substring(0, 10)}
      FOA Content: ${context.foaContent?.substring(0, 10)}`)

    return `Using the following research materials, write the ${sectionHeading} section:\n\n${
      sections.filter(Boolean).join('\n\n')
    }`;
  }
} 