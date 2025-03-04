'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type FOA = Database['public']['Tables']['foas']['Row'];

interface SelectFoaDialogProps {
  projectId: string;
  foa: FOA;
}

export function SelectFoaDialog({ projectId, foa }: SelectFoaDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSelect = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // 1. Fetch all documents applicable to this FOA's agency and grant type
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*');
      
      if (docsError) {
        console.error('Error fetching documents:', docsError);
        throw docsError;
      }
      
      // 2. Filter documents by agency and grant type
      let applicableDocuments = documents || [];
      
      if (foa.agency) {
        applicableDocuments = applicableDocuments.filter(doc => 
          !doc.agency || doc.agency === foa.agency
        );
      }
      
      if (foa.grant_type) {
        applicableDocuments = applicableDocuments.filter(doc => 
          !doc.grant_types || 
          doc.grant_types.length === 0 || 
          doc.grant_types.includes(foa.grant_type!)
        );
      }
      
      console.log(`Found ${applicableDocuments.length} applicable documents for FOA:`, 
        { agency: foa.agency, grantType: foa.grant_type });
      
      // 3. Create the initial attachments object with complete document data
      const initialAttachments: Record<string, any> = {};
      
      // Store complete document information along with status
      for (const doc of applicableDocuments) {
        initialAttachments[doc.id] = {
          // Document status information
          completed: false,
          updatedAt: new Date().toISOString(),
          
          // Store complete document information
          document: {
            id: doc.id,
            name: doc.name,
            fields: doc.fields || [],
            sources: doc.sources || [],
            agency: doc.agency,
            grant_types: doc.grant_types || [],
            custom_processor: doc.custom_processor
          }
        };
      }
      
      console.log('Saving attachments data:', initialAttachments);
      
      // 4. Update the project with the FOA and attachments
      const { error } = await supabase
        .from('research_projects')
        .update({ 
          foa: foa.id,
          attachments: initialAttachments
        })
        .eq('id', projectId);

      if (error) throw error;

      // Close dialog and redirect to project home page
      setIsOpen(false);
      router.push(`/dashboard/${projectId}`);
    } catch (err) {
      console.error('Error selecting FOA:', err);
      setError('Failed to select funding opportunity. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Select Opportunity
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Funding Opportunity</DialogTitle>
            <DialogDescription>
              Are you sure you want to select this funding opportunity? This will:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Generate required document templates based on the FOA&apos;s requirements</li>
              <li>Link this project to the FOA for tracking and compliance</li>
              <li>Initialize your documents checklist with all required attachments</li>
              <li>If you change your mind later, you&apos;ll need to create a new project</li>
            </ul>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={isUpdating}
            >
              {isUpdating ? 'Selecting...' : 'Confirm Selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 