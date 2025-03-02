import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// Track FFmpeg loading state to avoid loading multiple times
let ffmpegLoaded = false;
let ffmpegInstance: FFmpeg | null = null;

export async function checkBrowserCompatibility(): Promise<boolean> {
  // Check if WebAssembly is supported
  if (typeof WebAssembly === 'undefined') {
    return false;
  }
  
  // Check if SharedArrayBuffer is available (needed for some FFmpeg operations)
  try {
    // Basic check for modern browser features needed by FFmpeg.wasm
    return typeof SharedArrayBuffer !== 'undefined' || 
           typeof Blob !== 'undefined' || 
           typeof Worker !== 'undefined';
  } catch (e) {
    return false;
  }
}

export async function extractAudioFromVideo(
  videoFile: File, 
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Check compatibility first
  const isCompatible = await checkBrowserCompatibility();
  if (!isCompatible) {
    throw new Error('Your browser does not support the required features for audio extraction');
  }

  try {
    // Initialize FFmpeg if not already loaded
    if (!ffmpegLoaded || !ffmpegInstance) {
      ffmpegInstance = new FFmpeg();
      
      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
        if (onProgress) {
          onProgress(progress * 100);
        }
      });
      
      await ffmpegInstance.load();
      ffmpegLoaded = true;
    }
    
    // Write the input file to memory
    const inputFileName = 'input.' + videoFile.name.split('.').pop();
    ffmpegInstance.writeFile(inputFileName, await fetchFile(videoFile));
    
    // Extract audio as MP3
    await ffmpegInstance.exec([
      '-i', inputFileName,
      '-vn',                // No video
      '-acodec', 'libmp3lame', // MP3 codec
      '-ar', '44100',       // Sample rate
      '-ac', '2',           // Stereo
      '-b:a', '128k',       // Bitrate
      'output.mp3'
    ]);
    
    // Read the output file
    const data = await ffmpegInstance.readFile('output.mp3');
    
    // Clean up
    await ffmpegInstance.deleteFile(inputFileName);
    await ffmpegInstance.deleteFile('output.mp3');
    
    // Create a Blob from the output data
    return new Blob([data], { type: 'audio/mp3' });
  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new Error(`Failed to extract audio: ${error instanceof Error ? error.message : String(error)}`);
  }
} 