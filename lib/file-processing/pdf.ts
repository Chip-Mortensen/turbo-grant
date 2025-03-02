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