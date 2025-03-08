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

interface SubmissionRequirements {
  formats?: string[];
  required_documents?: string[];
  additional_instructions?: string;
}

interface SelectFoaDialogProps {
  projectId: string;
  foa: FOA & {
    submission_requirements?: SubmissionRequirements;
  };
}

export function SelectFoaDialog({ projectId, foa }: SelectFoaDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
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

      // 3. Split documents into required and optional
      const requiredDocs = applicableDocuments.filter(doc => !doc.optional);
      const optionalDocs = applicableDocuments.filter(doc => doc.optional);

      // 4. Get submission requirements from FOA
      const submissionRequirements = foa.submission_requirements?.required_documents || [];
      
      // 5. Match optional documents against required documents from FOA
      const response = await fetch('/api/documents/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optionalDocuments: optionalDocs.map(doc => ({
            id: doc.id,
            name: doc.name
          })),
          requiredDocuments: submissionRequirements
        })
      });

      if (!response.ok) {
        throw new Error('Failed to match documents');
      }

      const { matchedDocumentIds } = await response.json();
      
      console.log('Matched optional documents:', matchedDocumentIds);

      // 6. Create the initial attachments object
      const initialAttachments: Record<string, any> = {};
      
      // Add required documents
      for (const doc of requiredDocs) {
        initialAttachments[doc.id] = {
          completed: false,
          updatedAt: new Date().toISOString(),
          document: {
            id: doc.id,
            name: doc.name,
            fields: doc.fields || [],
            sources: doc.sources || [],
            agency: doc.agency,
            grant_types: doc.grant_types || [],
            custom_processor: doc.custom_processor,
            optional: doc.optional,
            upload_required: doc.upload_required
          }
        };
      }

      // Add matched optional documents
      for (const docId of matchedDocumentIds) {
        const doc = optionalDocs.find(d => d.id === docId);
        if (doc) {
          initialAttachments[doc.id] = {
            completed: false,
            updatedAt: new Date().toISOString(),
            document: {
              id: doc.id,
              name: doc.name,
              fields: doc.fields || [],
              sources: doc.sources || [],
              agency: doc.agency,
              grant_types: doc.grant_types || [],
              custom_processor: doc.custom_processor,
              optional: doc.optional,
              upload_required: doc.upload_required
            }
          };
        }
      }
      
      console.log('Saving attachments data:', initialAttachments);
      
      // 7. Update the project with the FOA and attachments
      const { error } = await supabase
        .from('research_projects')
        .update({ 
          foa: foa.id,
          attachments: initialAttachments
        })
        .eq('id', projectId);

      if (error) throw error;

      // 8. Trigger automatic equipment analysis in the background
      try {
        console.log('Triggering automatic equipment analysis...');
        setAnalysisStatus('Initializing equipment analysis...');
        
        // We'll still use a non-blocking approach but with better handling
        fetch('/api/analyze-equipment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId }),
        }).then(async response => {
          if (response.ok) {
            const result = await response.json();
            console.log('Equipment analysis response:', result);
            
            if (result.status === 'success') {
              setAnalysisStatus(`Equipment analysis successful. Generated ${result.count} recommendations.`);
              console.log(`Equipment analysis successful. Generated ${result.count} recommendations.`);
            } else if (result.status === 'existing') {
              setAnalysisStatus('Equipment recommendations already exist for this project.');
              console.log('Equipment recommendations already exist for this project.');
            } else if (result.status === 'warning') {
              setAnalysisStatus(`Equipment analysis completed with warnings: ${result.message}`);
              console.warn('Equipment analysis completed with warnings:', result.message);
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            setAnalysisStatus(`Equipment analysis failed: ${errorData.error || response.statusText}`);
            console.error('Failed to trigger equipment analysis:', errorData.error || response.statusText);
          }
        }).catch(err => {
          setAnalysisStatus(`Error: ${err.message || 'Unknown error during equipment analysis'}`);
          console.error('Error communicating with equipment analysis API:', err);
        });
      } catch (analysisErr) {
        // Log the error but don't fail the entire operation
        setAnalysisStatus(`Setup error: ${(analysisErr as Error).message}`);
        console.error('Error setting up equipment analysis:', analysisErr);
      }

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
              <li>Automatically analyze the equipment catalog to recommend relevant equipment for your project</li>
              <li>If you change your mind later, you&apos;ll need to create a new project</li>
            </ul>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {analysisStatus && (
              <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
                <div className="flex items-center">
                  <div className="animate-pulse mr-2">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <AlertDescription>{analysisStatus}</AlertDescription>
                </div>
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