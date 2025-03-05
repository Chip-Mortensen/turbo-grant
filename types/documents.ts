export type DocumentFieldType = 'text' | 'textarea' | 'select';
export type DocumentSourceType = 'research_description' | 'scientific_figure' | 'chalk_talk' | 'foa';
export type AgencyType = 'NIH' | 'NSF';

export interface DocumentField {
  type: DocumentFieldType;
  label: string;
  answer: string;
}

export interface Document {
  id: string;
  name: string;
  fields: DocumentField[];
  sources: DocumentSourceType[];
  agency: AgencyType;
  grant_types: string[];
  custom_processor?: string;
  prompt?: string;
  created_at: string;
  updated_at: string;
} 