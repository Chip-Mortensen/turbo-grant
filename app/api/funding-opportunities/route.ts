import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { FundingOpportunityExtractor } from '@/lib/extractors/funding-opportunity-extractor';

/**
 * POST /api/funding-opportunity
 * 
 * Extracts funding opportunity information from an uploaded HTML file
 * and stores it in the database.
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

    // Parse the form data
    const formData = await req.formData();
    const htmlFile = formData.get('htmlFile') as File;

    if (!htmlFile) {
      return NextResponse.json(
        { error: 'No HTML file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (!htmlFile.name.endsWith('.html') && !htmlFile.type.includes('html')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only HTML files are accepted.' },
        { status: 400 }
      );
    }

    // Read the file content
    const htmlContent = await htmlFile.text();

    // Extract funding opportunity information
    const extractor = new FundingOpportunityExtractor();
    const fundingOpportunity = await extractor.extractFromHtml(htmlContent);

    // Ensure grant_url is set (it might be missing in the extracted data)
    if (!fundingOpportunity.grant_url) {
      fundingOpportunity.grant_url = ''; // Set a default empty string if missing
    }

    // Log the extracted data for debugging
    console.log('Extracted funding opportunity:', JSON.stringify(fundingOpportunity, null, 2));

    // Store in database
    const { data: insertData, error: insertError } = await supabase
      .from('foas')
      .insert({
        agency: fundingOpportunity.agency,
        title: fundingOpportunity.title,
        foa_code: fundingOpportunity.foa_code,
        grant_type: fundingOpportunity.grant_type,
        description: fundingOpportunity.description,
        deadline: fundingOpportunity.deadline,
        num_awards: fundingOpportunity.num_awards,
        award_ceiling: fundingOpportunity.award_ceiling,
        award_floor: fundingOpportunity.award_floor,
        letters_of_intent: fundingOpportunity.letters_of_intent,
        preliminary_proposal: fundingOpportunity.preliminary_proposal,
        animal_trials: fundingOpportunity.animal_trials,
        human_trials: fundingOpportunity.human_trials,
        organization_eligibility: fundingOpportunity.organization_eligibility,
        user_eligibility: fundingOpportunity.user_eligibility,
        grant_url: fundingOpportunity.grant_url,
        published_date: fundingOpportunity.published_date,
        submission_requirements: fundingOpportunity.submission_requirements
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting funding opportunity:', insertError);
      
      // Check for duplicate key violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A funding opportunity with this FOA code or URL already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to store funding opportunity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Funding opportunity extracted and stored successfully',
      data: insertData
    });
  } catch (error) {
    console.error('Error processing funding opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to process funding opportunity' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/funding-opportunity
 * 
 * Retrieves funding opportunities with optional filtering.
 */
export async function GET(req: NextRequest) {
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

    // Parse query parameters
    const url = new URL(req.url);
    const agency = url.searchParams.get('agency');
    const grantType = url.searchParams.get('grant_type');
    const deadlineAfter = url.searchParams.get('deadline_after');
    const deadlineBefore = url.searchParams.get('deadline_before');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('foas')
      .select('*')
      .order('deadline', { ascending: true })
      .limit(limit)
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (agency) {
      query = query.eq('agency', agency);
    }
    
    if (grantType) {
      query = query.eq('grant_type', grantType);
    }
    
    if (deadlineAfter) {
      query = query.gte('deadline', deadlineAfter);
    }
    
    if (deadlineBefore) {
      query = query.lte('deadline', deadlineBefore);
    }

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching funding opportunities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch funding opportunities' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching funding opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funding opportunities' },
      { status: 500 }
    );
  }
} 