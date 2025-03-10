import { createClient } from "@/utils/supabase/server"
import { notFound } from 'next/navigation';
import { EditSourceForm } from '@/components/projects/sources/edit-source-form';
import { BackButton } from "@/components/ui/back-button";

interface Source {
  id: string;
  url: string;
  reason: string | null;
  description: string | null;
  citation: string | null;
}

interface PageProps {
  params: Promise<{
    projectId: string;
    sourceId: string;
  }>;
}

export default async function EditSourcePage({ 
  params 
}: PageProps) {
  const { projectId, sourceId } = await params;
  const supabase = await createClient();

  const { data: source, error } = await supabase
    .from('project_sources')
    .select('*')
    .eq('id', sourceId)
    .single();

  if (error || !source) {
    notFound();
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <BackButton 
          href={`/projects/${projectId}/sources`}
          label="Back to Sources"
        />
      </div>
      <h1 className="text-2xl font-semibold mb-6">Edit Source</h1>
      <EditSourceForm projectId={projectId} source={source} />
    </div>
  );
} 