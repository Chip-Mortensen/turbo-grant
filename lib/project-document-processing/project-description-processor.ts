import OpenAI from 'openai';
import { getResearchDescriptionVectors, getScientificFigureVectors, getChalkTalkVectors, getFOAVectors } from './query';

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

const TOTAL_PAGES = 15;
const WORDS_PER_PAGE = 750;
const TOTAL_WORDS = TOTAL_PAGES * WORDS_PER_PAGE;

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

/**
 * Generates a project description outline using the gpt-4o-mini model
 */
export async function generateProjectOutline(projectId: string, foaId: string): Promise<ProjectOutline> {
  try {
    // Fetch all content in parallel
    const [researchDescriptions, scientificFigures, chalkTalks, foaContent] = await Promise.all([
      getResearchDescriptionVectors(projectId),
      getScientificFigureVectors(projectId),
      getChalkTalkVectors(projectId),
      getFOAVectors(foaId)
    ]);

    // Combine all content for context, ensuring we only include valid text
    const context = {
      researchDescriptions: researchDescriptions.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string'),
      scientificFigures: scientificFigures.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string'),
      chalkTalks: chalkTalks.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string'),
      foaContent: foaContent.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string')
    };

    // Create prompt focusing on the content
    const userPrompt = `Analyze the following research content and generate a structured outline for this specific project:

Research Descriptions:
${context.researchDescriptions.join('\n\n')}

Scientific Figures:
${context.scientificFigures.join('\n\n')}

Chalk Talks:
${context.chalkTalks.join('\n\n')}

FOA Content:
${context.foaContent.join('\n\n')}`;

    // Call the model
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
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

export async function generateFullProjectContent(projectId: string, foaId: string): Promise<FullProjectContent> {
  try {
    // First get the outline to determine section sizes
    const outline = await generateProjectOutline(projectId, foaId);
    if (outline.error || outline.items.length === 0) {
      throw new Error(outline.error || 'Failed to generate outline');
    }

    // Get all the content we'll need for context (reuse the same content for all sections)
    const [researchDescriptions, scientificFigures, chalkTalks, foaContent] = await Promise.all([
      getResearchDescriptionVectors(projectId),
      getScientificFigureVectors(projectId),
      getChalkTalkVectors(projectId),
      getFOAVectors(foaId)
    ]);

    const context = {
      researchDescriptions: researchDescriptions.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string'),
      scientificFigures: scientificFigures.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string'),
      chalkTalks: chalkTalks.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string'),
      foaContent: foaContent.matches
        .map(m => m.metadata?.text)
        .filter((text): text is string => typeof text === 'string')
    };

    // Generate content for each section in parallel
    const sectionPromises = outline.items.map(async (item) => {
      const targetWords = Math.round((item.percentage / 100) * TOTAL_WORDS);
      const targetPages = (item.percentage / 100) * TOTAL_PAGES;

      const prompt = SECTION_CONTENT_PROMPT
        .replace('{TARGET_WORDS}', targetWords.toString())
        .replace('{TARGET_PAGES}', targetPages.toFixed(1))
        .replace('{SECTION_HEADING}', item.heading)
        .replace('{SECTION_DESCRIPTION}', item.description);

      const userPrompt = `Using the following research materials, write the ${item.heading} section:

Research Descriptions:
${context.researchDescriptions.join('\n\n')}

Scientific Figures:
${context.scientificFigures.join('\n\n')}

Chalk Talks:
${context.chalkTalks.join('\n\n')}

FOA Content:
${context.foaContent.join('\n\n')}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: userPrompt
          }
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

    return { sections };
  } catch (error) {
    console.error('Error generating full project content:', error);
    return {
      sections: [],
      error: error instanceof Error ? error.message : 'Failed to generate full project content'
    };
  }
} 