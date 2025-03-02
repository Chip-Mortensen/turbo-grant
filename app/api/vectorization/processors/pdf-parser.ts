/**
 * Custom PDF parser that uses pdf-parse but prevents it from loading test files
 * This is necessary because pdf-parse tries to load test files during initialization
 * which causes issues in serverless environments
 * 
 * Note: The Buffer() deprecation warning (DEP0005) comes from the pdf-parse library itself.
 * In production, you can suppress this warning by setting the NODE_OPTIONS environment variable:
 * NODE_OPTIONS="--no-deprecation" or NODE_OPTIONS="--no-warnings"
 * 
 * For Vercel deployments, this can be set in the project settings under "Environment Variables".
 * The warning doesn't affect functionality and can be safely ignored.
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
        // Use Buffer.from() with an empty array instead of empty string
        return Buffer.from(new Uint8Array(0));
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
    // Create a wrapper function to import pdf-parse
    // This isolates the deprecation warnings to this function call
    const importPdfParse = async () => {
      // We can't directly suppress the warning, but we can isolate it
      return (await import('pdf-parse')).default;
    };
    
    // Import pdf-parse
    const pdfParse = await importPdfParse();
    
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

// Note: The Buffer() deprecation warning is coming from the pdf-parse library itself
// and can't be completely suppressed without modifying the library.
// However, the warning doesn't affect functionality and can be safely ignored. 