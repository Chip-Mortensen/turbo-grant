import { Metadata } from 'next';
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from '@/lib/utils';
import { BackButton } from "@/components/ui/back-button";

// Import NSF components from nsf directory
import SeniorPersonnelSection from './nsf/senior-personnel-section';
import SingleCopyDocumentsSection from './nsf/single-copy-documents';
import FormattingRequirementsSection from './nsf/formatting-requirements';
import PriorNSFSupportSection from './nsf/prior-nsf-support';

// Import NIH components from nih directory
import NIHFormattingRequirementsSection from './nih/formatting-requirements';

export const metadata: Metadata = {
  title: 'Application Submission | Turbo Grant',
  description: 'Instructions for submitting your grant application',
};

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SubmissionDetailsPage({ params }: PageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get the project information and FOA
  const { data: project, error: projectError } = await supabase
    .from('research_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('Error fetching project:', projectError);
    return redirect("/projects");
  }

  // Get the FOA details if available
  let agency: 'NIH' | 'NSF' | null = null;
  let foaData = null;
  let deadline = null;

  if (project.foa) {
    const { data: foa, error: foaError } = await supabase
      .from('foas')
      .select('*')
      .eq('id', project.foa)
      .single();

    if (!foaError && foa) {
      foaData = foa;
      agency = foa.agency as 'NIH' | 'NSF';
      deadline = foa.deadline;
    }
  }

  // Format deadline for display
  const formattedDeadline = deadline ? formatDate(deadline) : 'Not specified';

  return (
    <div className="container py-6 space-y-6">
      <BackButton href={`/projects/${projectId}`} />
      
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Application Submission</h1>
        <p className="text-muted-foreground">
          Instructions for submitting your {agency || ''} grant application
        </p>
      </div>

      {!agency && (
        <Alert>
          <Info className="h-4 w-4 mr-2" />
          <AlertTitle>No funding opportunity selected</AlertTitle>
          <AlertDescription>
            Please select a funding opportunity to view submission details.
          </AlertDescription>
        </Alert>
      )}

      {agency === 'NIH' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold">NIH Submission Process</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Applications must be submitted through ASSIST, Grants.gov Workspace, or other eRA system</li>
                <li>Register early in eRA Commons and Grants.gov (at least 6 weeks before deadline)</li>
                <li>Follow the application guide for your specific grant type</li>
                <li>Check for any FOA-specific instructions or requirements</li>
                <li>Submit before the deadline: <strong>{formattedDeadline}</strong> (5:00 PM local time)</li>
              </ul>
            </CardContent>
          </Card>
          
          <NIHFormattingRequirementsSection />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold">Required Documents</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Research Plan/Strategy</li>
                  <li>Specific Aims</li>
                  <li>Biosketch for all key personnel</li>
                  <li>Other Support (Current & Pending Support)</li>
                  <li>Budget and Budget Justification</li>
                  <li>Facilities and Resources</li>
                  <li>Authentication of Key Resources</li>
                  <li>Human Subjects documentation (if applicable)</li>
                  <li>Vertebrate Animals documentation (if applicable)</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold">Important Links</h2>
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="https://grants.nih.gov/grants/how-to-apply-application-guide.html" target="_blank" rel="noopener noreferrer">
                      NIH Application Guide <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="https://public.era.nih.gov/assist/" target="_blank" rel="noopener noreferrer">
                      ASSIST Portal <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="https://grants.nih.gov/grants/forms.htm" target="_blank" rel="noopener noreferrer">
                      NIH Forms Library <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="https://www.ncbi.nlm.nih.gov/sciencv/" target="_blank" rel="noopener noreferrer">
                      SciENcv (Biosketches & Other Support) <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Info className="h-4 w-4 mr-2" />
            <AlertTitle>SciENcv Requirement for NIH Applications</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>NIH requires both Biographical Sketches and Other Support (Current & Pending Support) to be prepared and submitted using SciENcv.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Biographical Sketches are limited to five pages and are required for all senior/key personnel</li>
                <li>Other Support documentation must include all resources made available to researchers, including foreign activities and resources</li>
                <li>SciENcv will produce NIH-compliant PDF versions of both documents</li>
              </ul>
              <Button asChild size="sm" className="mt-2">
                <Link href="https://www.ncbi.nlm.nih.gov/sciencv/" target="_blank" rel="noopener noreferrer">
                  Access SciENcv <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {agency === 'NSF' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold">NSF Submission Process</h2>
              <div>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Applications must be submitted through Research.gov or Grants.gov</li>
                  <li>Register early in Research.gov (at least 4 weeks before deadline)</li>
                  <li>Follow the NSF Proposal & Award Policies & Procedures Guide (PAPPG)</li>
                  <li>Submit all required documents in PDF format</li>
                  <li>Check for any program-specific instructions</li>
                  <li>Consider submitting at least 5 business days before the deadline: <strong>{formattedDeadline}</strong> (5:00 PM local time) to allow time for corrections if needed</li>
                  <li className="text-amber-700"><strong>Important:</strong> If a pre-application (preliminary proposal) is required, it must be submitted through Research.gov, not Grants.gov.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <PriorNSFSupportSection />

          <FormattingRequirementsSection />
          
          <SeniorPersonnelSection />

          <SingleCopyDocumentsSection />
          
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-xl font-semibold">Important Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button asChild>
                  <Link href="https://www.research.gov/" target="_blank" rel="noopener noreferrer">
                    Research.gov Portal <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="https://www.grants.gov/" target="_blank" rel="noopener noreferrer">
                    Grants.gov Portal <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="https://www.nsf.gov/publications/pub_summ.jsp?ods_key=pappg" target="_blank" rel="noopener noreferrer">
                    NSF PAPPG <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="https://www.ncbi.nlm.nih.gov/sciencv/" target="_blank" rel="noopener noreferrer">
                    SciENcv <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="https://nsf.gov/bfa/dias/policy/coa.jsp" target="_blank" rel="noopener noreferrer">
                    COA Template <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="https://www.nsf.gov/bfa/dias/policy/dmp.jsp" target="_blank" rel="noopener noreferrer">
                    Data Management Plan <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 