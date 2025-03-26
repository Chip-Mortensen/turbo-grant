import OpenAI from 'openai';
import { DocumentProcessor } from '../base-processor';
import { GenerationResult, GenerationContext } from '../types';
import { AgencyType } from '@/types/documents';

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

// Agency-specific outline templates
const AGENCY_OUTLINES = {
  NSF: [
    {
      id: 'introduction',
      heading: 'Introduction and Overview',
      description: 'Provide a clear statement of the research problem, its significance, and an overview of the project.',
      percentage: 10,
    },
    {
      id: 'background',
      heading: 'Background and Significance',
      description: 'Review current knowledge, identify gaps, and explain why this research is important.',
      percentage: 15,
    },
    {
      id: 'objectives',
      heading: 'Research Objectives',
      description: 'Clearly state the specific objectives or research questions to be addressed.',
      percentage: 10,
    },
    {
      id: 'research_plan',
      heading: 'Research Plan',
      description: 'Detail the methods, experimental design, analysis approach, and timeline.',
      percentage: 30,
    },
    {
      id: 'intellectual_merit',
      heading: 'Intellectual Merit',
      description: 'Explain how the project advances knowledge and understanding within its field.',
      percentage: 15,
    },
    {
      id: 'broader_impacts',
      heading: 'Broader Impacts',
      description: 'Describe how the project contributes to societal goals, including education, outreach, and diversity.',
      percentage: 10,
    },
    {
      id: 'preliminary',
      heading: 'Preliminary Results',
      description: 'Present any preliminary studies or results that support the feasibility of the approach.',
      percentage: 10,
    }
  ],
  NIH: [
    {
      id: 'specific_aims',
      heading: 'Specific Aims',
      description: 'State concisely the goals of the proposed research and summarize the expected outcomes.',
      percentage: 10,
    },
    {
      id: 'significance',
      heading: 'Significance',
      description: 'Explain the importance of the problem or critical barrier to progress in the field that the proposed project addresses.',
      percentage: 20,
    },
    {
      id: 'innovation',
      heading: 'Innovation',
      description: 'Explain how the application challenges and seeks to shift current research or clinical practice paradigms.',
      percentage: 15,
    },
    {
      id: 'approach',
      heading: 'Approach',
      description: 'Describe the overall strategy, methodology, and analyses to be used to accomplish the specific aims of the project.',
      percentage: 40,
    },
    {
      id: 'preliminary',
      heading: 'Preliminary Studies',
      description: 'Present preliminary studies, data, or experience pertinent to the application.',
      percentage: 15,
    }
  ]
};

// Base system prompt that will be customized based on agency
const BASE_SYSTEM_PROMPT = `You are a research grant writing expert that helps organize {AGENCY_TYPE} project descriptions into clear, compelling narratives.

Your task is to analyze provided research content and generate a structured outline for a formal research project description.
The outline must be organized as an ordered array of items, with each item containing a heading, description, and percentage allocation.

{OUTLINE_REQUIREMENTS}

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

const NSF_OUTLINE_REQUIREMENTS = `The outline must include these items in order:
1. Introduction and Overview
2. Background and Significance
3. Research Objectives
4. Research Plan and Methods
5. Intellectual Merit
6. Broader Impacts
7. Preliminary Results

Focus on both the intellectual merit (advancing knowledge) and broader impacts (societal benefits) as these are the key NSF review criteria.`;

const NIH_OUTLINE_REQUIREMENTS = `The outline must include these items in order:
1. Specific Aims
2. Significance
3. Innovation
4. Approach
5. Preliminary Studies

Focus on scientific rigor, health relevance, and detailed methodology as these are key NIH review criteria.`;

const SECTION_CONTENT_PROMPT = `You are a research grant writing expert. Write a detailed section for a {AGENCY_TYPE} research grant proposal.
Use a formal academic tone and be specific, drawing from the provided research materials.
Your response should be approximately {TARGET_WORDS} words to fill {TARGET_PAGES} pages.
Focus only on the assigned section: {SECTION_HEADING}

Guidelines for this section:
{SECTION_DESCRIPTION}

{AGENCY_SPECIFIC_GUIDANCE}

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

const NSF_SPECIFIC_GUIDANCE = `Remember to address the NSF's two key merit review criteria:
- Intellectual Merit: How the project advances knowledge and understanding within its field
- Broader Impacts: How the project benefits society or advances desired societal outcomes

NSF values both the advancement of scientific knowledge and contributions to achieving societal goals.`;

const NIH_SPECIFIC_GUIDANCE = `Remember to focus on:
- Health relevance and potential impact on human health
- Scientific rigor and detailed methodological approach
- Addressing any potential challenges and alternative strategies
- Highlighting innovation in concepts, approaches, or methods`;

