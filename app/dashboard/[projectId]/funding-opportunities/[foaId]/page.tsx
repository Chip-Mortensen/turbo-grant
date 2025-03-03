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
  Star
} from 'lucide-react';
import Link from 'next/link';

type FOA = Database['public']['Tables']['foas']['Row'];

// Format currency for display
const formatCurrency = (value: number | null | undefined) => {
  if (value === undefined || value === null) return 'Not specified';
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

export default async function FoaDetailsPage({
  params,
}: {
  params: { projectId: string; foaId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { projectId, foaId } = params;
  
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
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Link href={`/dashboard/${projectId}/funding-opportunities`} passHref>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Funding Opportunities
        </Button>
      </Link>
      
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold tracking-tight">{foa.title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Star className="h-4 w-4" />
          </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Award Floor</div>
            <div className="text-xl font-semibold">
              {formatCurrency(foa.award_floor)}
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
        
        {foa.organization_eligibility && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Organization Types</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(foa.organization_eligibility as Record<string, boolean>).map(([key, value]) => (
                value && (
                  <Badge key={key} variant="secondary">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                )
              ))}
            </div>
          </div>
        )}
        
        {foa.user_eligibility && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">User Roles</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(foa.user_eligibility as Record<string, boolean>).map(([key, value]) => (
                value && (
                  <Badge key={key} variant="secondary">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                )
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Additional requirements */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-medium">Additional Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={foa.letters_of_intent || false} disabled />
            <Label className="text-sm font-normal">Letters of Intent Required</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={foa.preliminary_proposal || false} disabled />
            <Label className="text-sm font-normal">Preliminary Proposal Required</Label>
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
            
            {foa.submission_requirements.formats && (
              <div>
                <h4 className="text-sm font-medium mb-2">Formats</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {Array.isArray(foa.submission_requirements.formats) ? 
                    foa.submission_requirements.formats.map((format: string, index: number) => (
                      <li key={index}>{String(format)}</li>
                    )) : 
                    <li>{String(foa.submission_requirements.formats)}</li>
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
} 