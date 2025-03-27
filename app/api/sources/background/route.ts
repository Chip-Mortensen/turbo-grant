import { createClient } from "@/utils/supabase/server";
import { generateQuestions, formatSourcesForUpload } from '../utils/openai';
import { searchAllQuestions } from '../utils/perplexity';
import { FormattedSource } from '../utils/types';

// Force this to be a Node.js serverless function instead of an Edge function
export const runtime = 'nodejs';

interface ExistingSource {
  url: string;
  reason: string | null;
}

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process in the background - don't await the result
    processSourcesInBackground(projectId);

    return new Response(JSON.stringify({ success: true, message: 'Source generation started in background' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in background sources API:', error);
    return new Response(JSON.stringify({ 
      error: 'Error processing request',
      details: error instanceof Error ? error.message : error
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function processSourcesInBackground(projectId: string) {
  try {
    console.log(`Starting background source generation for project ${projectId}`);
    const startTime = Date.now();
    const supabase = await createClient();

    // Get existing sources
    let existingSources: ExistingSource[] = [];
    try {
      const { data, error: sourcesError } = await supabase
        .from('project_sources')
        .select('url, reason')
        .eq('project_id', projectId);

      if (sourcesError) {
        console.error('Error fetching existing sources:', sourcesError);
      } else {
        existingSources = data || [];
      }
    } catch (err) {
      console.error('Error fetching existing sources:', err);
    }

    // Get chalk talk transcription
    const { data: chalkTalk, error: chalkTalkError } = await supabase
      .from('chalk_talks')
      .select('transcription')
      .eq('project_id', projectId)
      .single();

    if (chalkTalkError || !chalkTalk?.transcription) {
      console.error('No transcription found for project:', projectId);
      return;
    }

    // Generate questions from OpenAI
    console.log('Generating questions...');
    const questions = await generateQuestions(chalkTalk.transcription);

    // Search for sources using Perplexity
    console.log('Searching for sources...');
    const rawResults = await searchAllQuestions(questions, existingSources || []);

    // Format results using OpenAI
    console.log('Formatting sources...');
    const sources = await formatSourcesForUpload(questions, rawResults);

    // Save sources to database
    console.log('Saving sources to database...');
    await saveSourcesToDatabase(projectId, sources, supabase);
    
    // Log processing time
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    console.log(`Background source generation completed for project ${projectId} in ${processingTime} seconds`);
  } catch (error) {
    console.error('Error in background source generation:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
  }
}

async function saveSourcesToDatabase(projectId: string, sources: FormattedSource[], supabase: any) {
  try {
    // Filter out sources with issues
    const validSources = sources.filter(source => !source.issue);
    
    if (validSources.length === 0) {
      console.log('No valid sources to save');
      return;
    }
    
    // Add sources one by one to handle any failures
    const results = await Promise.all(
      validSources.map(source => 
        supabase
          .from('project_sources')
          .insert({
            project_id: projectId,
            url: source.url,
            reason: source.reason,
            description: source.description,
            citation: source.citation,
          })
          .select('*')
          .single()
      )
    );

    // Log results
    const successCount = results.filter(result => !result.error).length;
    const failedCount = results.filter(result => result.error).length;
    
    console.log(`Successfully added ${successCount} sources, failed to add ${failedCount} sources`);
    
    // Log any errors
    results
      .filter(result => result.error)
      .forEach((result, index) => {
        console.error(`Error adding source ${index}:`, result.error);
      });
      
  } catch (err) {
    console.error('Error saving sources to database:', err);
  }
} 