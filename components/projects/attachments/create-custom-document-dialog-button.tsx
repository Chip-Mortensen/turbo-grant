'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateCustomDocumentDialog } from './create-custom-document-dialog';

interface CreateCustomDocumentDialogButtonProps {
  projectId: string;
  onDocumentCreated?: () => void;
}

export function CreateCustomDocumentDialogButton({ 
  projectId, 
  onDocumentCreated 
}: CreateCustomDocumentDialogButtonProps) {
  return (
    <CreateCustomDocumentDialog 
      projectId={projectId}
      onDocumentCreated={onDocumentCreated}
    />
  );
} 