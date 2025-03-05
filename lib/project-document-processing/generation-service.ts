import { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '@/types/documents';
import { GeneralDocumentProcessor } from './processors/general-document-processor';
import { ProjectDescriptionProcessor } from './processors/project-description-processor';
import { GenerationResult } from './types';
import { getFOAVectors } from './query';
import { MatchResult } from '@/lib/vectorization/types';

// Helper function to transform Pinecone results to MatchResult type
const transformMatches = (matches: any[]): MatchResult[] => {
  return matches.map(match => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata
  }));
};

/**
 * Centralized service for generating document content.
 * Handles both custom processors and general documents.
 */
export async function generateDocumentContent(
  supabase: SupabaseClient,
  documentId: string,
  projectId: string
): Promise<GenerationResult> {
  try {
    // Fetch document and project data in parallel
    const [{ data: document, error: docError }, { data: project, error: projError }] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single(),
      supabase
        .from('research_projects')
        .select('*')
        .eq('id', projectId)
        .single()
    ]);

    if (docError) throw new Error(`Failed to fetch document: ${docError.message}`);
    if (projError) throw new Error(`Failed to fetch project: ${projError.message}`);
    if (!document) throw new Error('Document not found');
    if (!project) throw new Error('Project not found');

    // Create appropriate processor based on document type
    const processor = document.custom_processor === 'project-description'
      ? new ProjectDescriptionProcessor({ projectId, supabase })
      : new GeneralDocumentProcessor({ projectId, supabase });

    // Get answers from attachments if they exist
    const { data: answers } = await supabase
      .from('document_fields')
      .select('*')
      .eq('document_id', documentId);

    // Process document with initial context
    const result = await processor.process(document, answers || []);

    // If this is a project description and we have a FOA, add that context and reprocess
    if (document.custom_processor === 'project-description' && project.foa) {
      const foaContent = await getFOAVectors(project.foa);
      const context = await processor.gatherContext();
      context.foaContent = transformMatches(foaContent.matches);
      
      // Reprocess with FOA context
      return await processor.process(document, answers || []);
    }

    return result;
  } catch (error) {
    console.error('Error in document generation:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to generate document content'
    };
  }
} 