import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1';

// Maximum duration for this function is 400 seconds
const MAX_DURATION = 400 * 1000; // 400 seconds in milliseconds

// Chunk size in seconds (10 minutes)
const CHUNK_SIZE_SECONDS = 600;

// Create a Supabase client with the service role key
const supabaseClient = (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Create an OpenAI client
const openaiClient = () => {
  const configuration = new Configuration({
    apiKey: Deno.env.get('OPENAI_API_KEY'),
  });
  return new OpenAIApi(configuration);
};

// Helper function to get audio duration (placeholder implementation)
// In a real implementation, you would use a library like ffmpeg
const getAudioDuration = async (audioData: ArrayBuffer): Promise<number> => {
  // This is a placeholder - in a real implementation, you would analyze the audio file
  // For now, we'll assume a fixed duration based on file size
  // ~1MB per minute of audio at 128kbps
  const fileSizeInMB = audioData.byteLength / (1024 * 1024);
  const estimatedDurationInSeconds = fileSizeInMB * 60;
  
  return estimatedDurationInSeconds;
};

// Helper function to extract audio chunk (placeholder implementation)
// In a real implementation, you would use a library like ffmpeg
const extractAudioChunk = async (
  audioData: ArrayBuffer,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  // This is a placeholder - in a real implementation, you would extract the chunk
  // For now, we'll just return the whole audio file as a single chunk
  return new Blob([audioData], { type: 'audio/mpeg' });
};

// Process a chunk with Whisper API
const processChunk = async (
  openai: OpenAIApi,
  audioBlob: Blob,
  chunkIndex: number
): Promise<string> => {
  try {
    // Convert blob to FormData
    const formData = new FormData();
    formData.append('file', audioBlob, `chunk-${chunkIndex}.mp3`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    
    // Call OpenAI API directly since the SDK doesn't support FormData in Deno
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error(`Error processing chunk ${chunkIndex}:`, error);
    throw error;
  }
};

serve(async (req: Request) => {
  // Set a timeout for the function
  const timeoutId = setTimeout(() => {
    console.error('Function timed out after', MAX_DURATION, 'ms');
  }, MAX_DURATION);
  
  try {
    // Parse the request body
    const { chalkTalkId, filePath } = await req.json();
    
    if (!chalkTalkId || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing chalk talk ${chalkTalkId}, file: ${filePath}`);
    
    // Initialize clients
    const supabase = supabaseClient(req);
    const openai = openaiClient();
    
    // Update status to processing
    const { error: updateError } = await supabase
      .from('chalk_talks')
      .update({ 
        transcription_status: 'processing',
        transcription_error: null 
      })
      .eq('id', chalkTalkId);
      
    if (updateError) {
      throw new Error(`Failed to update status: ${updateError.message}`);
    }
    
    // Download the audio file
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('chalk-talks')
      .download(filePath);
      
    if (downloadError || !fileData) {
      throw new Error(`Failed to download audio: ${downloadError?.message || 'No data returned'}`);
    }
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Get audio duration
    const duration = await getAudioDuration(arrayBuffer);
    console.log(`Estimated audio duration: ${duration} seconds`);
    
    // Calculate number of chunks needed
    const numChunks = Math.ceil(duration / CHUNK_SIZE_SECONDS);
    console.log(`Processing audio in ${numChunks} chunks`);
    
    // Process chunks in sequence (parallel processing is more complex in Deno)
    let transcriptionParts: string[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * CHUNK_SIZE_SECONDS;
      const endTime = Math.min((i + 1) * CHUNK_SIZE_SECONDS, duration);
      
      console.log(`Processing chunk ${i+1}/${numChunks} (${startTime}s to ${endTime}s)`);
      
      try {
        // Extract chunk
        const chunkBlob = await extractAudioChunk(arrayBuffer, startTime, endTime);
        
        // Process chunk with Whisper API
        const transcription = await processChunk(openai, chunkBlob, i);
        transcriptionParts.push(transcription);
        
        console.log(`Chunk ${i+1} processed successfully`);
      } catch (error) {
        console.error(`Error processing chunk ${i+1}:`, error);
        // Continue with other chunks even if one fails
      }
    }
    
    // Combine all transcription parts
    const fullTranscription = transcriptionParts.join(' ');
    
    // Update the database with the transcription
    const { error: transcriptionError } = await supabase
      .from('chalk_talks')
      .update({
        transcription: fullTranscription,
        transcription_status: 'completed'
      })
      .eq('id', chalkTalkId);
      
    if (transcriptionError) {
      throw new Error(`Failed to update transcription: ${transcriptionError.message}`);
    }
    
    console.log(`Transcription completed for chalk talk ${chalkTalkId}`);
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Try to update error status in database
    try {
      const supabase = supabaseClient(req);
      const { chalkTalkId } = await req.json();
      
      if (chalkTalkId) {
        await supabase
          .from('chalk_talks')
          .update({
            transcription_status: 'error',
            transcription_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', chalkTalkId);
      }
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
    }
    
    return new Response(
      JSON.stringify({ error: 'Transcription failed', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}); 