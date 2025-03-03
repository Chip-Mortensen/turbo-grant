import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Building, 
  Calendar, 
  FileText, 
  ExternalLink, 
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

type FOA = Database['public']['Tables']['foas']['Row'];

// Format currency for display
const formatCurrency = (value: number | null | undefined, isFloor: boolean = false) => {
  if (value === undefined || value === null) {
    return isFloor ? '$0' : 'Not specified';
  }
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

// Format date for display
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

type PageProps = {
  params: Promise<{ projectId: string; foaId: string }>;
};

const page = async ({ params }: PageProps) => {
  const { projectId, foaId } = await params;
  
  // Initialize Supabase client
  const supabase = await createClient();
  
  // Fetch FOA data
  const { data: foa, error } = await supabase
    .from('foas')
    .select('*')
    .eq('id', foaId)
    .single();
  
  if (error || !foa) {
    notFound();
  }
  
  console.log('FOA Data:', JSON.stringify(foa, null, 2));
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <Link href={`/dashboard/${projectId}/funding-opportunities`} passHref>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Funding Opportunities
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/${projectId}/funding-opportunities/${foaId}/chat`} className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Chat with Funding Opportunity
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold tracking-tight">{foa.title}</h1>
        <div className="flex items-center gap-2">
          {foa.grant_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={foa.grant_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                View Original
              </a>
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <Building className="h-3 w-3" />
          {foa.agency}
        </Badge>
        {foa.foa_code && (
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {foa.foa_code}
          </Badge>
        )}
        {foa.grant_type && (
          <Badge variant="outline">
            {foa.grant_type}
          </Badge>
        )}
        {foa.deadline && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Due: {formatDate(foa.deadline)}
          </Badge>
        )}
        {foa.animal_trials && (
          <Badge variant="outline">
            Animal Trials
          </Badge>
        )}
        {foa.human_trials && (
          <Badge variant="outline">
            Human Trials
          </Badge>
        )}
      </div>
      
      <Separator />
      
      {/* Award information */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Award Floor</div>
            <div className="text-xl font-semibold">
              {formatCurrency(foa.award_floor, true)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Award Ceiling</div>
            <div className="text-xl font-semibold">
              {formatCurrency(foa.award_ceiling)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Expected Awards</div>
            <div className="text-xl font-semibold">
              {foa.num_awards || 'Not specified'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Letters of Intent</div>
            <div className="text-xl font-semibold">
              {foa.letters_of_intent ? 'Required' : 'Not Required'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Preliminary Proposal</div>
            <div className="text-xl font-semibold">
              {foa.preliminary_proposal ? 'Required' : 'Not Required'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Description */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Description</h3>
        <div className="text-muted-foreground whitespace-pre-line">
          {foa.description || 'No description available.'}
        </div>
      </div>
      
      {/* Eligibility */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-medium">Eligibility</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Eligibility */}
          <div className="rounded-lg border bg-muted/40 p-6">
            <h4 className="text-sm font-medium mb-4">Organization</h4>
            <div className="space-y-2">
              {[
                { key: 'Higher Education', label: 'Higher Education' },
                { key: 'Non-Profit', label: 'Non-Profit' },
                { key: 'For-Profit', label: 'For-Profit' },
                { key: 'Government', label: 'Government' },
                { key: 'Hospital', label: 'Hospital' },
                { key: 'Foreign', label: 'Foreign' },
                { key: 'Individual', label: 'Individual' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  {foa.organization_eligibility?.[key] ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Individual Eligibility */}
          <div className="rounded-lg border bg-muted/40 p-6">
            <h4 className="text-sm font-medium mb-4">Individual</h4>
            <div className="space-y-2">
              {[
                { key: 'Principal Investigator (PI)', label: 'Principal Investigator' },
                { key: 'Co-Principal Investigator (Co-PI)', label: 'Co-Principal Investigator' },
                { key: 'Co-Investigator (Co-I)', label: 'Co-Investigator' },
                { key: 'Senior Personnel', label: 'Senior Personnel' },
                { key: 'Postdoctoral Researcher', label: 'Postdoctoral Researcher' },
                { key: 'Graduate Student', label: 'Graduate Student' },
                { key: 'Undergraduate Student', label: 'Undergraduate Student' },
                { key: 'Project Administrator', label: 'Project Administrator' },
                { key: 'Authorized Organizational Representative (AOR)', label: 'Authorized Organizational Representative' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  {foa.user_eligibility?.[key] ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Submission Requirements */}
      {foa.submission_requirements && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium">Submission Requirements</h3>
          <div className="space-y-4">
            {foa.submission_requirements.required_documents && (
              <div>
                <h4 className="text-sm font-medium mb-2">Required Documents</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {Array.isArray(foa.submission_requirements.required_documents) ? 
                    foa.submission_requirements.required_documents.map((doc: any, index: number) => (
                      <li key={index}>
                        {typeof doc === 'object' && doc !== null ? 
                          `${doc.Document}${doc.Description ? `: ${doc.Description}` : ''}` : 
                          String(doc)
                        }
                      </li>
                    )) : 
                    <li>
                      {typeof foa.submission_requirements.required_documents === 'object' ? 
                        JSON.stringify(foa.submission_requirements.required_documents) : 
                        String(foa.submission_requirements.required_documents)
                      }
                    </li>
                  }
                </ul>
              </div>
            )}
            
            {foa.submission_requirements.additional_instructions && (
              <div>
                <h4 className="text-sm font-medium mb-2">Additional Instructions</h4>
                <p className="text-muted-foreground">
                  {foa.submission_requirements.additional_instructions}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default page; 