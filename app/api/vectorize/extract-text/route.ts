import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTextFromPdfWithPages } from '@/lib/file-processing';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Convert the file to a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from the PDF with page information
    const extractResult = await getTextFromPdfWithPages(buffer);
    const { text, pages } = extractResult;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF' },
        { status: 400 }
      );
    }

    // Final cleaning of the text
    const cleanedText = text.trim();
    
    // Log a sample of the extracted text for debugging
    console.log('Extracted text sample:', cleanedText.substring(0, 200) + '...');
    console.log(`Extracted ${pages.length} pages from PDF`);

    // Return only the necessary page information (no text content in pages)
    return NextResponse.json({ 
      text: cleanedText,
      pages: pages.map((page) => ({
        pageNumber: page.pageNumber,
        startIndex: page.startIndex,
        endIndex: page.endIndex
      }))
    });
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return NextResponse.json(
      { error: `Failed to extract text: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 