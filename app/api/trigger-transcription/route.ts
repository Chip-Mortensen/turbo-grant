import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { chalkTalkId, filePath } = await request.json();
    
    if (!chalkTalkId || !filePath) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Invoke the Edge Function - this only initiates the process and returns immediately
    // The actual transcription happens asynchronously in the Edge Function
    const { data, error } = await supabase.functions.invoke('transcribe', {
      body: { chalkTalkId, filePath },
    });
    
    if (error) {
      console.error('Error invoking transcribe function:', error);
      return NextResponse.json(
        { error: 'Failed to start transcription process' },
        { status: 500 }
      );
    }
    
    // Return success immediately - the transcription continues in the background
    return NextResponse.json({ 
      success: true, 
      message: 'Transcription process initiated successfully',
      data 
    });
  } catch (error) {
    console.error('Error triggering transcription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 