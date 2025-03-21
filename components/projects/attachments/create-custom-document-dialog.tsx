'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Document } from '@/types/documents';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';

interface CreateCustomDocumentDialogProps {
  projectId: string;
  onDocumentCreated?: () => void;
}

export function CreateCustomDocumentDialog({ 
  projectId, 
  onDocumentCreated 
}: CreateCustomDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    prompt: '',
    pageLimit: ''
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    prompt: ''
  });
  
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      name: '',
      prompt: ''
    };
    let isValid = true;

    if (!formState.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }

    if (!formState.prompt.trim()) {
      errors.prompt = 'Prompt is required';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 1. Create the custom document
      const response = await fetch('/api/documents/custom-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formState.name,
          prompt: formState.prompt,
          page_limit: formState.pageLimit ? parseInt(formState.pageLimit, 10) : null,
          project_id: projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document');
      }

      const newDocument: Document = await response.json();

      // 2. Update project's attachments to include this document
      const { data: project, error: projectError } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();

      if (projectError) {
        throw new Error(`Failed to fetch project: ${projectError.message}`);
      }

      // Ensure the document object has all required fields
      const updatedAttachments = {
        ...(project.attachments || {}),
        [newDocument.id]: {
          document: newDocument, // Save the entire document object
          completed: false,
          updatedAt: new Date().toISOString(),
        },
      };

      // 3. Save the updated attachments
      const { error: updateError } = await supabase
        .from('research_projects')
        .update({ attachments: updatedAttachments })
        .eq('id', projectId);

      if (updateError) {
        throw new Error(`Failed to update project: ${updateError.message}`);
      }

      // 4. Close the dialog and reset form
      setOpen(false);
      setFormState({
        name: '',
        prompt: '',
        pageLimit: ''
      });
      
      // 5. Refresh or redirect
      if (onDocumentCreated) {
        onDocumentCreated();
      }
      
      // 6. Redirect to the document page
      router.push(`/projects/${projectId}/attachments/${newDocument.id}`);
      
    } catch (err) {
      console.error('Error creating custom document:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        variant="outline"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Create Custom Document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Custom Document</DialogTitle>
            <DialogDescription>
              Create a custom document template for your project
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Document name"
                value={formState.name}
                onChange={handleChange}
              />
              {formErrors.name && (
                <p className="text-sm font-medium text-red-500">
                  {formErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">
                Prompt
              </label>
              <Textarea
                id="prompt"
                name="prompt"
                placeholder="Instructions for generating this document"
                className="min-h-[100px]"
                value={formState.prompt}
                onChange={handleChange}
              />
              {formErrors.prompt && (
                <p className="text-sm font-medium text-red-500">
                  {formErrors.prompt}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="pageLimit" className="text-sm font-medium">
                Page Limit (optional)
              </label>
              <Input
                id="pageLimit"
                name="pageLimit"
                type="number"
                placeholder="Leave empty for no limit"
                value={formState.pageLimit}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 