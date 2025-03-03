'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
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
  Star, 
  Loader2 
} from 'lucide-react';
import { Database } from '@/types/supabase';

type FOA = Database['public']['Tables']['foas']['Row'];

interface FoaDetailsPageProps {
  params: {
    projectId: string;
    foaId: string;
  };
}

export default function FoaDetailsPage({ params }: FoaDetailsPageProps) {
  const router = useRouter();
  const { projectId, foaId } = params;
  
  const [foa, setFoa] = useState<FOA | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchFoaDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('foas')
          .select('*')
          .eq('id', foaId)
          .single();
        
        if (error) {
          throw error;
        }
        
        setFoa(data);
      } catch (err) {
        console.error('Error fetching FOA details:', err);
        setError('Failed to load funding opportunity details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFoaDetails();
  }, [foaId]);
  
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
  
  // Go back to funding opportunities list
  const handleBack = () => {
    router.push(`/dashboard/${projectId}/funding-opportunities`);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading funding opportunity details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !foa) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Funding Opportunities
        </Button>
        
        <div className="flex flex-col items-center justify-center h-[400px]">
          <div className="text-red-500 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">{error || 'Funding opportunity not found'}</p>
          </div>
          <Button variant="default" onClick={handleBack}>
            Return to Funding Opportunities
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button variant="outline" onClick={handleBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Funding Opportunities
      </Button>
      
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
    </div>
  );
} 