import { Metadata } from 'next';
import { FundingOpportunitiesSearch } from '@/components/grants/funding-opportunities-search';

export const metadata: Metadata = {
  title: 'Funding Opportunities | Turbo Grant',
  description: 'Search and filter funding opportunities for your research project',
};

export default async function FundingOpportunitiesPage({
  params
}: {
  params: { projectId: string }
}) {
  return (
    <div className="container py-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Search for funding opportunities and save them to your project.
      </p>
      
      <FundingOpportunitiesSearch projectId={params.projectId} />
    </div>
  );
} 