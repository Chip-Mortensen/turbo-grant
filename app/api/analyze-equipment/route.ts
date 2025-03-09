import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { getFOAText } from '@/lib/project-document-processing/query';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/analyze-equipment
 * 
 * Automatically analyzes equipment for a project based on its FOA
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
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch the FOA ID for this project
    const { data: projectData, error: projectError } = await supabase
      .from('research_projects')
      .select('foa')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData || !projectData.foa) {
      console.error('Error fetching project FOA:', projectError);
      return NextResponse.json(
        { error: 'No funding opportunity found for this project' },
        { status: 400 }
      );
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
      return NextResponse.json({
        message: 'Equipment recommendations already exist for this project',
        status: 'existing',
      });
    }

    // Load equipment catalog text
    let equipmentCatalogText;
    try {
      // Construct the path to the public directory and the ecl.txt file
      const publicDir = path.join(process.cwd(), 'public');
      const filePath = path.join(publicDir, 'ecl.txt');
      
      console.log('Attempting to read equipment catalog from:', filePath);
      
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Equipment catalog file not found at ${filePath}`);
      }
      
      // Read the file contents
      equipmentCatalogText = fs.readFileSync(filePath, 'utf8');
      
      if (!equipmentCatalogText || equipmentCatalogText.trim().length === 0) {
        throw new Error('The equipment catalog file is empty');
      }
      
      console.log('Equipment catalog loaded successfully, length:', equipmentCatalogText.length);
    } catch (error) {
      console.error('Error loading equipment catalog:', error);
      return NextResponse.json(
        { error: `Failed to load equipment catalog: ${(error as Error).message}` },
        { status: 500 }
      );
    }

    // Get FOA text using the utility function
    let foaText;
    try {
      foaText = await getFOAText(projectData.foa);
      
      if (!foaText) {
        console.warn('FOA found but no text retrieved from getFOAText');
        // We'll continue with a generic analysis instead of failing
        foaText = "";
      }
    } catch (error) {
      console.error('Error fetching FOA text:', error);
      // Continue with empty FOA text if we can't fetch it
      foaText = "";
    }

    // Process the equipment catalog with OpenAI
    const equipmentArray = await processEquipmentWithOpenAI(equipmentCatalogText, foaText);
    
    // Store the equipment recommendations in the database
    console.log('Saving equipment recommendations to database...');
    
    if (equipmentArray.length === 0) {
      console.warn('No equipment found to save. Something might have gone wrong with the analysis.');
      return NextResponse.json({
        message: 'No equipment recommendations were generated',
        status: 'warning',
        count: 0
      });
    }
    
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
      
      const { data, error } = await supabase
        .from('recommended_equipment')
        .upsert(recordToSave)
        .select();
      
      if (error) {
        console.error('Error saving to database:', error);
        return NextResponse.json(
          { error: `Failed to save equipment recommendations: ${error.message}` },
          { status: 500 }
        );
      }
      
      console.log('Equipment recommendations saved successfully:', data);
      
      return NextResponse.json({
        message: 'Equipment recommendations generated and saved',
        status: 'success',
        count: equipmentArray.length
      });
    } catch (error) {
      console.error('Error during database operation:', error);
      return NextResponse.json(
        { error: `Database error: ${(error as Error).message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in equipment analysis:', error);
    return NextResponse.json(
      { error: `Failed to analyze equipment: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Processes equipment text using OpenAI to extract and score relevant equipment
 */
async function processEquipmentWithOpenAI(equipmentText: string, foaText: string) {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Prepare the prompt for OpenAI
  const prompt =  
    `
    You are an expert scientific consultant who specializes in matching research equipment to funding opportunity requirements.
    
    I have two pieces of information:
    
    1. Text extracted from a webpage about scientific equipment:
    ${equipmentText}
    
    2. The text of a Funding Opportunity Announcement (FOA) that my research project is targeting:
    ${foaText}
    
    Create a structured JSON array of up to 10 of the most relevant pieces of equipment in the text.
    The JSON should be in the following format:
    {
      "equipment": [
        {
          "name": "Full equipment name",
          "specifications": "Brief summary of key specifications",
          "relevance_score": 7-10 score of relevance to FOA (if it's less relevant that 7, don't include it),
          "relevance_details": "Brief explanation of how this equipment relates to FOA requirements"
        }
      ]
    }
    
    For each piece of equipment, analyze its relevance to the FOA:
    - How specifically does this equipment address research needs mentioned in the text?
    - Which aspects of the requirements would this equipment help fulfill?
    - Rate each piece of equipment's relevance to the FOA from 1-10
    
    Only include equipment that is actually mentioned in the texts - do not invent details.
    Return ONLY the JSON with no additional text.

    Please do not mention the FOA in your response.
    `;

  // Call OpenAI API with response format set to JSON
  console.log('Calling OpenAI API with prompt length:', prompt.length);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2500,
  });

  const content = response.choices[0].message.content;
  
  console.log('OpenAI API response received. Content length:', content?.length || 0);
  
  if (!content) {
    console.error('Empty content returned from OpenAI');
    throw new Error('No analysis returned from AI');
  }

  // Parse the JSON response
  let equipmentArray: any[] = [];
  
  try {
    console.log('Parsing OpenAI response...');
    const equipmentJson = JSON.parse(content);
    console.log('OpenAI response parsed. Structure:', Object.keys(equipmentJson));
    
    // Validate the response has the required format
    if (!equipmentJson.equipment || !Array.isArray(equipmentJson.equipment)) {
      console.warn('OpenAI response missing equipment array:', content);
      equipmentArray = [];
    } else {
      // Extract the equipment array
      equipmentArray = equipmentJson.equipment;
      console.log(`Found ${equipmentArray.length} equipment items in OpenAI response`);
    }
    
    // Ensure each item has the required fields
    equipmentArray = equipmentArray.map((item: any, index: number) => {
      console.log(`Processing equipment item ${index+1}:`, item.name || 'unnamed');
      return {
        name: item.name || 'Unnamed Equipment',
        specifications: item.specifications || '',
        relevance_score: typeof item.relevance_score === 'number' ? item.relevance_score : 5,
        relevance_details: item.relevance_details || ''
      };
    });
    
    // Sort by relevance score
    equipmentArray.sort((a, b) => b.relevance_score - a.relevance_score);
    console.log('Equipment array sorted, final count:', equipmentArray.length);
    
    return equipmentArray;
  } catch (error) {
    console.error('Error parsing JSON from OpenAI response:', error);
    console.error('Raw content from OpenAI:', content);
    throw new Error(`Failed to parse equipment data: ${(error as Error).message}`);
  }
} 