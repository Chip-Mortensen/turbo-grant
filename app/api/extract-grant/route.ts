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
    
    // Simplified error handling - just return a generic error message
    return NextResponse.json(
      { error: 'Failed to extract funding opportunity information. Please try again.' },
      { status: 500 }
    );
  }
} 