/**
 * Custom PDF parser that uses pdf-parse but prevents it from loading test files
 * This is necessary because pdf-parse tries to load test files during initialization
 * which causes issues in serverless environments
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
 * Parse a PDF buffer and extract text
 * @param buffer PDF file as Buffer
 * @returns Extracted text from the PDF
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamically import pdf-parse
    const pdfParse = (await import('pdf-parse')).default;
    
    // Set options to prevent loading test files
    const options = {
      max: 0, // Parse all pages
      // Explicitly set the path to the buffer we're providing
      pdfPath: 'memory-buffer.pdf'
    };
    
    const data = await pdfParse(buffer, options);
    
    console.log(`PDF parsed with ${data.numpages} pages, ${data.text.length} characters`);
    return data.text;
  } catch (error) {
    console.error('Error in custom PDF parser:', error);
    throw error;
  }
} 