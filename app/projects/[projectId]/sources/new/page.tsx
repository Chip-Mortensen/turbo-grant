import { NewSourceForm } from '@/components/projects/sources/new-source-form';
import { BackButton } from "@/components/ui/back-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Source | Turbo Grant",
  description: "Add a new source to your project",
};

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewSourcePage({ 
  params 
}: PageProps) {
  const { projectId } = await params;
  
  return (
    <div className="py-6">
      <div className="mb-6">
        <BackButton 
          href={`/projects/${projectId}/sources`}
          label="Back to Sources"
        />
      </div>
      <h1 className="text-2xl font-semibold mb-6">Add New Source</h1>
      <NewSourceForm projectId={projectId} />
    </div>
  );
} 