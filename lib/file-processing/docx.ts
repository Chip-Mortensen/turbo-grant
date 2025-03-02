/**
 * DOCX processing utilities
 * 
 * This module provides functions for extracting text from DOCX files.
 */

/**
 * Extract text from a DOCX buffer
 * 
 * @param buffer - DOCX file as Buffer
 * @returns Extracted text from the DOCX
 */
export async function getTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    console.log('Parsing DOCX with size:', buffer.length);
    
    // Dynamically import mammoth to avoid issues in browser environments
    const mammoth = (await import('mammoth'));
    
    // Extract raw text from the DOCX file
    const result = await mammoth.extractRawText({ buffer });
    
    // Check for warnings
    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth warnings:', result.messages);
    }
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No text content extracted from DOCX');
    }
    
    console.log('Successfully extracted text from DOCX, length:', result.value.length);
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw error;
  }
} 