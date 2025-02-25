import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/fetch-url
 * 
 * Fetches HTML content from a URL and returns it as text
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

    // Fetch the HTML content from the URL
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }
      
      const htmlContent = await response.text();
      
      // Extract only the body content from HTML
      let bodyContent = htmlContent;
      
      // Use a simple regex approach to extract text content
      // Remove scripts and styles
      bodyContent = bodyContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      return NextResponse.json({
        message: 'URL content fetched successfully',
        data: bodyContent
      });
    } catch (error) {
      console.error('Error fetching URL:', error);
      return NextResponse.json(
        { error: 'Failed to fetch URL. Please check the URL and try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
} 