import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { FundingOpportunityExtractor } from '@/lib/funding-opportunity-extractor';

/**
 * POST /api/extract-grant
 * 
 * Extracts funding opportunity information from text content or URL
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
    const { text, url } = body;

    // Check if either text or URL is provided
    if (!text && !url) {
      return NextResponse.json(
        { error: 'No text or URL provided' },
        { status: 400 }
      );
    }

    // Extract funding opportunity information
    const extractor = new FundingOpportunityExtractor();
    let fundingOpportunity;
    
    if (url) {
      // Extract from URL
      fundingOpportunity = await extractor.extractFromUrl(url);
      
      // Set the grant_url field to the provided URL
      if (fundingOpportunity && !fundingOpportunity.grant_url) {
        fundingOpportunity.grant_url = url;
      }
    } else {
      // Create a simple HTML wrapper for the text to use the existing extraction logic
      const htmlContent = `<html><body>${text}</body></html>`;
      fundingOpportunity = await extractor.extractFromHtml(htmlContent);
      
      // If URL was provided alongside text, use it for the grant_url
      if (url && fundingOpportunity && !fundingOpportunity.grant_url) {
        fundingOpportunity.grant_url = url;
      }
    }

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