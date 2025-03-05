import OpenAI from 'openai';
import { DocumentProcessor } from '../base-processor';
import { GenerationResult, GenerationContext } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WORDS_PER_PAGE = 750;

const GENERAL_SYSTEM_PROMPT = `You are an expert grant writer that helps create compelling research grant documents.
Your task is to generate document content based on the provided prompt, project context, and user answers.

Use the following guidelines:
1. Follow the document prompt's specific instructions carefully
2. Incorporate relevant details from the project context
3. Use the answers provided by the user to customize the content
4. Write in a formal academic tone
5. Be specific and detailed
6. Use proper paragraph structure and transitions
7. Target approximately {TARGET_WORDS} words to fill {TARGET_PAGES} pages

Format Requirements:
- Use plain text with regular paragraph breaks
- Write in continuous prose
- Citations should be in plain text (e.g., "Smith et al., 2023")
- DO NOT use special characters or formatting
- DO NOT include headers or subheaders
- DO NOT use bullet points or numbered lists
- DO NOT include any markdown`;

export class GeneralDocumentProcessor extends DocumentProcessor {
  async generateContent(
    { document, answers, context }: GenerationContext
  ): Promise<GenerationResult> {
    try {
      // Calculate target words based on page limit
      const targetPages = document.page_limit || 1; // Default to 5 pages if no limit specified
      const targetWords = Math.round(targetPages * WORDS_PER_PAGE);

      // Construct the system prompt with the target words/pages
      const systemPrompt = GENERAL_SYSTEM_PROMPT
        .replace('{TARGET_WORDS}', targetWords.toString())
        .replace('{TARGET_PAGES}', targetPages.toString());

      // Construct the user prompt
      const userPrompt = this.constructPrompt(document.prompt || '', answers, context);

      // Generate content
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const content = this.formatToHTML(completion.choices[0].message.content || '');
      return { content };
    } catch (error) {
      console.error('Error generating document:', error);
      return { 
        content: '',
        error: error instanceof Error ? error.message : 'Failed to generate document'
      };
    }
  }

  private constructPrompt(
    templatePrompt: string,
    answers?: { label: string; answer: string }[],
    context?: { 
      researchDescriptions: { metadata?: { text?: string } }[],
      scientificFigures: { metadata?: { text?: string } }[],
      chalkTalks: { metadata?: { text?: string } }[]
    }
  ): string {
    const sections = [
      // Template prompt
      templatePrompt,

      // User answers section
      answers && answers.length > 0 ? `
User Provided Information:
${answers.map(a => `${a.label}: ${a.answer}`).join('\n')}
` : '',

      // Research context section
      context?.researchDescriptions.length ? `
Research Description Context:
${context.researchDescriptions
  .map(d => d.metadata?.text)
  .filter((text): text is string => typeof text === 'string')
  .join('\n\n')}
` : '',

      // Scientific figures context
      context?.scientificFigures.length ? `
Scientific Figures Context:
${context.scientificFigures
  .map(f => f.metadata?.text)
  .filter((text): text is string => typeof text === 'string')
  .join('\n\n')}
` : '',

      // Chalk talks context
      context?.chalkTalks.length ? `
Chalk Talks Context:
${context.chalkTalks
  .map(t => t.metadata?.text)
  .filter((text): text is string => typeof text === 'string')
  .join('\n\n')}
` : ''
    ];

    return sections.filter(Boolean).join('\n\n');
  }
} 