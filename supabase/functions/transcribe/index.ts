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

// Helper function to get audio duration
const getAudioDuration = async (audioData: ArrayBuffer): Promise<number> => {
  // Deno doesn't have AudioContext, so we'll use the file size estimation method
  // ~1MB per minute of audio at 128kbps
  const fileSizeInMB = audioData.byteLength / (1024 * 1024);
  const estimatedDurationInSeconds = fileSizeInMB * 60;
  
  console.log(`Audio file size: ${fileSizeInMB.toFixed(2)}MB, estimated duration: ${estimatedDurationInSeconds.toFixed(2)} seconds`);
  
  return estimatedDurationInSeconds;
};

// Helper function to extract audio chunk
const extractAudioChunk = async (
  audioData: ArrayBuffer,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  try {
    console.log(`Extracting audio chunk from ${startTime}s to ${endTime}s`);
    
    // In Deno, we don't have access to AudioContext for proper audio processing
    // Instead, we'll use a more basic approach to extract chunks based on byte ranges
    
    // Estimate the byte position based on time
    // This is a rough approximation and won't be perfect
    const totalDuration = await getAudioDuration(audioData);
    const startPercent = startTime / totalDuration;
    const endPercent = endTime / totalDuration;
    
    const startByte = Math.floor(startPercent * audioData.byteLength);
    const endByte = Math.floor(endPercent * audioData.byteLength);
    
    // Extract the chunk
    const chunkData = audioData.slice(startByte, endByte);
    
    console.log(`Extracted chunk from byte ${startByte} to ${endByte} (${((endByte - startByte) / (1024 * 1024)).toFixed(2)}MB)`);
    
    // Create a blob from the chunk data
    return new Blob([chunkData], { type: 'audio/mpeg' });
  } catch (error) {
    console.error(`Error extracting audio chunk from ${startTime}s to ${endTime}s:`, error);
    
    // If extraction fails, return the entire audio file as a fallback
    console.log('Falling back to using the entire audio file');
    return new Blob([audioData], { type: 'audio/mpeg' });
  }
};

// Process a chunk with Whisper API
const processChunk = async (
  openai: OpenAIApi,
  audioBlob: Blob,
  chunkIndex: number
): Promise<string> => {
  try {
    console.log(`Starting to process chunk ${chunkIndex}, size: ${(audioBlob.size / (1024 * 1024)).toFixed(2)}MB`);
    
    // Convert blob to FormData
    const formData = new FormData();
    formData.append('file', audioBlob, `chunk-${chunkIndex}.mp3`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    
    console.log(`Sending chunk ${chunkIndex} to OpenAI Whisper API...`);
    
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
      console.error(`OpenAI API error (${response.status}): ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Successfully processed chunk ${chunkIndex}, received ${result.text.length} characters of text`);
    
    if (!result.text || result.text.trim() === '') {
      console.warn(`Warning: Chunk ${chunkIndex} returned empty transcription`);
    }
    
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
    console.log('Transcription function started');
    
    // Parse the request body
    const { chalkTalkId, filePath } = await req.json();
    
    if (!chalkTalkId || !filePath) {
      console.error('Missing required parameters:', { chalkTalkId, filePath });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing chalk talk ${chalkTalkId}, file: ${filePath}`);
    
    // Check if OpenAI API key is set
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OpenAI API key is not set');
      throw new Error('OpenAI API key is not set');
    }
    
    // Initialize clients
    const supabase = supabaseClient(req);
    const openai = openaiClient();
    
    // Update status to processing
    console.log(`Updating status to 'processing' for chalk talk ${chalkTalkId}`);
    const { error: updateError } = await supabase
      .from('chalk_talks')
      .update({ 
        transcription_status: 'processing',
        transcription_error: null 
      })
      .eq('id', chalkTalkId);
      
    if (updateError) {
      console.error(`Failed to update status: ${updateError.message}`);
      throw new Error(`Failed to update status: ${updateError.message}`);
    }
    
    // Download the audio file
    console.log(`Downloading audio file from storage: ${filePath}`);
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('chalk-talks')
      .download(filePath);
      
    if (downloadError || !fileData) {
      console.error(`Failed to download audio: ${downloadError?.message || 'No data returned'}`);
      throw new Error(`Failed to download audio: ${downloadError?.message || 'No data returned'}`);
    }
    
    console.log(`Successfully downloaded audio file, size: ${(fileData.size / (1024 * 1024)).toFixed(2)}MB`);
    
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
    let hasErrors = false;
    
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * CHUNK_SIZE_SECONDS;
      const endTime = Math.min((i + 1) * CHUNK_SIZE_SECONDS, duration);
      
      console.log(`Processing chunk ${i+1}/${numChunks} (${startTime}s to ${endTime}s)`);
      
      try {
        // Extract chunk
        const chunkBlob = await extractAudioChunk(arrayBuffer, startTime, endTime);
        
        // Process chunk with Whisper API
        const transcription = await processChunk(openai, chunkBlob, i);
        
        if (transcription && transcription.trim() !== '') {
          transcriptionParts.push(transcription);
          console.log(`Chunk ${i+1} processed successfully, added ${transcription.length} characters to transcription`);
        } else {
          console.warn(`Chunk ${i+1} returned empty transcription, skipping`);
          hasErrors = true;
        }
      } catch (error) {
        console.error(`Error processing chunk ${i+1}:`, error);
        hasErrors = true;
        // Continue with other chunks even if one fails
      }
    }
    
    // Combine all transcription parts
    const fullTranscription = transcriptionParts.join(' ');
    console.log(`Combined transcription length: ${fullTranscription.length} characters`);
    
    if (fullTranscription.length === 0) {
      console.error('No transcription was generated for any chunk');
      throw new Error('Failed to generate transcription: all chunks failed');
    }
    
    // Update the database with the transcription
    console.log(`Updating database with transcription for chalk talk ${chalkTalkId}`);
    const { error: transcriptionError } = await supabase
      .from('chalk_talks')
      .update({
        transcription: fullTranscription,
        transcription_status: hasErrors ? 'completed_with_errors' : 'completed',
        transcription_error: hasErrors ? 'Some chunks failed to transcribe' : null
      })
      .eq('id', chalkTalkId);
      
    if (transcriptionError) {
      console.error(`Failed to update transcription: ${transcriptionError.message}`);
      throw new Error(`Failed to update transcription: ${transcriptionError.message}`);
    }
    
    console.log(`Transcription completed for chalk talk ${chalkTalkId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        hasErrors,
        transcriptionLength: fullTranscription.length,
        message: hasErrors ? 'Transcription completed with some errors' : 'Transcription completed successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Try to update error status in database
    try {
      const supabase = supabaseClient(req);
      const { chalkTalkId } = await req.json();
      
      if (chalkTalkId) {
        console.log(`Updating status to 'error' for chalk talk ${chalkTalkId}`);
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
    console.log('Transcription function completed');
  }
}); 