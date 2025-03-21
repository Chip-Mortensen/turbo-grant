import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';
import { Document, DocumentSourceType } from '@/types/documents';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Get the user data for audit purposes
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const requestData = await request.json();
    const { name, prompt, page_limit, project_id } = requestData;
    
    // Validate required fields
    if (!name || !prompt) {
      return Response.json({ error: 'Name and prompt are required' }, { status: 400 });
    }

    // Get the project's FOA to determine the agency
    let agency = "NIH"; // Default fallback
    
    if (project_id) {
      const { data: project, error: projectError } = await supabase
        .from('research_projects')
        .select('foa')
        .eq('id', project_id)
        .single();
      
      if (projectError) {
        console.error('Error fetching project:', projectError);
      } else if (project?.foa) {
        // Get the FOA details to get the agency
        const { data: foaData, error: foaError } = await supabase
          .from('foas')
          .select('agency')
          .eq('id', project.foa)
          .single();
        
        if (!foaError && foaData?.agency) {
          agency = foaData.agency;
        }
      }
    }
    
    // Create document with default values and agency from FOA
    const documentData = {
      name,
      prompt,
      page_limit: page_limit || null,
      project_id: project_id || null,
      agency,
      fields: [],
      sources: ["chalk_talk", "foa", "research_description"],
      optional: false,
      grant_types: [],
      custom_processor: null
    };
    
    // Insert the document
    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating custom document:', error);
      return Response.json({ error: 'Failed to create custom document' }, { status: 500 });
    }
    
    console.log('Custom document created successfully:', data);
    return Response.json(data);
  } catch (error) {
    console.error('Error in POST /api/documents/custom-document:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 