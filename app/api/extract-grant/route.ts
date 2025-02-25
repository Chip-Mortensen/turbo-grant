import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { FundingOpportunityExtractor } from '@/lib/funding-opportunity-extractor';

/**
 * POST /api/extract-grant
 * 
 * Extracts funding opportunity information from text content
 */
export async function POST(req: NextRequest) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Extract funding opportunity information
    const extractor = new FundingOpportunityExtractor();
    
    // Create a simple HTML wrapper for the text to use the existing extraction logic
    const htmlContent = `<html><body>${text}</body></html>`;
    const fundingOpportunity = await extractor.extractFromHtml(htmlContent);

    return NextResponse.json({
      message: 'Funding opportunity information extracted successfully',
      data: fundingOpportunity
    });
  } catch (error) {
    console.error('Error extracting funding opportunity information:', error);
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to extract funding opportunity information';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Missing required field')) {
        errorMessage = `${error.message}. Please provide more complete grant text.`;
        statusCode = 422; // Unprocessable Entity
      } else if (error.message.includes('No content returned from OpenAI')) {
        errorMessage = 'The AI service could not process this text. Please try with different content.';
        statusCode = 502; // Bad Gateway
      } else if (error.message.includes('Failed to parse')) {
        errorMessage = 'Could not parse the extracted information. Please try with clearer grant text.';
        statusCode = 422; // Unprocessable Entity
      } else {
        // Include the original error message for other cases
        errorMessage = `Extraction failed: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 