'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileSpreadsheet, Upload, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from '@/utils/supabase/client';

interface ProcessCsvProps {
  projectId?: string;
  onSuccess?: (data: any) => void;
}

type UploadType = 'NIH' | 'NSF';

// Define the expected columns for each agency
const NIH_REQUIRED_COLUMNS = [
  'Title', 'Release_Date', 'Expired_Date', 'Activity_Code', 'Parent_Organization', 
  'Organization', 'Participating_Orgs', 'Document_Number', 'Document_Type', 
  'Clinical_Trials', 'URL'
];

const NSF_REQUIRED_COLUMNS = [
  'Title', 'Synopsis', 'Award Type', 'Next due date (Y-m-d)', 
  'Proposals accepted anytime', 'Program ID', 'NSF/PD Num', 'Status', 
  'Posted date (Y-m-d)', 'URL', 'Type', 'Solicitation URL'
];

// Define the structure for processed FOA data
interface ProcessedFoa {
  agency: 'NIH' | 'NSF';
  title: string;
  foa_code: string;
  grant_url: string | null;
}

export default function ProcessCsv({ projectId, onSuccess }: ProcessCsvProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [processedData, setProcessedData] = useState<ProcessedFoa[]>([]);
  const [newRecords, setNewRecords] = useState<ProcessedFoa[]>([]);
  const [existingFoaCodes, setExistingFoaCodes] = useState<string[]>([]);
  const [existingGrantUrls, setExistingGrantUrls] = useState<string[]>([]);
  const [skippedRecords, setSkippedRecords] = useState<{reason: string, count: number}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>('NSF');
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Fetch existing FOA codes when component mounts
  useEffect(() => {
    fetchExistingFoaCodes();
  }, []);

  // Fetch existing FOA codes from the database
  const fetchExistingFoaCodes = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      // Fetch both foa_codes and grant_urls in parallel
      const [foaResult, urlResult] = await Promise.all([
        supabase.from('foas').select('foa_code'),
        supabase.from('foas').select('grant_url')
      ]);
      
      if (foaResult.error) {
        throw foaResult.error;
      }
      
      if (urlResult.error) {
        throw urlResult.error;
      }
      
      if (foaResult.data) {
        const codes = foaResult.data.map(item => item.foa_code);
        setExistingFoaCodes(codes);
      }
      
      if (urlResult.data) {
        const urls = urlResult.data
          .map(item => item.grant_url)
          .filter(url => url && url.trim() !== ''); // Filter out empty URLs
        setExistingGrantUrls(urls);
      }
    } catch (err) {
      console.error('Error fetching existing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter processed data to find new records
  const filterNewRecords = (processed: ProcessedFoa[]) => {
    // Track URLs we've seen in this batch to avoid duplicates
    const seenUrls = new Set<string>();
    let skippedExistingFoa = 0;
    let skippedExistingUrl = 0;
    let skippedDuplicateUrl = 0;
    let skippedMissingUrl = 0;
    
    const newItems = processed.filter(item => {
      // Skip records with missing URLs
      if (!item.grant_url) {
        skippedMissingUrl++;
        return false;
      }
      
      // Skip if FOA code already exists in database
      if (item.foa_code && existingFoaCodes.includes(item.foa_code)) {
        skippedExistingFoa++;
        return false;
      }
      
      // Skip if URL already exists in database
      const normalizedUrl = normalizeUrl(item.grant_url || '');
      if (!normalizedUrl) {
        skippedMissingUrl++;
        return false;
      }
      
      if (normalizedUrl && existingGrantUrls.includes(normalizedUrl)) {
        console.warn(`Skipping record with duplicate URL in database: ${normalizedUrl}`);
        skippedExistingUrl++;
        return false;
      }
      
      // Check if URL already exists in this batch
      if (normalizedUrl && seenUrls.has(normalizedUrl)) {
        console.warn(`Skipping record with duplicate URL in batch: ${normalizedUrl}`);
        skippedDuplicateUrl++;
        return false;
      }
      
      // Add URL to seen set if it's not null
      if (normalizedUrl) {
        seenUrls.add(normalizedUrl);
      }
      
      return true;
    });
    
    // Update skipped records
    setSkippedRecords(prev => {
      const updated = [...prev];
      if (skippedExistingFoa > 0) {
        updated.push({ reason: 'FOA code already in database', count: skippedExistingFoa });
      }
      if (skippedExistingUrl > 0) {
        updated.push({ reason: 'URL already in database', count: skippedExistingUrl });
      }
      if (skippedDuplicateUrl > 0) {
        updated.push({ reason: 'Duplicate URL in filtered records', count: skippedDuplicateUrl });
      }
      if (skippedMissingUrl > 0) {
        updated.push({ reason: 'Missing or invalid URL', count: skippedMissingUrl });
      }
      return updated;
    });
    
    setNewRecords(newItems);
  };

  const processFile = async (file: File) => {
    // Check if it's a CSV file
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file.');
      return;
    }

    setCsvFile(file);
    setCsvFileName(file.name);
    setError(null);
    setMissingColumns([]);
    setProcessedData([]);
    setNewRecords([]);
    
    try {
      const text = await file.text();
      parseCSV(text);
    } catch (err) {
      setError('Failed to read the CSV file.');
      console.error(err);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    // Process only the first file if multiple files are dropped
    await processFile(files[0]);
  };

  const parseCSV = (csvData: string) => {
    try {
      // Split the CSV into lines
      const allLines = csvData.split(/\r?\n/);
      
      if (allLines.length === 0) {
        setError('The CSV file appears to be empty.');
        return;
      }

      // Parse header row
      const headerLine = allLines[0];
      const headerFields = parseCSVLine(headerLine);
      setHeaders(headerFields);
      
      // Check for required columns based on upload type
      const requiredColumns = uploadType === 'NIH' ? NIH_REQUIRED_COLUMNS : NSF_REQUIRED_COLUMNS;
      const missing = requiredColumns.filter(col => !headerFields.includes(col));
      
      if (missing.length > 0) {
        setMissingColumns(missing);
        setError(`Missing ${missing.length} required columns for ${uploadType} CSV.`);
        // Still continue processing to show what we have
      }
      
      // First, let's try to identify complete rows by checking if they have the same number of fields as the header
      const expectedColumnCount = headerFields.length;
      let processedLines: string[] = [];
      let currentLine = '';
      
      for (let i = 1; i < allLines.length; i++) {
        const line = allLines[i].trim();
        if (line === '') continue; // Skip empty lines
        
        // If the current line is empty, start with this line
        if (currentLine === '') {
          currentLine = line;
        } else {
          // Otherwise, append this line to the current line
          currentLine += ' ' + line;
        }
        
        // Check if we have a complete row
        const fields = parseCSVLine(currentLine);
        if (fields.length >= expectedColumnCount) {
          // This is a complete row
          processedLines.push(currentLine);
          currentLine = ''; // Reset for the next row
        }
        // If not a complete row, continue accumulating lines
      }
      
      // Add any remaining partial row
      if (currentLine !== '') {
        processedLines.push(currentLine);
      }
      
      // Parse the processed lines into data rows
      const dataRows = processedLines.map(line => parseCSVLine(line));
      setRows(dataRows);
      
      // Process the data to match the foas table structure
      if (headerFields.length > 0 && dataRows.length > 0) {
        processRows(headerFields, dataRows);
      }
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setError(`Failed to parse the CSV file: ${(err as Error).message}`);
    }
  };

  // Process rows to match the foas table structure
  const processRows = (headers: string[], rows: string[][]) => {
    try {
      const processed: ProcessedFoa[] = [];
      const seenFoaCodes = new Set<string>();
      const seenUrls = new Set<string>();
      let skippedDuplicateFoa = 0;
      let skippedDuplicateUrl = 0;
      let skippedMissingTitle = 0;
      let skippedMissingUrl = 0;
      
      // Get column indices based on the requirements
      const titleIndex = headers.indexOf('Title');
      
      // Different column mappings based on agency
      let foaCodeIndex: number;
      let urlIndex: number;
      
      if (uploadType === 'NIH') {
        foaCodeIndex = headers.indexOf('Document_Number');
        urlIndex = headers.indexOf('URL');
      } else { // NSF
        foaCodeIndex = headers.indexOf('NSF/PD Num');
        urlIndex = headers.indexOf('Solicitation URL');
      }
      
      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Make sure we have all required columns
        if (titleIndex === -1 || foaCodeIndex === -1 || urlIndex === -1) {
          break;
        }
        
        // Make sure the row has enough columns
        if (Math.max(titleIndex, foaCodeIndex, urlIndex) >= row.length) {
          continue;
        }
        
        const title = row[titleIndex]?.trim() || '';
        const foa_code = row[foaCodeIndex]?.trim() || '';
        let grant_url: string | null = row[urlIndex]?.trim() || '';
        
        // Skip rows with missing essential data
        if (!title) {
          skippedMissingTitle++;
          continue;
        }
        
        // Skip duplicate FOA codes within the current batch
        if (foa_code && seenFoaCodes.has(foa_code)) {
          console.warn(`Skipping duplicate FOA code in CSV: ${foa_code}`);
          skippedDuplicateFoa++;
          continue;
        }
        
        // Normalize the URL
        grant_url = normalizeUrl(grant_url);
        
        // Skip records with missing or invalid URLs
        if (!grant_url) {
          console.warn(`Skipping record with missing or invalid URL: ${row[urlIndex]}`);
          skippedMissingUrl++;
          continue;
        }
        
        // Skip duplicate URLs within the current batch
        if (grant_url && seenUrls.has(grant_url)) {
          console.warn(`Skipping duplicate URL in CSV: ${grant_url}`);
          skippedDuplicateUrl++;
          continue;
        }
        
        // Add to seen sets
        if (foa_code) seenFoaCodes.add(foa_code);
        if (grant_url) seenUrls.add(grant_url);
        
        processed.push({
          agency: uploadType,
          title,
          foa_code,
          grant_url
        });
      }
      
      // Track skipped records
      const skipped = [];
      if (skippedMissingTitle > 0) {
        skipped.push({ reason: 'Missing title', count: skippedMissingTitle });
      }
      if (skippedDuplicateFoa > 0) {
        skipped.push({ reason: 'Duplicate FOA code in CSV', count: skippedDuplicateFoa });
      }
      if (skippedDuplicateUrl > 0) {
        skipped.push({ reason: 'Duplicate URL in CSV', count: skippedDuplicateUrl });
      }
      if (skippedMissingUrl > 0) {
        skipped.push({ reason: 'Missing or invalid URL', count: skippedMissingUrl });
      }
      setSkippedRecords(skipped);
      
      setProcessedData(processed);
      // Filter for new records
      filterNewRecords(processed);
    } catch (err) {
      console.error('Error processing rows:', err);
      setError(`Failed to process the CSV data: ${(err as Error).message}`);
    }
  };

  // A more robust CSV line parser that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    // If the line is empty, return an empty array
    if (!line || line.trim() === '') {
      return [];
    }
    
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Handle quotes
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Double quotes inside quotes - add a single quote
          current += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        // Add character to current field
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  };

  // Helper function to normalize and validate URLs
  const normalizeUrl = (url: string): string | null => {
    if (!url || url.trim() === '') {
      return null; // Return null instead of empty string
    }
    
    let normalizedUrl = url.trim();
    
    try {
      // Check if it's already a valid URL
      new URL(normalizedUrl);
      return normalizedUrl;
    } catch (e) {
      // Not a valid URL, try adding https://
      try {
        new URL(`https://${normalizedUrl}`);
        return `https://${normalizedUrl}`;
      } catch (e2) {
        // Still not valid
        console.warn(`Invalid URL: ${normalizedUrl}`);
        return null; // Return null instead of empty string
      }
    }
  };

  // Check if a URL is valid and not empty
  const isValidUrl = (url: string | null): boolean => {
    if (!url || url.trim() === '') return false;
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      try {
        new URL(`https://${url}`);
        return true;
      } catch (e2) {
        return false;
      }
    }
  };

  const saveToDatabase = async () => {
    if (newRecords.length === 0) {
      setError("No new records to save. All records already exist in the database.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // First, refresh our list of existing FOA codes and URLs to ensure we have the latest data
      const supabase = createClient();
      
      // Fetch the latest data from the database
      const [foaResult, urlResult] = await Promise.all([
        supabase.from('foas').select('foa_code'),
        supabase.from('foas').select('grant_url')
      ]);
      
      if (foaResult.error) throw foaResult.error;
      if (urlResult.error) throw urlResult.error;
      
      // Update our local state with the latest data
      const latestFoaCodes = foaResult.data?.map(item => item.foa_code) || [];
      const latestGrantUrls = urlResult.data?.map(item => item.grant_url).filter(url => url && url.trim() !== '') || [];
      
      // Re-filter our records to ensure we're not trying to insert duplicates
      const trulyNewRecords = newRecords.filter(item => {
        // Skip records with missing URLs
        if (!item.grant_url) {
          console.warn(`Skipping record with missing URL`);
          return false;
        }
        
        // Skip if FOA code already exists in database
        if (item.foa_code && latestFoaCodes.includes(item.foa_code)) {
          console.warn(`Skipping record with FOA code already in database: ${item.foa_code}`);
          return false;
        }
        
        // Skip if URL already exists in database
        const normalizedUrl = normalizeUrl(item.grant_url || '');
        if (!normalizedUrl) {
          console.warn(`Skipping record with invalid URL: ${item.grant_url}`);
          return false;
        }
        
        if (normalizedUrl && latestGrantUrls.includes(normalizedUrl)) {
          console.warn(`Skipping record with URL already in database: ${normalizedUrl}`);
          return false;
        }
        
        return true;
      });
      
      if (trulyNewRecords.length === 0) {
        setError("After re-checking, all records already exist in the database.");
        setIsSaving(false);
        return;
      }
      
      // Validate URLs and prepare the data for insertion
      const foasToInsert = trulyNewRecords.map(item => {
        const normalizedUrl = normalizeUrl(item.grant_url || '');
        
        return {
          agency: item.agency,
          title: item.title,
          foa_code: item.foa_code,
          grant_url: normalizedUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      // Process in batches of 5 records to avoid potential size limits
      const BATCH_SIZE = 5;
      let successCount = 0;
      let errors = [];
      
      // Use a Set to track URLs we've already inserted in this session
      // to avoid duplicate key errors within our own batches
      const insertedUrls = new Set<string>();
      
      for (let i = 0; i < foasToInsert.length; i += BATCH_SIZE) {
        // Filter out any records with URLs we've already inserted in previous batches
        const batchCandidates = foasToInsert.slice(i, i + BATCH_SIZE);
        const batch = batchCandidates.filter(item => {
          if (!item.grant_url) return true; // Allow records with null URLs
          if (insertedUrls.has(item.grant_url)) {
            console.warn(`Skipping record with URL already inserted in this session: ${item.grant_url}`);
            return false;
          }
          return true;
        });
        
        if (batch.length === 0) continue;
        
        try {
          const { data, error } = await supabase
            .from('foas')
            .insert(batch)
            .select();
          
          if (error) {
            console.error(`Batch ${Math.floor(i/BATCH_SIZE) + 1} error:`, error);
            errors.push(`Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message || JSON.stringify(error)}`);
          } else {
            successCount += (data?.length || 0);
            // Add successfully inserted URLs to our tracking set
            data?.forEach(item => {
              if (item.grant_url) insertedUrls.add(item.grant_url);
            });
          }
        } catch (batchErr) {
          console.error(`Batch ${Math.floor(i/BATCH_SIZE) + 1} exception:`, batchErr);
          errors.push(`Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`);
        }
      }
      
      // Handle overall results
      if (errors.length > 0) {
        if (successCount > 0) {
          // Partial success
          setSaveSuccess(true);
          setSaveError(`Partially successful: ${successCount} records saved, but encountered errors: ${errors.join('; ')}`);
        } else {
          // Complete failure
          throw new Error(`Failed to save records: ${errors.join('; ')}`);
        }
      } else {
        // Complete success
        setSaveSuccess(true);
      }
      
      // Update existing FOA codes
      await fetchExistingFoaCodes();
      
      // Call the onSuccess callback if provided
      if (onSuccess && successCount > 0) {
        onSuccess({ count: successCount });
      }
    } catch (err) {
      console.error('Error saving to database:', err);
      // Try to get more information about the error
      if (err instanceof Error) {
        setSaveError(`${err.message}\n${err.stack || 'No stack trace available'}`);
      } else if (typeof err === 'object' && err !== null) {
        setSaveError(`Error object: ${JSON.stringify(err, null, 2)}`);
      } else {
        setSaveError(String(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const clearAll = () => {
    setCsvFile(null);
    setCsvFileName(null);
    setHeaders([]);
    setRows([]);
    setProcessedData([]);
    setNewRecords([]);
    setSkippedRecords([]);
    setError(null);
    setMissingColumns([]);
    setSaveSuccess(false);
    setSaveError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4">
      <Card className="mb-4">
        <CardContent className="pt-6 pb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Select Grant Source</h3>
            
            <div>
              {/* Toggle Switch Container */}
              <div 
                className="w-48 h-10 bg-gray-200 rounded-full p-1 cursor-pointer"
                onClick={() => setUploadType(uploadType === 'NSF' ? 'NIH' : 'NSF')}
              >
                {/* Sliding Toggle */}
                <div 
                  className={`h-8 w-[calc(50%-4px)] bg-white rounded-full shadow-md transition-all duration-300 ease-in-out flex items-center justify-center ${
                    uploadType === 'NSF' ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'
                  }`}
                >
                  <span className="font-medium text-sm">{uploadType}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div 
        ref={dropZoneRef}
        className={`p-6 border-2 border-dashed rounded-md transition-colors ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex flex-col items-center text-center">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <h3 className="text-lg font-medium">Drag & Drop your {uploadType} CSV file here</h3>
            <p className="text-sm text-gray-500 mt-1">
              or click the button below to browse files
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Choose CSV File
            </Button>
            
            {csvFileName && (
              <Button 
                onClick={clearAll} 
                variant="outline" 
                size="sm"
              >
                Clear
              </Button>
            )}
          </div>
          
          {csvFileName && (
            <div className="mt-2 text-sm font-medium text-green-600">
              File loaded: {csvFileName}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {missingColumns.length > 0 && (
        <Alert variant="destructive" className="mb-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Required Columns</AlertTitle>
          <AlertDescription>
            <p>The following required columns are missing from your CSV:</p>
            <ul className="list-disc pl-5 mt-2">
              {missingColumns.map((col, index) => (
                <li key={index}>{col}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {processedData.length > 0 && (
        <div className="mt-4 mb-4">
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <AlertTitle>CSV Processed Successfully</AlertTitle>
            <AlertDescription>
              {processedData.length} records have been processed. {newRecords.length} are new records not in the database.
              {skippedRecords.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Skipped records:</p>
                  <ul className="list-disc pl-5">
                    {skippedRecords.map((item, index) => (
                      <li key={index}>{item.count} due to {item.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {rows.length > 0 && (
        <div className="mt-4 flex-1 overflow-hidden border rounded-md">
          <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
            <h3 className="font-medium">CSV Contents ({rows.length} rows)</h3>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {processedData.length} valid records found
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto" style={{ maxHeight: '300px' }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="bg-gray-100">
                  <th className="p-2 text-left text-sm font-medium">#</th>
                  {headers.map((header, index) => (
                    <th key={index} className="p-2 text-left text-sm font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-2 text-sm">
                        {cell.length > 50 ? `${cell.substring(0, 50)}...` : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {saveSuccess && (
        <div className="mt-4 mb-4">
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              {newRecords.length} new records have been saved to the database.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {saveError && (
        <Alert variant="destructive" className="mb-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error saving to database</AlertTitle>
          <AlertDescription>
            <div className="max-h-40 overflow-y-auto">
              {saveError}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {processedData.length > 0 && (
        <div className="mt-4 flex-1 overflow-hidden border rounded-md">
          <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
            <h3 className="font-medium">Processed Data ({processedData.length} records)</h3>
          </div>
          
          <div className="overflow-x-auto" style={{ maxHeight: '300px' }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="bg-gray-100">
                  <th className="p-2 text-left text-sm font-medium">#</th>
                  <th className="p-2 text-left text-sm font-medium">Agency</th>
                  <th className="p-2 text-left text-sm font-medium">Title</th>
                  <th className="p-2 text-left text-sm font-medium">FOA Code</th>
                  <th className="p-2 text-left text-sm font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">{index + 1}</td>
                    <td className="p-2 text-sm">{item.agency}</td>
                    <td className="p-2 text-sm">{item.title}</td>
                    <td className="p-2 text-sm">{item.foa_code}</td>
                    <td className="p-2 text-sm">
                      {item.grant_url ? (
                        <a href={item.grant_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {item.grant_url}
                        </a>
                      ) : (
                        <span className="text-gray-400">No URL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {newRecords.length > 0 && (
        <div className="mt-4 flex-1 overflow-hidden border rounded-md">
          <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
            <h3 className="font-medium">New Records ({newRecords.length} records)</h3>
            
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="default"
                onClick={saveToDatabase}
                disabled={isSaving || newRecords.length === 0 || saveSuccess}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to Database'
                )}
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto" style={{ maxHeight: '300px' }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="bg-gray-100">
                  <th className="p-2 text-left text-sm font-medium">#</th>
                  <th className="p-2 text-left text-sm font-medium">Agency</th>
                  <th className="p-2 text-left text-sm font-medium">Title</th>
                  <th className="p-2 text-left text-sm font-medium">FOA Code</th>
                  <th className="p-2 text-left text-sm font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {newRecords.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">{index + 1}</td>
                    <td className="p-2 text-sm">{item.agency}</td>
                    <td className="p-2 text-sm">{item.title}</td>
                    <td className="p-2 text-sm">{item.foa_code}</td>
                    <td className="p-2 text-sm">
                      {item.grant_url ? (
                        <a href={item.grant_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {item.grant_url}
                        </a>
                      ) : (
                        <span className="text-gray-400">No URL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 