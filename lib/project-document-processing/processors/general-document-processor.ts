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
- Structure your response with HTML tags
- ALWAYS begin your response with the document title as a heading: <h1>{DOCUMENT_TITLE}</h1>
- Use <h1> tags for additional main headings (e.g., <h1>Introduction</h1>)
- Use <p> tags for paragraphs (e.g., <p>This is a paragraph.</p>)
- Each paragraph or heading should be on its own line
- Citations should be included within paragraph tags (e.g., <p>As shown by Smith et al. (2023)...</p>)
- DO NOT use any other HTML tags besides <h1> and <p>
- DO NOT use markdown formatting`;

export class GeneralDocumentProcessor extends DocumentProcessor {
  async generateContent(
    { document, answers, context }: GenerationContext
  ): Promise<GenerationResult> {
    try {
      // Calculate target words based on page limit
      const targetPages = document.page_limit || 1; // Default to 1 page if no limit specified
      const targetWords = Math.round(targetPages * WORDS_PER_PAGE);

      // Construct the system prompt with the target words/pages and document title
      const systemPrompt = GENERAL_SYSTEM_PROMPT
        .replace('{TARGET_WORDS}', targetWords.toString())
        .replace('{TARGET_PAGES}', targetPages.toString())
        .replace('{DOCUMENT_TITLE}', document.name || 'Document');

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

      const content = completion.choices[0].message.content || '';
      
      // Check if the content has HTML tags, if not, format it
      const hasHtmlTags = /<\/?[hp]1?>/i.test(content);
      return { 
        content: hasHtmlTags ? content : this.formatToHTML(content) 
      };
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
      researchDescriptions: string,
      scientificFigures: string,
      chalkTalks: string,
      foaContent?: string
    }
  ): string {
    const sections = [
      // Template prompt
      templatePrompt,

      // User answers section
      answers && answers.length > 0 ? `User Provided Information: ${answers.map(a => `${a.label}: ${a.answer}`).join('\n')}` : '',
      context?.researchDescriptions.length ? `Research Description Context: ${context.researchDescriptions}` : '',
      context?.scientificFigures ? `Scientific Figures Context: ${context.scientificFigures}` : '',
      context?.chalkTalks ? `Chalk Talks Context: ${context.chalkTalks}` : '',
      context?.foaContent ? `FOA Context: ${context.foaContent}` : ''
    
    ];

    return sections.filter(Boolean).join('\n\n');
  }
} 