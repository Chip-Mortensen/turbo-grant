/**
 * Plain text processing utilities
 * 
 * This module provides functions for handling plain text files.
 */

/**
 * Extract text from a plain text buffer
 * 
 * @param buffer - Text file as Buffer
 * @returns Extracted text from the file
 */
export function getTextFromTxt(buffer: Buffer): string {
  try {
    console.log('Processing plain text file with size:', buffer.length);
    
    // Convert buffer to string
    const text = buffer.toString('utf-8');
    
    if (!text || text.trim().length === 0) {
      throw new Error('No content in text file');
    }
    
    console.log('Successfully processed text file, length:', text.length);
    return text;
  } catch (error) {
    console.error('Error processing text file:', error);
    throw error;
  }
} 