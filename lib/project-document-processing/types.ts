import { MatchResult } from '@/lib/vectorization/types';
import { Document, DocumentField } from '@/types/documents';
import { SupabaseClient } from '@supabase/supabase-js';

export interface DocumentContext {
  researchDescriptions: MatchResult[];
  scientificFigures: MatchResult[];
  chalkTalks: MatchResult[];
  foaContent?: MatchResult[];
}

export interface GenerationResult {
  content: string;
  error?: string;
}

export interface ProcessorConfig {
  projectId: string;
  supabase: SupabaseClient;
}

export interface GenerationContext {
  document: Document;
  answers?: DocumentField[];
  context: DocumentContext;
} 