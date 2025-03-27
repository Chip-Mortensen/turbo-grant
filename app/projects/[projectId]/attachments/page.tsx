import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { AttachmentsManager } from '@/components/projects/attachments/attachments-manager';
import { BackButton } from "@/components/ui/back-button"
import { CreateCustomDocumentDialogButton } from '@/components/projects/attachments/create-custom-document-dialog-button';
import { ReconcileAttachments } from '@/components/projects/attachments/reconcile-attachments';

export const metadata: Metadata = {
  title: 'Project Attachments | Turbo Grant',
  description: 'Manage documents for your proposal'
};

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function AttachmentsPage({ params }: PageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/sign-in');
  }

  // Verify the project exists and user has access
  const { data: project } = await supabase
    .from('research_projects')
    .select('*, foa')
    .eq('id', projectId)
    .single();

  if (!project) {
    return redirect('/projects');
  }
  
  return (
    <div className="container py-6 space-y-4">
      <BackButton href={`/projects/${projectId}`} />
      
      {/* Client component that runs the reconciliation logic */}
      <ReconcileAttachments projectId={projectId} />
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Project Attachments</h1>
          <p className="text-sm text-muted-foreground">
            Manage documents needed for your proposal to {project.foa?.title || 'the selected funding opportunity'}
          </p>
        </div>
        <CreateCustomDocumentDialogButton projectId={projectId} />
      </div>
      
      <AttachmentsManager projectId={projectId} hideCreateButton={true} />
    </div>
  );
} 