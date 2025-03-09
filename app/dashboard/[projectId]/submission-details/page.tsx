import { Metadata } from 'next';
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { ArrowLeft, Info, ExternalLink, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from '@/lib/utils';

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
    return redirect("/dashboard");
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
      <Link href={`/dashboard/${projectId}`} passHref>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
      </Link>
      
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Application Submission</h1>
        <p className="text-muted-foreground">
          Instructions for submitting your {agency || ''} grant application
        </p>
      </div>

      {deadline && (
        <Alert className="bg-amber-50 border-amber-200">
          <Calendar className="h-4 w-4 text-amber-600 mr-2" />
          <AlertTitle className="text-amber-800">Submission Deadline</AlertTitle>
          <AlertDescription className="text-amber-700">
            Your application is due on <strong>{formattedDeadline}</strong>. We recommend submitting at least 48 hours before this deadline to avoid technical issues.
          </AlertDescription>
        </Alert>
      )}

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold">Required Documents</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Research Plan/Strategy</li>
                  <li>Specific Aims</li>
                  <li>Biosketch for all key personnel</li>
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
                      SciENcv (Biographical Sketch) <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {agency === 'NSF' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold">NSF Submission Process</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Applications must be submitted through Research.gov or Grants.gov</li>
                <li>Register early in Research.gov (at least 4 weeks before deadline)</li>
                <li>Follow the NSF Proposal & Award Policies & Procedures Guide (PAPPG)</li>
                <li>Submit all required documents in PDF format</li>
                <li>Check for any program-specific instructions</li>
                <li>Submit before the deadline: <strong>{formattedDeadline}</strong> (5:00 PM submitter's local time)</li>
              </ul>
            </CardContent>
          </Card>
          
          <Alert>
            <Info className="h-4 w-4 mr-2" />
            <AlertTitle>SciENcv Requirement for Biographical Sketches</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>NSF requires Biographical Sketches to be prepared and submitted using SciENcv.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>A Biographical Sketch (limited to three pages) must be provided separately for each individual designated as senior personnel</li>
                <li>SciENcv will produce an NSF-compliant PDF version of the Biographical Sketch</li>
                <li>These documents must be prepared, saved, certified, and submitted as part of your proposal</li>
              </ul>
              <Button asChild size="sm" className="mt-2">
                <Link href="https://www.ncbi.nlm.nih.gov/sciencv/" target="_blank" rel="noopener noreferrer">
                  Access SciENcv <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold">Required Documents</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Project Summary</li>
                  <li>Project Description</li>
                  <li>References Cited</li>
                  <li><strong>Biographical Sketches</strong> (via SciENcv)</li>
                  <li>Budget and Budget Justification</li>
                  <li>Current and Pending Support</li>
                  <li>Facilities, Equipment and Other Resources</li>
                  <li>Data Management Plan</li>
                  <li>Collaborators and Other Affiliations</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold">Important Links</h2>
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="https://www.research.gov/" target="_blank" rel="noopener noreferrer">
                      Research.gov Portal <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="https://www.nsf.gov/publications/pub_summ.jsp?ods_key=pappg" target="_blank" rel="noopener noreferrer">
                      NSF PAPPG <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="https://www.ncbi.nlm.nih.gov/sciencv/" target="_blank" rel="noopener noreferrer">
                      SciENcv (Biographical Sketch) <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="https://www.nsf.gov/bfa/dias/policy/dmp.jsp" target="_blank" rel="noopener noreferrer">
                      Data Management Plan Guide <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Submission Tips</AlertTitle>
        <AlertDescription>
          Submit your application at least 24-48 hours before the deadline ({formattedDeadline}) to avoid technical issues. 
          Each agency has specific formatting requirements and submission processes.
        </AlertDescription>
      </Alert>
    </div>
  );
} 