'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileText, Upload, Sparkles, Check, Calendar, Users, Building, FileCheck, FileUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { FundingOpportunity } from '@/lib/funding-opportunity-extractor';
import { Input } from '@/components/ui/input';

interface UploadGrantProps {
  projectId: string;
  onSuccess?: (data: any) => void;
}

export default function UploadGrant({ projectId, onSuccess }: UploadGrantProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [grantText, setGrantText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<FundingOpportunity | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saveToDatabase, setSaveToDatabase] = useState(true);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGrantText(e.target.value);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an HTML file
    if (!file.name.endsWith('.html') && file.type !== 'text/html') {
      setError('Please upload an HTML file.');
      return;
    }

    setFileName(file.name);
    setError(null);
    
    try {
      const text = await file.text();
      
      // Extract only the body content from HTML
      let bodyContent = text;
      
      try {
        // Create a DOM parser to extract just the body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        // Get the body content
        if (doc.body) {
          // Get text content from body, removing scripts and styles
          const scripts = doc.querySelectorAll('script, style');
          scripts.forEach(script => script.remove());
          
          bodyContent = doc.body.textContent || '';
          bodyContent = bodyContent.trim();
          
          // Clean up excessive whitespace
          bodyContent = bodyContent.replace(/\s+/g, ' ');
          bodyContent = bodyContent.replace(/\n\s*\n/g, '\n\n');
        }
      } catch (parseErr) {
        console.warn('Failed to parse HTML, using raw text instead:', parseErr);
        // Fall back to using the raw text if parsing fails
      }
      
      setGrantText(bodyContent);
      setSuccess('HTML file loaded successfully. Body content extracted for processing.');
    } catch (err) {
      setError('Failed to read the HTML file.');
      console.error(err);
    }
  };

  const handleExtract = async () => {
    if (!grantText.trim()) {
      setError('Please enter grant text or upload an HTML file.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setExtractedData(null);
    setShowFullDetails(false);
    
    try {
      // Make API call to extract grant information
      const response = await fetch('/api/extract-grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: grantText }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract grant information');
      }
      
      // Validate that we have the required fields
      if (!result.data) {
        throw new Error('No data returned from extraction');
      }
      
      // Check for critical fields
      const criticalFields = ['agency', 'title', 'foa_code', 'deadline'];
      const missingFields = criticalFields.filter(field => !result.data[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing critical information: ${missingFields.join(', ')}. Please try with more complete grant text.`);
      }
      
      setExtractedData(result.data);
      setSuccess('Grant information extracted successfully!');
    } catch (err) {
      console.error('Extraction error:', err);
      setError((err as Error).message || 'An error occurred while processing the grant text. Please try with more complete grant text or a different document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) {
      setError('No extracted data to save.');
      return;
    }

    if (!saveToDatabase) {
      setSuccess('Extraction completed. Data not saved to database as requested.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // First, check if a grant type exists for this FOA
      let grantTypeId;
      
      // Check if grant type already exists
      const { data: existingGrantTypes } = await supabase
        .from('grant_types')
        .select('id')
        .eq('name', extractedData.grant_type)
        .eq('organization', extractedData.agency)
        .single();
      
      if (existingGrantTypes) {
        grantTypeId = existingGrantTypes.id;
      } else {
        // Create a new grant type
        const { data: newGrantType, error: grantTypeError } = await supabase
          .from('grant_types')
          .insert({
            name: extractedData.grant_type,
            organization: extractedData.agency,
            description: extractedData.description,
            instructions: JSON.stringify(extractedData.submission_requirements),
            is_custom: false
          })
          .select()
          .single();
        
        if (grantTypeError) {
          throw new Error(`Failed to create grant type: ${grantTypeError.message}`);
        }
        
        grantTypeId = newGrantType.id;
      }
      
      // Create project grant
      const { data: projectGrant, error: projectGrantError } = await supabase
        .from('project_grants')
        .insert({
          project_id: projectId,
          grant_type_id: grantTypeId,
          status: 'draft'
        })
        .select()
        .single();
      
      if (projectGrantError) {
        throw new Error(`Failed to create project grant: ${projectGrantError.message}`);
      }
      
      // Store funding opportunity
      const { error: fundingOpportunityError } = await supabase
        .from('funding_opportunities')
        .insert({
          agency: extractedData.agency,
          title: extractedData.title,
          foa_code: extractedData.foa_code,
          grant_type: extractedData.grant_type,
          description: extractedData.description,
          deadline: extractedData.deadline,
          num_awards: extractedData.num_awards,
          award_ceiling: extractedData.award_ceiling,
          award_floor: extractedData.award_floor,
          letters_of_intent: extractedData.letters_of_intent,
          preliminary_proposal: extractedData.preliminary_proposal,
          animal_trials: extractedData.animal_trials,
          human_trials: extractedData.human_trials,
          organization_eligibility: extractedData.organization_eligibility,
          user_eligibility: extractedData.user_eligibility,
          grant_url: extractedData.grant_url,
          published_date: extractedData.published_date,
          submission_requirements: extractedData.submission_requirements
        });
      
      if (fundingOpportunityError) {
        // If it's a duplicate, we can ignore it as the funding opportunity already exists
        if (fundingOpportunityError.code !== '23505') {
          throw new Error(`Failed to store funding opportunity: ${fundingOpportunityError.message}`);
        }
      }
      
      setSuccess('Grant added to your project successfully!');
      setGrantText('');
      setExtractedData(null);
      setShowFullDetails(false);
      setFileName(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(projectGrant);
      }
      
      // Refresh the page data
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'An error occurred while saving the grant');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Not specified';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const clearAll = () => {
    setGrantText('');
    setExtractedData(null);
    setError(null);
    setSuccess(null);
    setFileName(null);
    setShowFullDetails(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="grantText" className="text-lg">Grant Text or HTML</Label>
            <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              Uses AI
            </span>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Upload HTML File
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".html,text/html"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {fileName && (
                <span className="text-sm flex items-center">
                  <FileText className="h-4 w-4 mr-1 text-blue-500" />
                  {fileName} <span className="text-gray-500 ml-1">(body content extracted)</span>
                </span>
              )}
              
              {(grantText || fileName) && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={clearAll}
                  className="ml-auto"
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="saveToDatabase"
                checked={saveToDatabase}
                onChange={(e) => setSaveToDatabase(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="saveToDatabase" className="text-sm font-normal">
                Save to database after extraction
              </Label>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            Paste text or upload an HTML file from a funding opportunity announcement (NIH or NSF) and click "Extract Information" to use AI to analyze it. When uploading HTML files, only the body content will be extracted.
          </p>
          
          <Textarea
            id="grantText"
            placeholder="Paste the grant text or HTML content here..."
            value={grantText}
            onChange={handleTextChange}
            disabled={isProcessing}
            className="min-h-[200px] font-mono text-xs"
          />
          
          <p className="text-xs text-muted-foreground mt-1">
            Example: Paste the text from an NIH R01 or NSF funding announcement, or upload an HTML file.
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        {extractedData && (
          <div className="border rounded-md overflow-hidden">
            <div className="bg-slate-50 p-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">AI Extracted Information</h3>
                  <p className="text-sm text-muted-foreground">
                    The AI has analyzed the text and extracted the following information
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowFullDetails(!showFullDetails)}
                >
                  {showFullDetails ? 'Show Less' : 'Show Full Details'}
                </Button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <Building className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">Agency</span>
                  </div>
                  <p className="text-sm ml-7">{extractedData.agency}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <FileCheck className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">FOA Code</span>
                  </div>
                  <p className="text-sm ml-7">{extractedData.foa_code}</p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">Title</span>
                  </div>
                  <p className="text-sm ml-7">{extractedData.title}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="text-sm ml-7">{extractedData.deadline}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <Users className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">Expected Awards</span>
                  </div>
                  <p className="text-sm ml-7">{extractedData.num_awards}</p>
                </div>
              </div>
              
              {showFullDetails && (
                <div className="space-y-4 border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Description</h4>
                    <p className="text-sm">{extractedData.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Grant Type</h4>
                      <p className="text-sm">{extractedData.grant_type}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Published Date</h4>
                      <p className="text-sm">
                        {extractedData.published_date ? new Date(extractedData.published_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Not specified'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Award Ceiling</h4>
                      <p className="text-sm">{formatCurrency(extractedData.award_ceiling)}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Award Floor</h4>
                      <p className="text-sm">{formatCurrency(extractedData.award_floor)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Letters of Intent</h4>
                      <p className="text-sm flex items-center">
                        {extractedData.letters_of_intent ? (
                          <><Check className="h-4 w-4 text-green-500 mr-1" /> Required</>
                        ) : (
                          'Not Required'
                        )}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Preliminary Proposal</h4>
                      <p className="text-sm flex items-center">
                        {extractedData.preliminary_proposal ? (
                          <><Check className="h-4 w-4 text-green-500 mr-1" /> Required</>
                        ) : (
                          'Not Required'
                        )}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Animal Trials</h4>
                      <p className="text-sm flex items-center">
                        {extractedData.animal_trials ? (
                          <><Check className="h-4 w-4 text-green-500 mr-1" /> Involved</>
                        ) : (
                          'Not Involved'
                        )}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Human Trials</h4>
                      <p className="text-sm flex items-center">
                        {extractedData.human_trials ? (
                          <><Check className="h-4 w-4 text-green-500 mr-1" /> Involved</>
                        ) : (
                          'Not Involved'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Organization Eligibility</h4>
                    <div className="text-sm bg-slate-50 p-3 rounded border overflow-auto max-h-40">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(extractedData.organization_eligibility, null, 2)}</pre>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">User Eligibility</h4>
                    <div className="text-sm bg-slate-50 p-3 rounded border overflow-auto max-h-40">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(extractedData.user_eligibility, null, 2)}</pre>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Submission Requirements</h4>
                    <div className="text-sm bg-slate-50 p-3 rounded border overflow-auto max-h-40">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(extractedData.submission_requirements, null, 2)}</pre>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Grant URL</h4>
                    <p className="text-sm break-all">
                      <a href={extractedData.grant_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {extractedData.grant_url}
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleExtract} 
            disabled={!grantText.trim() || isProcessing}
            className="flex-1"
          >
            {isProcessing && !extractedData ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Extract Information
              </>
            )}
          </Button>
          
          {extractedData && (
            <Button 
              onClick={handleSave} 
              disabled={isProcessing}
              className="flex-1"
              variant={saveToDatabase ? "secondary" : "outline"}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  {saveToDatabase ? 'Save to Project' : 'Done'}
                </>
              )}
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          The AI will analyze the text and extract key information like agency, title, deadline, and requirements.
        </p>
      </div>
    </div>
  );
} 