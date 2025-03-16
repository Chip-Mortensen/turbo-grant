/**
 * PDF processing utilities
 * 
 * This module provides functions for extracting text from PDF files.
 * It includes a patched version of pdf-parse that prevents it from loading test files,
 * which is necessary for serverless environments.
 */

// Patch the fs module to prevent pdf-parse from looking for test files
if (typeof process !== 'undefined') {
  try {
    // Only run this in Node.js environment
    const fs = require('fs');
    const originalReadFileSync = fs.readFileSync;
    
    // Override readFileSync to handle the test file path
    fs.readFileSync = function(path: string, options: any) {
      // If it's trying to access the test file, return an empty buffer
      if (typeof path === 'string' && 
          (path.includes('test/data/05-versions-space.pdf') || 
           path.includes('test/data'))) {
        console.log('Intercepted attempt to read test file:', path);
        return Buffer.from('');
      }
      // Otherwise, use the original implementation
      return originalReadFileSync(path, options);
    };
    
    console.log('Patched fs.readFileSync to handle pdf-parse test files');
  } catch (error) {
    console.error('Failed to patch fs module:', error);
  }
}

export interface PdfExtractResult {
  text: string;
  pages: {
    pageNumber: number;
    text: string;
    startIndex: number;
    endIndex: number;
  }[];
}

/**
 * Extract text from a PDF buffer
 * 
 * @param buffer - PDF file as Buffer
 * @returns Extracted text from the PDF
 */
export async function getTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    console.log('Parsing PDF with size:', buffer.length);
    
    // Dynamically import pdf-parse to avoid issues in browser environments
    const pdfParse = (await import('pdf-parse')).default;
    
    // Note: pdf-parse uses the deprecated Buffer() constructor internally
    // This will show a deprecation warning in Node.js, but it's from the library, not our code
    // To suppress this warning in production, set NODE_OPTIONS="--no-deprecation" in your environment
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text content extracted from PDF');
    }
    
    console.log('Successfully extracted text from PDF, length:', data.text.length);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

/**
 * Extract text from a PDF buffer with page information
 * 
 * @param buffer - PDF file as Buffer
 * @returns Extracted text and page information
 */
export async function getTextFromPdfWithPages(buffer: Buffer): Promise<PdfExtractResult> {
  try {
    console.log('Parsing PDF with size:', buffer.length);
    
    // Use pdf-parse with a custom render function to extract text per page
    const pdfParse = (await import('pdf-parse')).default;
    
    // Array to store text for each page
    const pageTexts: string[] = [];
    let currentPage = 0;
    
    // Custom render function to extract text per page
    const renderOptions = {
      pagerender: function(pageData: any) {
        // Track the current page
        currentPage = pageData.pageNumber;
        
        // Ensure we have an array slot for this page
        while (pageTexts.length < currentPage) {
          pageTexts.push('');
        }
        
        // Extract text content from the page
        return pageData.getTextContent()
          .then(function(textContent: any) {
            let lastY: number | null = null;
            let text = '';
            
            // Process each text item
            for (const item of textContent.items) {
              if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                text += '\n';
              }
              
              text += item.str;
              lastY = item.transform[5];
            }
            
            // Store the text for this page
            pageTexts[currentPage - 1] = text;
            
            // Return the text (required by pdf-parse)
            return text;
          });
      }
    };
    
    // Parse the PDF with our custom render function
    const data = await pdfParse(buffer, renderOptions);
    const pageCount = data.numpages || 1;
    
    console.log(`PDF has ${pageCount} pages, extracted ${pageTexts.length} pages of text`);
    
    // Clean and process each page's text
    const cleanedPageTexts = pageTexts.map(text => cleanTextContent(text || ''));
    
    // Build the full text and page info
    const pages: PdfExtractResult['pages'] = [];
    let fullText = '';
    let currentIndex = 0;
    
    for (let i = 0; i < cleanedPageTexts.length; i++) {
      // Skip empty pages
      if (!cleanedPageTexts[i] || cleanedPageTexts[i].trim().length === 0) {
        continue;
      }
      
      const startIndex = currentIndex;
      const endIndex = startIndex + cleanedPageTexts[i].length;
      
      pages.push({
        pageNumber: i + 1,
        text: cleanedPageTexts[i],
        startIndex,
        endIndex
      });
      
      // Add to the full text with a space between pages
      if (currentIndex > 0) {
        fullText += ' ';
        currentIndex += 1;
      }
      
      fullText += cleanedPageTexts[i];
      currentIndex = fullText.length;
    }
    
    console.log(`Successfully extracted text from PDF: ${fullText.length} characters across ${pages.length} pages`);
    
    // If we couldn't extract any pages, fall back to simple extraction
    if (pages.length === 0) {
      console.warn('No pages extracted, falling back to simple extraction');
      return fallbackPdfParse(buffer, data);
    }
    
    return {
      text: fullText,
      pages
    };
  } catch (error) {
    console.error('Error in PDF extraction:', error);
    console.warn('Falling back to simple extraction');
    return fallbackPdfParse(buffer);
  }
}

/**
 * Fallback method using simple pdf-parse when page extraction fails
 */
async function fallbackPdfParse(buffer: Buffer, existingData?: any): Promise<PdfExtractResult> {
  try {
    // Use existing data if provided, otherwise parse the PDF again
    let data;
    if (existingData) {
      data = existingData;
    } else {
      const pdfParse = (await import('pdf-parse')).default;
      data = await pdfParse(buffer);
    }
    
    const pageCount = data.numpages || 1;
    
    // Clean the text
    const cleanedText = cleanTextContent(data.text);
    
    // Create page info objects with simple division
    const pages: PdfExtractResult['pages'] = [];
    const avgPageLength = Math.ceil(cleanedText.length / pageCount);
    
    for (let i = 0; i < pageCount; i++) {
      const startIndex = i * avgPageLength;
      const endIndex = Math.min((i + 1) * avgPageLength, cleanedText.length);
      const pageText = cleanedText.substring(startIndex, endIndex);
      
      pages.push({
        pageNumber: i + 1,
        text: pageText,
        startIndex,
        endIndex
      });
    }
    
    console.log(`Fallback: extracted ${cleanedText.length} characters across ${pages.length} pages`);
    return {
      text: cleanedText,
      pages
    };
  } catch (error) {
    console.error('Error in fallback PDF parsing:', error);
    throw error instanceof Error 
      ? new Error(`Failed to extract text from PDF: ${error.message}`)
      : new Error('Unknown error in fallback PDF parsing');
  }
}

/**
 * Clean and normalize text content extracted from PDF
 */
function cleanTextContent(text: string): string {
  // Make sure we have a string, not an object
  if (typeof text !== 'string') {
    console.warn('Extracted text is not a string, converting to string');
    text = String(text);
    
    // Remove object notation if present
    text = text.replace(/\[object Object\]/g, '');
    text = text.replace(/\{\s*\}/g, '');
  }
  
  // Replace multiple spaces with a single space
  text = text.replace(/\s+/g, ' ');
  
  // Fix common PDF extraction issues
  // 1. Fix hyphenated words at line breaks (common in PDFs)
  text = text.replace(/(\w+)-\s+(\w+)/g, '$1$2');
  
  // 2. Ensure proper spacing after periods, question marks, and exclamation points
  text = text.replace(/([.!?])\s*(\w)/g, '$1 $2');
  
  // 3. Remove excessive newlines but preserve paragraph breaks
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // 4. Ensure paragraphs have proper spacing
  text = text.replace(/\n\n/g, '\n\n');
  
  return text.trim();
} 