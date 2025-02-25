'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileText, Upload, Sparkles, Check, Calendar, Users, Building, FileCheck, FileUp, FileSpreadsheet } from 'lucide-react';
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
  const [grantUrl, setGrantUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<FundingOpportunity | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [inputMethod, setInputMethod] = useState<'text' | 'file' | 'url'>('text');
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvUrls, setCsvUrls] = useState<string[]>([]);
  const [processingCsvIndex, setProcessingCsvIndex] = useState<number>(-1);
  const [processedResults, setProcessedResults] = useState<FundingOpportunity[]>([]);
  const [processingTotal, setProcessingTotal] = useState<number>(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGrantText(e.target.value);
    setError(null);
    setInputMethod('text');
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGrantUrl(e.target.value);
    setError(null);
    setInputMethod('url');
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
    
    try {
      // Fetch the HTML content from the URL
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: grantUrl }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch URL');
      }
      
      if (!result.data) {
        throw new Error('No data returned from URL');
      }
      
      // Set the grant text with the fetched HTML content
      setGrantText(result.data);
      setInputMethod('text');
      setSuccess('URL content fetched successfully. Ready for extraction.');
    } catch (err) {
      console.error('URL fetch error:', err);
      setError((err as Error).message || 'An error occurred while fetching the URL. Please try a different URL or upload an HTML file.');
    } finally {
      setIsProcessing(false);
    }
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
    setInputMethod('file');
    
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
      setError('Please enter grant text or upload an HTML file or fetch content from a URL.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setExtractedData(null);
    
    try {
      // Make API call to extract grant information
      const response = await fetch('/api/extract-grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: grantText,
          url: grantUrl // Pass the URL to the API even when using text extraction
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract grant information');
      }
      
      // Validate that we have the required fields
      if (!result.data) {
        throw new Error('No data returned from extraction');
      }
      
      // Remove validation for critical fields
      setExtractedData(result.data);
      
      // Set the grant_url field if it's not already set
      if (result.data && !result.data.grant_url) {
        // If we have a URL in the input field, use that
        if (grantUrl) {
          result.data.grant_url = grantUrl;
        } else if (fileName) {
          // If we're using an uploaded file, indicate that in the URL
          result.data.grant_url = `Uploaded file: ${fileName}`;
        }
      }
      
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
      
      // Store funding opportunity
      const { error: fundingOpportunityError } = await supabase
        .from('foas')
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
          grant_url: extractedData.grant_url || '',
          published_date: extractedData.published_date,
          submission_requirements: extractedData.submission_requirements
        });
      
      if (fundingOpportunityError) {
        console.error('Error storing funding opportunity:', fundingOpportunityError);
        // If it's a duplicate, we can ignore it as the funding opportunity already exists
        if (fundingOpportunityError.code !== '23505') {
          throw new Error(`Failed to store funding opportunity: ${fundingOpportunityError.message}`);
        }
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(extractedData);
      }
      
      setSuccess('Funding opportunity information saved successfully!');
      setGrantText('');
      setGrantUrl('');
      setExtractedData(null);
      setFileName(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error saving grant:', err);
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
    setGrantUrl('');
    setFileName(null);
    setError(null);
    setSuccess(null);
    setExtractedData(null);
    setInputMethod('text');
    setCsvFile(null);
    setCsvFileName(null);
    setCsvUrls([]);
    setProcessedResults([]);
    setProcessingCsvIndex(-1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file.');
      return;
    }

    setCsvFile(file);
    setCsvFileName(file.name);
    setError(null);
    setSuccess(null);
    
    try {
      const text = await file.text();
      
      // Check which column exists in the CSV
      const headers = text.split('\n')[0].split(',').map(header => header.trim().toLowerCase());
      const hasSolicitation = headers.includes('solicitation');
      const hasUrl = headers.includes('url');
      
      const urls = parseCsvForUrls(text);
      
      if (urls.length === 0) {
        setError('No valid URLs or solicitation numbers found in the CSV file. Please ensure the CSV contains a "Solicitation" or "URL" column with valid data.');
        return;
      }
      
      setCsvUrls(urls);
      
      // Create a more descriptive success message
      let successMessage = `CSV file loaded successfully. Found ${urls.length} `;
      if (hasSolicitation) {
        successMessage += 'solicitation numbers';
        if (hasUrl) successMessage += ' and URLs';
      } else {
        successMessage += 'URLs';
      }
      successMessage += ' to process.';
      
      setSuccess(successMessage);
    } catch (err) {
      setError('Failed to read the CSV file.');
      console.error(err);
    }
  };

  const parseCsvForUrls = (csvData: string): string[] => {
    const rows = csvData.split('\n');
    if (rows.length === 0) return [];

    // Parse the header row to find column indices
    const headers = parseCSVRow(rows[0]).map(header => header.trim().toLowerCase());
    
    // First look for Solicitation column, then URL column as fallback
    const solicitationColumnIndex = headers.indexOf('solicitation');
    const urlColumnIndex = headers.indexOf('url');
    
    if (solicitationColumnIndex === -1 && urlColumnIndex === -1) {
      setError("CSV must contain either a 'Solicitation' or 'URL' column");
      return [];
    }
    
    // Prioritize Solicitation column if it exists, otherwise use URL column
    const columnIndex = solicitationColumnIndex !== -1 ? solicitationColumnIndex : urlColumnIndex;
    const isUrlColumn = columnIndex === urlColumnIndex;
    
    // Extract values from the chosen column
    const values: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue; // Skip empty rows
      
      const cells = parseCSVRow(rows[i]);
      if (cells.length <= columnIndex) continue; // Skip rows without enough columns
      
      let value = cells[columnIndex].trim();
      if (!value) continue; // Skip empty values
      
      // If we're using the solicitation column, convert to URL
      if (!isUrlColumn) {
        value = convertSolicitationToUrl(value);
      }
      
      if (value) values.push(value);
    }
    
    return values;
  };
  
  // Helper function to parse CSV rows properly, handling quoted fields
  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        // Add character to current field
        current += char;
      }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
  };
  
  const convertSolicitationToUrl = (solicitation: string): string => {
    // Clean up the solicitation string
    const cleanSolicitation = solicitation.trim();
    
    // Handle NIH format (e.g., "PA-25-303")
    // Match patterns like PA-25-303, RFA-AI-23-044, PAR-24-123, etc.
    const nihMatch = cleanSolicitation.match(/^([A-Z]{2,3})-(\d{2})-(\d{3,4})$/);
    if (nihMatch) {
      return `https://grants.nih.gov/grants/guide/pa-files/${cleanSolicitation}.html`;
    }
    
    // Handle NSF format (e.g., "NSF 25-535")
    // Match patterns like NSF 25-535, NSF 24-1, etc.
    const nsfMatch = cleanSolicitation.match(/^NSF\s+(\d{2})-(\d{1,3})$/i);
    if (nsfMatch) {
      const [_, year, number] = nsfMatch;
      // Format the number with leading zeros if needed (e.g., 1 -> 001)
      const formattedNumber = number.padStart(3, '0');
      return `https://www.nsf.gov/pubs/${year}-${formattedNumber}/nsf${year}${formattedNumber}.htm`;
    }
    
    // If it's already a URL, return as is
    if (cleanSolicitation.startsWith('http://') || cleanSolicitation.startsWith('https://')) {
      return cleanSolicitation;
    }
    
    // Log the unrecognized format but don't set an error for each one
    console.warn(`Could not convert solicitation "${cleanSolicitation}" to URL. Skipping.`);
    
    // For unrecognized formats, return empty string
    return '';
  };

  const processCsvUrls = async () => {
    if (csvUrls.length === 0) {
      setError('No URLs to process.');
      return;
    }
    
    setIsBatchProcessing(true);
    setProcessingTotal(csvUrls.length);
    setProcessedResults([]);
    setError(null);
    setSuccess(null);
    
    // Process URLs one by one
    for (let i = 0; i < csvUrls.length; i++) {
      setProcessingCsvIndex(i);
      
      try {
        // Fetch the HTML content from the URL
        const response = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: csvUrls[i] }),
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.data) {
          console.error(`Failed to fetch URL ${csvUrls[i]}: ${result.error || 'Unknown error'}`);
          continue; // Skip to next URL
        }
        
        // Extract information from the fetched content
        const extractResponse = await fetch('/api/extract-grant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: result.data,
            url: csvUrls[i] // Always pass the URL to the API
          }),
        });
        
        const extractResult = await extractResponse.json();
        
        if (!extractResponse.ok || !extractResult.data) {
          console.error(`Failed to extract information from URL ${csvUrls[i]}: ${extractResult.error || 'Unknown error'}`);
          continue; // Skip to next URL
        }
        
        // Set the grant_url field
        if (extractResult.data && !extractResult.data.grant_url) {
          extractResult.data.grant_url = csvUrls[i];
        }
        
        // Add to processed results
        setProcessedResults(prev => [...prev, extractResult.data]);
        
      } catch (err) {
        console.error(`Error processing URL ${csvUrls[i]}:`, err);
      }
    }
    
    setProcessingCsvIndex(-1);
    setIsBatchProcessing(false);
    setSuccess(`Processed ${csvUrls.length} URLs. Successfully extracted information from ${processedResults.length} URLs.`);
  };

  const saveAllProcessedResults = async () => {
    if (processedResults.length === 0) {
      setError('No processed results to save.');
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
      let savedCount = 0;
      
      for (const result of processedResults) {
        // Store funding opportunity
        const { error: fundingOpportunityError } = await supabase
          .from('foas')
          .insert({
            agency: result.agency,
            title: result.title,
            foa_code: result.foa_code,
            grant_type: result.grant_type,
            description: result.description,
            deadline: result.deadline,
            num_awards: result.num_awards,
            award_ceiling: result.award_ceiling,
            award_floor: result.award_floor,
            letters_of_intent: result.letters_of_intent,
            preliminary_proposal: result.preliminary_proposal,
            animal_trials: result.animal_trials,
            human_trials: result.human_trials,
            organization_eligibility: result.organization_eligibility,
            user_eligibility: result.user_eligibility,
            grant_url: result.grant_url || '',
            published_date: result.published_date,
            submission_requirements: result.submission_requirements
          });
        
        if (fundingOpportunityError) {
          console.error('Error storing funding opportunity:', fundingOpportunityError);
          // If it's a duplicate, we can ignore it as the funding opportunity already exists
          if (fundingOpportunityError.code !== '23505') {
            console.error(`Failed to store funding opportunity: ${fundingOpportunityError.message}`);
          }
        } else {
          savedCount++;
        }
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(processedResults);
      }
      
      setSuccess(`Successfully saved ${savedCount} out of ${processedResults.length} funding opportunities.`);
      setCsvFile(null);
      setCsvFileName(null);
      setCsvUrls([]);
      setProcessedResults([]);
      
      // Reset file input
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error saving grants:', err);
      setError((err as Error).message || 'An error occurred while saving the grants');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Grant Information</CardTitle>
          <CardDescription>
            Upload a CSV file with URLs, an HTML file, paste grant text, or provide a URL to extract funding opportunity information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="csv-file">Upload CSV with URLs</Label>
              <div className="flex space-x-2">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  ref={csvFileInputRef}
                  className="hidden"
                  disabled={isProcessing || isBatchProcessing}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => csvFileInputRef.current?.click()}
                  className="flex items-center"
                  disabled={isProcessing || isBatchProcessing}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {csvFileName ? csvFileName : 'Choose CSV File'}
                </Button>
                
                {csvUrls.length > 0 && (
                  <Button
                    type="button"
                    onClick={processCsvUrls}
                    disabled={isProcessing || isBatchProcessing}
                    className="flex-1"
                  >
                    {isBatchProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing {processingCsvIndex + 1} of {processingTotal}...
                      </>
                    ) : (
                      <>Process {csvUrls.length} URLs</>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Upload a CSV file with a "Solicitation" or "URL" column to process multiple funding opportunities at once. If both columns exist, the "Solicitation" column will be used.
              </p>
              
              {csvUrls.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Found {csvUrls.length} URLs to process:</p>
                  <div className="mt-1 max-h-32 overflow-y-auto text-xs bg-gray-50 p-2 rounded border">
                    {csvUrls.map((url, index) => (
                      <div key={index} className={`py-1 ${processingCsvIndex === index ? 'bg-blue-50' : ''}`}>
                        {index + 1}. {url.length > 60 ? url.substring(0, 60) + '...' : url}
                        {processingCsvIndex === index && (
                          <span className="ml-2 text-blue-600">Processing...</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {processedResults.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Processed {processedResults.length} funding opportunities:</p>
                    <Button
                      type="button"
                      onClick={saveAllProcessedResults}
                      disabled={isProcessing}
                      size="sm"
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
                        <>Save All Results</>
                      )}
                    </Button>
                  </div>
                  <div className="mt-1 max-h-48 overflow-y-auto text-xs bg-gray-50 p-2 rounded border">
                    {processedResults.map((result, index) => (
                      <div key={index} className="py-1 border-b last:border-b-0">
                        <div className="font-medium">{index + 1}. {result.title}</div>
                        <div className="text-gray-600">
                          {result.agency} | {result.foa_code} | {result.grant_type} | Deadline: {result.deadline}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-500 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="grant-url">Grant URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="grant-url"
                  placeholder="https://grants.nih.gov/grants/guide/pa-files/PA-25-303.html"
                  value={grantUrl}
                  onChange={handleUrlChange}
                  className="flex-1"
                  disabled={isProcessing || isBatchProcessing}
                />
                <Button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={!grantUrl.trim() || isProcessing || isBatchProcessing}
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
                Enter the URL of the funding opportunity announcement page and click "Get Data" to fetch the content.
              </p>
            </div>

            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-500 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="grant-file">Upload HTML File</Label>
              <div className="flex space-x-2">
                <Input
                  id="grant-file"
                  type="file"
                  accept=".html,text/html"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                  disabled={isProcessing || isBatchProcessing}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center"
                  disabled={isProcessing || isBatchProcessing}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {fileName ? fileName : 'Choose HTML File'}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Upload an HTML file containing the funding opportunity announcement.
              </p>
            </div>

            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-500 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="grant-text">Paste Grant Text</Label>
              <Textarea
                id="grant-text"
                placeholder="Paste the grant text here..."
                value={grantText}
                onChange={handleTextChange}
                className="min-h-[200px]"
                disabled={isProcessing || isBatchProcessing}
              />
              <p className="text-sm text-gray-500">
                Paste the text content of the funding opportunity announcement.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="saveToDatabase"
                checked={saveToDatabase}
                onChange={(e) => setSaveToDatabase(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isProcessing || isBatchProcessing}
              />
              <Label htmlFor="saveToDatabase" className="text-sm font-normal">
                Save to database after extraction
              </Label>
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
            <div className="border rounded-md overflow-hidden">
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
                        <p className="text-gray-500">No organization eligibility data available</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">User Eligibility</h4>
                    <div className="text-sm bg-slate-50 p-3 rounded border overflow-auto max-h-60">
                      {extractedData.user_eligibility ? (
                        <div className="space-y-1">
                          {Object.entries(extractedData.user_eligibility).map(([key, value]) => (
                            <div key={key} className="flex items-center">
                              <span className={`w-4 h-4 mr-2 rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex items-center justify-center text-xs`}>
                                {value ? '✓' : '✗'}
                              </span>
                              <span>{key}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No user eligibility data available</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Submission Requirements</h4>
                    <div className="text-sm bg-slate-50 p-3 rounded border overflow-auto max-h-60">
                      {extractedData.submission_requirements ? (
                        <div className="space-y-3">
                          {extractedData.submission_requirements.required_documents && (
                            <div>
                              <h5 className="font-medium text-xs uppercase text-gray-500 mb-1">Required Documents</h5>
                              <ul className="list-disc pl-5 space-y-1">
                                {Array.isArray(extractedData.submission_requirements.required_documents) ? 
                                  extractedData.submission_requirements.required_documents.map((doc, index) => (
                                    <li key={index}>{doc}</li>
                                  )) : 
                                  <li>{String(extractedData.submission_requirements.required_documents)}</li>
                                }
                              </ul>
                            </div>
                          )}
                          
                          {extractedData.submission_requirements.formats && (
                            <div>
                              <h5 className="font-medium text-xs uppercase text-gray-500 mb-1">Formats</h5>
                              <ul className="list-disc pl-5 space-y-1">
                                {Array.isArray(extractedData.submission_requirements.formats) ? 
                                  extractedData.submission_requirements.formats.map((format, index) => (
                                    <li key={index}>{format}</li>
                                  )) : 
                                  <li>{String(extractedData.submission_requirements.formats)}</li>
                                }
                              </ul>
                            </div>
                          )}
                          
                          {extractedData.submission_requirements.additional_instructions && (
                            <div>
                              <h5 className="font-medium text-xs uppercase text-gray-500 mb-1">Additional Instructions</h5>
                              <p>{extractedData.submission_requirements.additional_instructions}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">No submission requirements data available</p>
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
            <Button 
              onClick={handleExtract} 
              disabled={!grantText.trim() || isProcessing || isBatchProcessing}
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
                disabled={isProcessing || isBatchProcessing}
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
                    {saveToDatabase ? 'Save Funding Opportunity' : 'Done'}
                  </>
                )}
              </Button>
            )}
            
            {(grantText || grantUrl || fileName || csvFileName) && (
              <Button 
                onClick={clearAll} 
                variant="outline" 
                disabled={isProcessing || isBatchProcessing}
              >
                Clear
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            The AI will analyze the text and extract key information like agency, title, deadline, and requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 