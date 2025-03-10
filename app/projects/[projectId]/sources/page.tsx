import { BackButton } from "@/components/ui/back-button";
import type { Metadata } from "next";
import SourceList from "@/components/projects/sources/source-list";

interface PageProps {
  params: Promise<{ projectId: string }>
}

export const metadata: Metadata = {
  title: "Sources | Turbo Grant",
  description: "Manage your project sources",
};

export default async function SourcesPage({ params }: PageProps) {
  const { projectId } = await params;
  
  return (
    <div className="container py-6 space-y-6">
      <BackButton href={`/projects/${projectId}`} />
      
      <SourceList projectId={projectId} />
    </div>
  );
} 