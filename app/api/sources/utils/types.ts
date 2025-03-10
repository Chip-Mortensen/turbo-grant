export interface GeneratedQuestion {
  id: string;
  question: string;
  context: string;
}

export interface SourceResult {
  url: string;
  title: string;
  publisher: string;
  relevance: string;
  excerpt: string;
}

export interface FormattedSource {
  url: string;
  reason: string;
  description: string;
  citation: string;
}

export interface ChalkTalkSourcesResponse {
  sources: FormattedSource[];
  questions: GeneratedQuestion[];
  rawResults: string[];
}

export interface ChalkTalkSourcesError {
  error: string;
  step?: string;
  details?: unknown;
} 