// Define page limits by agency and adjust total words accordingly
const PAGE_LIMITS = {
  NSF: 15,
  NIH: 12
};

const WORDS_PER_PAGE = 500;

export class ProjectDescriptionProcessor extends DocumentProcessor {
  async generateContent({ document, context }: GenerationContext): Promise<GenerationResult> {
    try {
      const agency = document.agency || 'NSF';
      const pageLimit = document.page_limit || PAGE_LIMITS[agency];
      const totalWords = pageLimit * WORDS_PER_PAGE;

      // Generate outline based on agency type
      const outline = await this.generateOutline(context, agency);
      if (outline.error || outline.items.length === 0) {
        throw new Error(outline.error || 'Failed to generate outline');
      }

      // Generate content for each section in parallel
      const sectionPromises = outline.items.map(async (item) => {
        const targetWords = Math.round((item.percentage / 100) * totalWords);
        const targetPages = (item.percentage / 100) * pageLimit;

        const agencySpecificGuidance = agency === 'NIH' ? NIH_SPECIFIC_GUIDANCE : NSF_SPECIFIC_GUIDANCE;

        const prompt = SECTION_CONTENT_PROMPT
          .replace('{AGENCY_TYPE}', agency)
          .replace('{TARGET_WORDS}', targetWords.toString())
          .replace('{TARGET_PAGES}', targetPages.toFixed(1))
          .replace('{SECTION_HEADING}', item.heading)
          .replace('{SECTION_DESCRIPTION}', item.description)
          .replace('{AGENCY_SPECIFIC_GUIDANCE}', agencySpecificGuidance);

        const userPrompt = this.constructSectionPrompt(context, item.heading, agency);

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
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

  private async generateOutline(context: GenerationContext['context'], agency: AgencyType): Promise<ProjectOutline> {
    try {
      // Use predefined template if AI-generated outline is not needed
      if (process.env.USE_TEMPLATE_OUTLINES === 'true') {
        return {
          items: AGENCY_OUTLINES[agency] || AGENCY_OUTLINES.NSF
        };
      }

      // Otherwise, generate a customized outline using AI
      const outlineRequirements = agency === 'NIH' ? NIH_OUTLINE_REQUIREMENTS : NSF_OUTLINE_REQUIREMENTS;
      
      const systemPrompt = BASE_SYSTEM_PROMPT
        .replace('{AGENCY_TYPE}', agency)
        .replace('{OUTLINE_REQUIREMENTS}', outlineRequirements);

      const userPrompt = this.constructOutlinePrompt(context, agency);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
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

  private constructOutlinePrompt(
    context: GenerationContext['context'],
    agency: AgencyType
  ): string {
    const sections = [
      context.researchDescriptions ? `Research Descriptions: ${context.researchDescriptions}` : '',
      context.scientificFigures ? `Scientific Figures: ${context.scientificFigures}` : '',
      context.chalkTalks ? `Chalk Talks: ${context.chalkTalks}` : '',
      context.foaContent ? `FOA Content: ${context.foaContent}` : ''
    ];

    console.log(
      `Construct Outline Prompt for ${agency}:
      
      Research Descriptions: ${context.researchDescriptions?.substring(0, 10)}
      Scientific Figures: ${context.scientificFigures?.substring(0, 10)}
      Chalk Talks: ${context.chalkTalks?.substring(0, 10)}
      FOA Content: ${context.foaContent?.substring(0, 10)}`)

    return `Analyze the following research content and generate a structured outline for this specific ${agency} project:\n\n${
      sections.filter(Boolean).join('\n\n')
    }`;
  }

  private constructSectionPrompt(
    context: GenerationContext['context'],
    sectionHeading: string,
    agency: AgencyType
  ): string {
    const sections = [
      context.researchDescriptions ? `Research Descriptions: ${context.researchDescriptions}` : '',
      context.scientificFigures ? `Scientific Figures: ${context.scientificFigures}` : '',
      context.chalkTalks ? `Chalk Talks: ${context.chalkTalks}` : '',
      context.foaContent ? `FOA Content: ${context.foaContent}` : ''
    ];

    console.log(
      `Construct Section Prompt for ${agency} - ${sectionHeading}:
      
      Research Descriptions: ${context.researchDescriptions?.substring(0, 10)}
      Scientific Figures: ${context.scientificFigures?.substring(0, 10)}
      Chalk Talks: ${context.chalkTalks?.substring(0, 10)}
      FOA Content: ${context.foaContent?.substring(0, 10)}`)

    return `Using the following research materials, write the ${sectionHeading} section for a ${agency} grant proposal:\n\n${
      sections.filter(Boolean).join('\n\n')
    }`;
  }
} 