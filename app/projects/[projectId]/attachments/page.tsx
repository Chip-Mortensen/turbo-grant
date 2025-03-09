import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachmentsManager } from '@/components/attachments/attachments-manager';

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
    return redirect('/dashboard');
  }
  
  // No need to check for FOA here since we control visibility via the card in project-cards.tsx
  
  return (
    <div className="container py-6 space-y-4">
      <Link href={`/dashboard/${projectId}`} passHref>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
      </Link>
      
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Project Attachments</h1>
        <p className="text-sm text-muted-foreground">
          Manage documents needed for your proposal to {project.foa?.title || 'the selected funding opportunity'}
        </p>
      </div>
      
      <AttachmentsManager projectId={projectId} />
    </div>
  );
} 