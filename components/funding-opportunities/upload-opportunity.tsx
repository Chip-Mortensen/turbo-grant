'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileText, Check, Calendar, Users, Building, FileCheck } from 'lucide-react';
import { FundingOpportunity } from '@/lib/extractors/funding-opportunity-extractor';
import { Input } from '@/components/ui/input';

interface ViewOpportunityProps {
  projectId: string;
}

export default function ViewOpportunity({ projectId }: ViewOpportunityProps) {
  const router = useRouter();
  const [grantUrl, setGrantUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<FundingOpportunity | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGrantUrl(e.target.value);
    setError(null);
  };

  const handleFetchUrl = async () => {
    if (!grantUrl.trim()) {
      setError('Please enter a valid URL.');
      return;
    }

    // Validate URL format
    try {
      new URL(grantUrl);
    } catch (e) {
      setError('Please enter a valid URL (e.g., https://example.com).');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setExtractedData(null);
    
    try {
      const response = await fetch('/api/funding-opportunities/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: grantUrl }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract funding opportunity information');
      }
      
      if (!result.data) {
        throw new Error('No data returned from extraction');
      }
      
      setExtractedData(result.data);
      setSuccess('Funding opportunity information extracted successfully!');
    } catch (err) {
      console.error('Extraction error:', err);
      setError((err as Error).message || 'An error occurred while processing the URL. Please try a different URL.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Not specified';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const clearAll = () => {
    setGrantUrl('');
    setError(null);
    setSuccess(null);
    setExtractedData(null);
  };

  return (
    <div className="w-full">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>View Funding Opportunity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="grant-url">Funding Opportunity URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="grant-url"
                  placeholder="https://grants.nih.gov/grants/guide/pa-files/PA-25-303.html"
                  value={grantUrl}
                  onChange={handleUrlChange}
                  className="flex-1"
                  disabled={isProcessing}
                />
                <Button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={!grantUrl.trim() || isProcessing}
                  className="whitespace-nowrap"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Fetching...
                    </>
                  ) : (
                    <>Get Data</>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Enter the URL of the funding opportunity announcement page and click "Get Data" to view the content.
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200 mt-4">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          {extractedData && (
            <div className="border rounded-md overflow-hidden mt-4">
              <div className="bg-slate-50 p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">AI Extracted Information</h3>
                    <p className="text-sm text-muted-foreground">
                      The AI has analyzed the text and extracted the following information
                    </p>
                  </div>
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
                
                <div className="space-y-4 border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Description</h4>
                    <p className="text-sm">{extractedData.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Grant Type</h4>
                      <div className="text-sm">
                        {extractedData.grant_type && Object.keys(extractedData.grant_type).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(extractedData.grant_type).map(type => (
                              <span key={type} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                {type}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p>Not specified</p>
                        )}
                      </div>
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
                    <h4 className="font-medium">Eligibility</h4>
                    <div className="text-sm bg-slate-50 p-3 rounded border overflow-auto max-h-60">
                      {extractedData.organization_eligibility ? (
                        <div className="space-y-1">
                          {Object.entries(extractedData.organization_eligibility).map(([key, value]) => (
                            <div key={key} className="flex items-center">
                              <span className={`w-4 h-4 mr-2 rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex items-center justify-center text-xs`}>
                                {value ? '✓' : '✗'}
                              </span>
                              <span>{key}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No eligibility data available</p>
                      )}
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
              </div>
            </div>
          )}
          
          <div className="flex space-x-2 mt-4">
            {grantUrl && (
              <Button 
                onClick={clearAll} 
                variant="outline" 
                disabled={isProcessing}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 