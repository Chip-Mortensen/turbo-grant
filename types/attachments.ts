export interface Attachment {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  description?: string;
  created_at: string;
  project_id: string;
  user_id: string;
}

export interface AttachmentFormData {
  name: string;
  file_url: string;
  file_type: string;
  project_id: string;
  description?: string;
} 