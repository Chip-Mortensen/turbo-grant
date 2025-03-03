import { Metadata } from 'next';
import { FundingOpportunitiesSearch } from '@/components/grants/funding-opportunities-search';

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
      <p className="text-sm text-muted-foreground">
        Search for funding opportunities and save them to your project.
      </p>
      
      <FundingOpportunitiesSearch projectId={projectId} />
    </div>
  );
} 