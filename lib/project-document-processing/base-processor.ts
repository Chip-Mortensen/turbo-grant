import { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '@/types/documents';
import { DocumentContext, GenerationResult, ProcessorConfig, GenerationContext } from './types';
import { 
  getResearchDescriptionText, 
  getScientificFigureText, 
  getChalkTalkText,
  getFOAText 
} from './query';
import { MatchResult } from '@/lib/vectorization/types';

export abstract class DocumentProcessor {
  protected projectId: string;
  protected supabase: SupabaseClient;
  protected foaId?: string;

  constructor({ projectId, supabase, foaId }: ProcessorConfig) {
    this.projectId = projectId;
    this.supabase = supabase;
    this.foaId = foaId;
  }

  /**
   * Gathers all relevant context for document generation from various sources
   */
  public async gatherContext(): Promise<DocumentContext> {
    // Fetch all text content directly using the text functions
    const [researchDescriptionText, scientificFigureText, chalkTalkText] = 
      await Promise.all([
        getResearchDescriptionText(this.projectId),
        getScientificFigureText(this.projectId),
        getChalkTalkText(this.projectId)
      ]);

    // Create context object with text content
    const context: DocumentContext = {
      researchDescriptions: researchDescriptionText,
      scientificFigures: scientificFigureText ,
      chalkTalks: chalkTalkText 
    };

    // Add foaContent if foaId is provided
    if (this.foaId) {
      try {
        const foaText = await getFOAText(this.foaId);
        context.foaContent = foaText;
      } catch (error) {
        console.error('Error fetching FOA content:', error);
        // Don't add foaContent if there was an error
      }
    }

    return context;
  }

  /**
   * Main method to generate document content. Must be implemented by specific processors.
   */
  abstract generateContent(context: GenerationContext): Promise<GenerationResult>;

  /**
   * Helper to format content as HTML with consistent styling
   */
  protected formatToHTML(content: string): string {
    // Replace line breaks with <br/> tags and wrap content in paragraphs
    return content
      .split('\n')
      .filter(line => line.trim() !== '') // Remove empty lines
      .map(line => `<p>${line}</p>`)
      .join('\n');
  }

  /**
   * Main entry point for document generation
   */
  async process(document: Document): Promise<GenerationResult> {
    try {
      // Gather context
      const context = await this.gatherContext();

      // Generate content using processor-specific implementation
      return await this.generateContent({
        document,
        context
      });
    } catch (error) {
      console.error('Error in document processor:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to process document'
      };
    }
  }
} 