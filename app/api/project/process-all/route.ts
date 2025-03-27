import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateDocumentContent } from '@/lib/project-document-processing/generation-service';
import { EquipmentExtractor } from '@/lib/extractors/equipment-extractor';
import { getFOAText } from '@/lib/project-document-processing/query';
import { generateQuestions, formatSourcesForUpload } from '@/app/api/sources/utils/openai';
import { searchAllQuestions } from '@/app/api/sources/utils/perplexity';
import { FormattedSource } from '@/app/api/sources/utils/types';
import path from 'path';
import fs from 'fs';

// Force this to be a Node.js serverless function
export const runtime = 'nodejs';

/**
 * A unified endpoint that processes equipment analysis, source generation, and document generation
 * Responds immediately but keeps the function alive to complete all processing
 */
export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Set up a flag to track if we've sent a response
    let responseReturned = false;
    
    // Create a response to return immediately
    const response = NextResponse.json({
      message: 'Background processing started',
      status: 'success'
    });
    
    // Use setTimeout to ensure we return a response quickly
    setTimeout(() => {
      if (!responseReturned) {
        responseReturned = true;
        console.log(`Sending early response for project ${projectId} processing`);
      }
    }, 500); // Return a response after 500ms at the latest
    
    // Start all three processes in parallel but don't await them here
    Promise.all([
      processEquipment(projectId),
      processSources(projectId),
      processAttachments(projectId)
    ]).catch(error => {
      console.error('Error in background processing:', error);
    });
    
    // Return the response immediately
    responseReturned = true;
    return response;
    
  } catch (error) {
    console.error('Error starting background processing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start background processing' },
      { status: 500 }
    );
  }
}

