import { createClient } from "@/utils/supabase/server";
import { generateQuestions, formatSourcesForUpload } from './utils/openai';
import { searchAllQuestions } from './utils/perplexity';
import { ChalkTalkSourcesResponse, ChalkTalkSourcesError } from './utils/types';

interface ExistingSource {
  url: string;
  reason: string | null;
}

async function handleSourceGeneration(projectId: string, writer: WritableStreamDefaultWriter, encoder: TextEncoder) {
  try {
    // Send initial step
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'starting' })}\n\n`));
    console.log('Sent starting step');

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
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        error: 'No transcription found',
        step: 'fetch_transcription',
        details: chalkTalkError
      })}\n\n`));
      await writer.close();
      return;
    }

    // Generate questions from OpenAI
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'generating_questions' })}\n\n`));
    console.log('Sent generating_questions step');
    const questions = await generateQuestions(chalkTalk.transcription);
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'questions_generated', questions })}\n\n`));
    console.log('Sent questions_generated step');

    // Search for sources using Perplexity
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'searching_sources' })}\n\n`));
    console.log('Sent searching_sources step');
    const rawResults = await searchAllQuestions(questions, existingSources || []);
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'sources_found', rawResults })}\n\n`));
    console.log('Sent sources_found step');

    // Format results using OpenAI
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'formatting_sources' })}\n\n`));
    console.log('Sent formatting_sources step');
    const sources = await formatSourcesForUpload(questions, rawResults);
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'sources_formatted', sources })}\n\n`));
    console.log('Sent sources_formatted step');

    // Send final response
    const response: ChalkTalkSourcesResponse = {
      sources,
      questions,
      rawResults
    };
    await writer.write(encoder.encode(`data: ${JSON.stringify({ step: 'complete', response })}\n\n`));
    console.log('Sent complete step');
    await writer.close();

  } catch (error) {
    console.error('Error in sources generation:', error);
    await writer.write(encoder.encode(`data: ${JSON.stringify({
      error: 'Error processing request',
      details: error instanceof Error ? error.message : error
    })}\n\n`));
    await writer.close();
  }
}

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Project ID is required' })}\n\n`));
      await writer.close();
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Start the source generation process
    handleSourceGeneration(projectId, writer, encoder);

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('Error in GET handler:', error);
    await writer.write(encoder.encode(`data: ${JSON.stringify({
      error: 'Error processing request',
      details: error instanceof Error ? error.message : error
    })}\n\n`));
    await writer.close();
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  try {
    const { projectId } = await req.json();
    if (!projectId) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Project ID is required' })}\n\n`));
      await writer.close();
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Start the source generation process
    handleSourceGeneration(projectId, writer, encoder);

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('Error in POST handler:', error);
    await writer.write(encoder.encode(`data: ${JSON.stringify({
      error: 'Error processing request',
      details: error instanceof Error ? error.message : error
    })}\n\n`));
    await writer.close();
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }
} 