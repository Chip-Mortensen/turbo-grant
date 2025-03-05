export interface MatchResult {
  id: string;
  score: number;
  metadata?: {
    text?: string;
    type?: string;
    [key: string]: any;
  };
} 