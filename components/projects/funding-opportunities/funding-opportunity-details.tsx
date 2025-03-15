'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Calendar, 
  FileText, 
  ExternalLink, 
  Check,
  X,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { SelectFoaDialog } from '@/components/projects/funding-opportunities/select';
import { BackButton } from "@/components/ui/back-button";
import { getOrganizationTypes, organizationTypeLabels, nsfProposalTypeLabels, NsfProposalType } from '@/types/enum-types';
import { ChatPopup } from '@/components/projects/funding-opportunities/chat-popup';

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

interface FundingOpportunityDetailsProps {
  foa: any; // Replace with proper type
  projectId: string;
  isSelected: boolean;
}

export function FundingOpportunityDetails({ foa, projectId, isSelected }: FundingOpportunityDetailsProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const organizationTypes = getOrganizationTypes();

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <BackButton 
          href={`/projects/${projectId}/funding-opportunities`}
          label="Back to Funding Opportunities"
        />
        <div className="flex items-center gap-4">
          <Button asChild>
            <a href={foa.grant_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View Original
            </a>
          </Button>
          {isSelected ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Selected Opportunity
            </div>
          ) : (
            <SelectFoaDialog projectId={projectId} foa={foa} />
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold tracking-tight">{foa.title}</h1>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Building className="h-3 w-3" />
          {foa.agency}
        </Badge>
        {foa.foa_code && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {foa.foa_code}
          </Badge>
        )}
        {foa.grant_type && (
          <>
            {Object.keys(foa.grant_type).map(type => (
              <Badge key={type} variant="outline">
                {foa.agency === 'NSF' && nsfProposalTypeLabels[type.toLowerCase() as NsfProposalType] ? 
                  nsfProposalTypeLabels[type.toLowerCase() as NsfProposalType] : 
                  type}
              </Badge>
            ))}
          </>
        )}
        {foa.deadline && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Due: {formatDate(foa.deadline)}
          </Badge>
        )}
        {foa.animal_trials && (
          <Badge variant="secondary">
            Animal Trials
          </Badge>
        )}
        {foa.human_trials && (
          <Badge variant="secondary">
            Human Trials
          </Badge>
        )}
      </div>
      
      {/* Award information */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-background">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Award Floor</div>
            <div className="text-xl font-semibold">
              {formatCurrency(foa.award_floor, true)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Award Ceiling</div>
            <div className="text-xl font-semibold">
              {formatCurrency(foa.award_ceiling)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Expected Awards</div>
            <div className="text-xl font-semibold">
              {foa.num_awards || 'Not specified'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Letters of Intent</div>
            <div className="text-xl font-semibold">
              {foa.letters_of_intent ? 'Required' : 'Not Required'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Preliminary Proposal</div>
            <div className="text-xl font-semibold">
              {foa.preliminary_proposal ? 'Required' : 'Not Required'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Description and Eligibility */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Description */}
        <div className="space-y-4 md:col-span-3">
          <h3 className="text-lg font-medium">Description</h3>
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="text-muted-foreground whitespace-pre-line">
                {foa.description || 'No description available.'}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Eligibility */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Eligibility</h3>
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="space-y-2">
                {organizationTypes.map(type => (
                  <div key={type} className="flex items-center gap-3">
                    {foa.organization_eligibility?.[type] ? (
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm">{organizationTypeLabels[type]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Fixed Chat Bubble */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 bg-primary text-primary-foreground"
          onClick={() => setIsChatOpen(true)}
        >
          <MessageSquare className="h-5 w-5" />
          Chat with Funding Opportunity
        </Button>
      </div>
      
      <ChatPopup
        foaId={foa.id}
        projectId={projectId}
        title={foa.title}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
} 