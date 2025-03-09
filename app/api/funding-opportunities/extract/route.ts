import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { FundingOpportunityExtractor } from '@/lib/extractors/funding-opportunity-extractor';

/**
 * POST /api/funding-opportunities/extract
 * 
 * Fetches content from a URL and extracts funding opportunity information
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
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Extract funding opportunity information directly from URL
    const extractor = new FundingOpportunityExtractor();
    const fundingOpportunity = await extractor.extractFromUrl(url);

    // Set the grant_url field to the provided URL if not already set
    if (fundingOpportunity && !fundingOpportunity.grant_url) {
      fundingOpportunity.grant_url = url;
    }

    return NextResponse.json({
      message: 'Funding opportunity information extracted successfully',
      data: fundingOpportunity
    });
  } catch (error) {
    console.error('Error extracting funding opportunity information:', error);
    
    return NextResponse.json(
      { error: 'Failed to extract funding opportunity information. Please try again.' },
      { status: 500 }
    );
  }
} 