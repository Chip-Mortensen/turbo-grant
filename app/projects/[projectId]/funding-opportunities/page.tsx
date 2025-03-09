import { Metadata } from 'next';
import { FundingOpportunitiesSearch } from '@/components/projects/funding-opportunities/search';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <Link href={`/dashboard/${projectId}`} passHref>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
      </Link>
      
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