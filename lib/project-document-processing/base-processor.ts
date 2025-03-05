import { SupabaseClient } from '@supabase/supabase-js';
import { Document, DocumentField } from '@/types/documents';
import { DocumentContext, GenerationResult, ProcessorConfig, GenerationContext } from './types';
import { getResearchDescriptionVectors, getScientificFigureVectors, getChalkTalkVectors } from './query';
import { MatchResult } from '@/lib/vectorization/types';

export abstract class DocumentProcessor {
  protected projectId: string;
  protected supabase: SupabaseClient;

  constructor({ projectId, supabase }: ProcessorConfig) {
    this.projectId = projectId;
    this.supabase = supabase;
  }

  /**
   * Gathers all relevant context for document generation from various sources
   */
  public async gatherContext(): Promise<DocumentContext> {
    const [researchDescriptions, scientificFigures, chalkTalks] = 
      await Promise.all([
        getResearchDescriptionVectors(this.projectId),
        getScientificFigureVectors(this.projectId),
        getChalkTalkVectors(this.projectId)
      ]);

    // Transform Pinecone results to MatchResult type
    const transformMatches = (matches: any[]): MatchResult[] => {
      return matches.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata
      }));
    };

    return {
      researchDescriptions: transformMatches(researchDescriptions.matches),
      scientificFigures: transformMatches(scientificFigures.matches),
      chalkTalks: transformMatches(chalkTalks.matches)
    };
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
  async process(document: Document, answers?: DocumentField[]): Promise<GenerationResult> {
    try {
      // Gather context
      const context = await this.gatherContext();

      // Generate content using processor-specific implementation
      return await this.generateContent({
        document,
        answers,
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