import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EquipmentExtractor } from '@/lib/extractors/equipment-extractor';
import { getFOAText } from '@/lib/project-document-processing/query';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/equipment/analyze
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
        foaText = "";
      }
    } catch (error) {
      console.error('Error fetching FOA text:', error);
      foaText = "";
    }

    // Process the equipment catalog with the EquipmentExtractor
    const extractor = new EquipmentExtractor();
    const equipmentArray = await extractor.analyzeEquipment(equipmentCatalogText, foaText);
    
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