// Equipment analysis processing
async function processEquipment(projectId: string) {
  try {
    console.log(`Starting equipment analysis for project ${projectId}`);
    const startTime = Date.now();
    
    const supabase = await createClient();
    
    // Get the project's FOA for analysis
    const { data: project, error: projectError } = await supabase
      .from('research_projects')
      .select('foa')
      .eq('id', projectId)
      .single();
      
    if (projectError || !project?.foa) {
      console.error('Error fetching project FOA:', projectError);
      return;
    }
    
    // Check if equipment recommendations already exist
    const { data: existingRecommendations, error: recError } = await supabase
      .from('recommended_equipment')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!recError && existingRecommendations && existingRecommendations.length > 0) {
      console.log('Equipment recommendations already exist for this project');
      return;
    }
    
    // Get the FOA text
    const foaText = await getFOAText(project.foa);
    
    if (!foaText) {
      console.error('No FOA text available for analysis');
      return;
    }
    
    // Load equipment catalog text
    let equipmentCatalogText;
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const filePath = path.join(publicDir, 'ecl.txt');
      
      console.log('Attempting to read equipment catalog from:', filePath);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Equipment catalog file not found at ${filePath}`);
      }
      
      equipmentCatalogText = fs.readFileSync(filePath, 'utf8');
      
      if (!equipmentCatalogText || equipmentCatalogText.trim().length === 0) {
        throw new Error('The equipment catalog file is empty');
      }
      
      console.log('Equipment catalog loaded successfully, length:', equipmentCatalogText.length);
    } catch (error) {
      console.error('Error loading equipment catalog:', error);
      return;
    }
    
    // Extract equipment from the FOA
    const extractor = new EquipmentExtractor();
    const equipmentArray = await extractor.analyzeEquipment(equipmentCatalogText, foaText);
    
    if (equipmentArray.length === 0) {
      console.warn('No equipment found to save. Something might have gone wrong with the analysis.');
      return;
    }
    
    // Store the equipment recommendations in the database
    try {
      const recordToSave = {
        project_id: projectId,
        equipment: equipmentArray,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Saving record to database:', {
        project_id: recordToSave.project_id,
        equipment_count: equipmentArray.length
      });
      
      const { error } = await supabase
        .from('recommended_equipment')
        .upsert(recordToSave)
        .select();
      
      if (error) {
        console.error('Error saving to database:', error);
        return;
      }
      
      console.log('Equipment recommendations saved successfully');
    } catch (error) {
      console.error('Error during database operation:', error);
      return;
    }
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    console.log(`Equipment analysis completed for project ${projectId} in ${processingTime} seconds`);
    
  } catch (error) {
    console.error('Error in equipment analysis:', error);
  }
}

// Source generation processing
async function processSources(projectId: string) {
  try {
    console.log(`Starting source generation for project ${projectId}`);
    const startTime = Date.now();
    
    const supabase = await createClient();

    // Get existing sources
    let existingSources: { url: string; reason: string | null }[] = [];
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
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    console.log(`Source generation completed for project ${projectId} in ${processingTime} seconds`);
    
  } catch (error) {
    console.error('Error in source generation:', error);
  }
}

// Document generation processing
async function processAttachments(projectId: string) {
  try {
    console.log(`Starting attachment generation for project ${projectId}`);
    const startTime = Date.now();
    
    const supabase = await createClient();
    
    // Get the project's attachments
    const { data: project, error: projectError } = await supabase
      .from('research_projects')
      .select('attachments')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project?.attachments) {
      console.error('Error fetching project attachments:', projectError);
      return;
    }
    
    // Get all document IDs from the attachments
    const documentIds = Object.keys(project.attachments);
    
    if (documentIds.length === 0) {
      console.log('No attachments found for project');
      return;
    }
    
    console.log(`Found ${documentIds.length} attachments to generate`);
    
    // Create a copy of the attachments to update
    let updatedAttachments = { ...project.attachments };
    let hasUpdates = false;
    
    // Process each document sequentially to avoid rate limits
    for (const documentId of documentIds) {
      try {
        console.log(`Generating content for document ${documentId}`);
        
        // Check if content already exists
        const { data: existingContent } = await supabase
          .from('completed_documents')
          .select('id')
          .eq('document_id', documentId)
          .eq('project_id', projectId)
          .maybeSingle();
        
        if (existingContent) {
          console.log(`Content already exists for document ${documentId}, marking as completed`);
          
          // Mark as completed if not already
          if (!updatedAttachments[documentId]?.completed) {
            updatedAttachments[documentId] = {
              ...updatedAttachments[documentId],
              completed: true,
              updatedAt: new Date().toISOString()
            };
            hasUpdates = true;
          }
          
          continue;
        }
        
        // Generate content
        const result = await generateDocumentContent(supabase, documentId, projectId);
        
        if (result.error) {
          console.error(`Error generating content for document ${documentId}:`, result.error);
          continue;
        }
        
        // Save the generated content
        const { error: saveError } = await supabase
          .from('completed_documents')
          .insert({
            document_id: documentId,
            project_id: projectId,
            content: result.content
          });
        
        if (saveError) {
          console.error(`Error saving content for document ${documentId}:`, saveError);
          continue;
        }
        
        console.log(`Successfully generated and saved content for document ${documentId}`);
        
        // Mark the attachment as completed
        updatedAttachments[documentId] = {
          ...updatedAttachments[documentId],
          completed: true,
          updatedAt: new Date().toISOString()
        };
        hasUpdates = true;
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (docError) {
        console.error(`Error processing document ${documentId}:`, docError);
        // Continue with the next document
      }
    }
    
    // Update the project's attachments if there were changes
    if (hasUpdates) {
      console.log('Updating project attachments with completion status');
      const { error: updateError } = await supabase
        .from('research_projects')
        .update({ attachments: updatedAttachments })
        .eq('id', projectId);
      
      if (updateError) {
        console.error('Error updating project attachments:', updateError);
      } else {
        console.log('Successfully updated project attachments');
      }
    }
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    console.log(`Attachment generation completed for project ${projectId} in ${processingTime} seconds`);
    
  } catch (error) {
    console.error('Error in attachment generation:', error);
  }
}

// Helper function for saving sources
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