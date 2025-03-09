import { Metadata } from 'next';
import { FundingOpportunitiesSearch } from '@/components/projects/funding-opportunities/search';
import { BackButton } from "@/components/navigation/back-button"
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Funding Opportunities | Turbo Grant',
  description: 'Search and filter funding opportunities for your research project',
};

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function FundingOpportunitiesPage({ params }: PageProps) {
  const { projectId } = await params;
  
  return (
    <div className="container py-6 space-y-4">
      <BackButton href={`/projects/${projectId}`} />
      
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Funding Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          For best results, describe your research goals and requirements in detail rather than using keywords.
        </p>
      </div>
      
      <FundingOpportunitiesSearch projectId={projectId} />
    </div>
  );
} 