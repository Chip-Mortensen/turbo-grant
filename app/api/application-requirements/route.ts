import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { getFOAText, getChalkTalkText } from '@/lib/project-document-processing/query';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { 
  getNihResearchGrantTypes,
  getNihTrainingGrantTypes,
  getNihFellowshipGrantTypes,
  getNihCareerDevelopmentGrantTypes,
  getNihMultiProjectGrantTypes,
  getNihSbirSttrGrantTypes,
  NihGrantType,
  NihResearchGrantType,
  NihTrainingGrantType,
  NihFellowshipGrantType,
  NihCareerDevelopmentGrantType,
  NihMultiProjectGrantType,
  NihSbirSttrGrantType
} from '@/types/enum-types';

interface Document {
  name: string;
  condition: string;
  user_question: string;
  isRequired: boolean;
  source_pages: number[];
  requirement_doc: string;
  document_type: string;
  page_limits: string | null;
}

interface FilteredDocuments {
  required: string[];
  notRequired: string[];
  unsure: string[];
}

// Initialize Google Generative AI client
const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Helper function to load requirements from JSON file
function loadRequirements(grantType: string): Document[] {
  try {
    console.log('Loading requirements for grant type:', grantType);
    const filePath = path.join(process.cwd(), 'lib/project-document-processing/requirements_json', `${grantType}.json`);
    console.log('Looking for file at:', filePath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const documents = JSON.parse(fileContent);
    console.log(`Loaded ${documents.length} documents from ${grantType}.json`);
    return documents;
  } catch (error) {
    console.error(`Error loading requirements for ${grantType}:`, error);
    return [];
  }
}

// Helper function to determine grant type from research description and FOA details
function determineGrantType(researchDescription: string, foaDetails: any): string {
  if (!foaDetails) {
    console.warn(`Unknown grant type`);
    return 'default';
  }

  // Check FOA details first
  if (foaDetails.grant_type) {
    // Handle object format like { R03: true }
    const grantType = Object.keys(foaDetails.grant_type)[0] as NihGrantType;
    if (grantType) {
      // Map NIH grant types to their corresponding JSON files
      if (foaDetails.agency === 'NIH') {
        // Check each category of NIH grant types
        if (getNihResearchGrantTypes().includes(grantType as NihResearchGrantType)) {
          return 'nih_research';
        } else if (getNihTrainingGrantTypes().includes(grantType as NihTrainingGrantType)) {
          return 'nih_training';
        } else if (getNihFellowshipGrantTypes().includes(grantType as NihFellowshipGrantType)) {
          return 'nih_fellowship';
        } else if (getNihCareerDevelopmentGrantTypes().includes(grantType as NihCareerDevelopmentGrantType)) {
          return 'nih_career';
        } else if (getNihMultiProjectGrantTypes().includes(grantType as NihMultiProjectGrantType)) {
          return 'nih_multi-project';
        } else if (getNihSbirSttrGrantTypes().includes(grantType as NihSbirSttrGrantType)) {
          return 'nih_sbir_sttr';
        } else {
          console.warn(`Unknown NIH grant type: ${grantType}, defaulting to research`);
          return 'nih_research';
        }
      } else if (foaDetails.agency === 'NSF') {
        return 'nsf';
      }
    }
  }
  return 'error'; // Default to research if no specific type is found
}

// Helper function to create the prompt for Gemini
function createFilteringPrompt(
  documents: Document[],
  researchDescription: string,
  foaDetails: any,
  chalkTalkContent: string,
  applicationFactors: any
): string {
  // Print first 100 characters of each context variable
  console.log('Research Description:', researchDescription.substring(0, 100) + (researchDescription.length > 100 ? '...' : ''));
  console.log('Chalk Talk Content:', chalkTalkContent.substring(0, 100) + (chalkTalkContent.length > 100 ? '...' : ''));
  console.log('FOA Details:', JSON.stringify(foaDetails).substring(0, 100) + (JSON.stringify(foaDetails).length > 100 ? '...' : ''));
  console.log('Application Factors:', JSON.stringify(applicationFactors).substring(0, 100) + (JSON.stringify(applicationFactors).length > 100 ? '...' : ''));
  console.log('Documents:', JSON.stringify(documents).substring(0, 100) + (JSON.stringify(documents).length > 100 ? '...' : ''));

  // Separate required and non-required documents
  const nonRequiredDocuments = documents.filter(d => !d.isRequired);

  return `You are an AI assistant helping to filter questions for a grant application. Your task is to determine which documents are required, not required, or need more information based on the available context.

CONTEXT:
Research Description (Description of the research): ${researchDescription || 'Not provided'}
Chalk Talk (Description of the research): ${chalkTalkContent || 'Not provided'}
FOA / NOFO Details (Use this to answer question about NOFO / Funding Opportunity): ${JSON.stringify(foaDetails) || 'Not provided'}
Previously Answered Questions that will help you make the determination: ${JSON.stringify(applicationFactors) || 'None'}

DOCUMENTS TO FILTER:
${JSON.stringify(nonRequiredDocuments, null, 2)}

TASK:
Analyze each document and determine if it is required, not required, or needs more information based on the available context. IMPORTANT: For each document:
1. Check if the context above can help us determine if the document is required, not required, or needs more information. 
2. Questions relating to the NOFO / Funding opportunity should be able to be answered with the FOA details, so don't include them in the unsure array and put them in either the required or notRequired array.
3. Please use the NOFO / Funding opportunity details to help you make the determination of whether the document is required, not required, or needs more information.
4. If you don't have certainty about the requirement status of a document, put it in the unsure array. All decisions must be based strictly on the context provided.
5. The default should be unsure. You should only put a document in the required or notRequired array if you are certain. In order to be certain, the context must clearly support the determination.

IMPORTANT: If a document is required, it must be in the required array. If a document is not required, it must be in the notRequired array. If there is any uncertainty, it must be in the unsure array.

RESPONSE FORMAT:
Return a JSON object with three arrays of document names (which must match exactly to the document names listed below "DOCUMENTS TO FILTER"):
{
  "required": ["document_name1", "document_name2", ...],
  "notRequired": ["document_name3", "document_name4", ...],
  "unsure": ["document_name5", "document_name6", ...]
}

IMPORTANT: Your response must be a valid JSON object with these three arrays.`;
}

// Helper function to filter questions using Gemini
async function filterQuestionsWithGemini(
  documents: Document[],
  researchDescription: string,
  foaDetails: any,
  chalkTalkContent: string,
  applicationFactors: any
): Promise<FilteredDocuments> {
  try {
    // Create the prompt with all documents
    const prompt = createFilteringPrompt(
      documents, // Send all documents to Gemini
      researchDescription,
      foaDetails,
      chalkTalkContent,
      applicationFactors
    );

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100000,
        responseMimeType: "application/json",
      },
    });

    const response = result.response.text();
    let filteredDocs: FilteredDocuments = {
      required: [],
      notRequired: [],
      unsure: []
    };

    try {
      // Clean the response and parse it
      const cleanedResponse = response
        .replace(/```json\n?|```\n?/g, '')
        .replace(/\\"/g, '"')
        .trim();
      
      console.log('Cleaned Gemini Response:', cleanedResponse);
      
      const geminiResponse = JSON.parse(cleanedResponse);
      console.log('Parsed Gemini Response:', JSON.stringify(geminiResponse, null, 2));
      
      // Use Gemini's categorization
      filteredDocs = {
        required: geminiResponse.required || [],
        notRequired: geminiResponse.notRequired || [],
        unsure: geminiResponse.unsure || []
      };

      // Ensure documents marked as isRequired in the JSON are in the required array
      documents.forEach(doc => {
        if (doc.isRequired && !filteredDocs.required.includes(doc.name)) {
          console.log(`Adding required document that was missing: ${doc.name}`);
          filteredDocs.required.push(doc.name);
        }
      });

      // Remove any duplicates
      filteredDocs.required = Array.from(new Set(filteredDocs.required));
      filteredDocs.notRequired = Array.from(new Set(filteredDocs.notRequired));
      filteredDocs.unsure = Array.from(new Set(filteredDocs.unsure));

      // Remove any documents from notRequired if they're in required
      filteredDocs.notRequired = filteredDocs.notRequired.filter(
        doc => !filteredDocs.required.includes(doc)
      );

      // Remove any documents from unsure if they're in required or notRequired
      filteredDocs.unsure = filteredDocs.unsure.filter(
        doc => !filteredDocs.required.includes(doc) && !filteredDocs.notRequired.includes(doc)
      );

      // If Gemini didn't categorize any documents, put them all in unsure
      if (filteredDocs.required.length === 0 && filteredDocs.notRequired.length === 0) {
        console.log('WARNING: Gemini did not categorize any documents, marking all as unsure');
        filteredDocs.unsure = documents.map(d => d.name);
      }

      console.log('Final Filtered Documents:', JSON.stringify(filteredDocs, null, 2));

    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.error('Raw response that failed to parse:', response);
      // If we can't parse the response, mark all documents as unsure
      filteredDocs.unsure = documents.map(d => d.name);
    }

    return filteredDocs;
  } catch (error) {
    console.error('Error using Gemini to filter questions:', error);
    console.error('Error details:', {
      researchDescription: researchDescription?.substring(0, 100),
      foaDetails: foaDetails ? JSON.stringify(foaDetails).substring(0, 100) : 'Not provided',
      documentCount: documents.length
    });
    // If there's an error, mark all documents as unsure
    return {
      required: [],
      notRequired: [],
      unsure: documents.map(d => d.name)
    };
  }
}

// Filter documents based on research description
function filterDocuments(documents: Document[], researchDescription: string): FilteredDocuments {
  const required: string[] = [];
  const notRequired: string[] = [];
  const unsure: string[] = [];

  // First, identify all documents that are marked as required in the JSON
  documents.forEach(document => {
    if (document.isRequired) {
      required.push(document.name);
    }
  });

  // Then, for remaining documents, check their conditions
  documents.forEach(document => {
    if (!document.isRequired) {
      if (document.condition.includes(researchDescription)) {
        required.push(document.name);
      } else {
        // If we can't determine from the condition, mark as unsure
        unsure.push(document.name);
      }
    }
  });

  // Remove any duplicates from the arrays
  const uniqueRequired = Array.from(new Set(required));
  const uniqueUnsure = Array.from(new Set(unsure));

  return {
    required: uniqueRequired,
    notRequired,
    unsure: uniqueUnsure
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { 
      researchDescription, 
      projectId
    } = await request.json();
    
    if (!projectId) {
      return Response.json({ error: 'Missing project ID' }, { status: 400 });
    }

    // Get FOA details and other context
    const supabase = await createClient();
    let foaDetails = null;
    let chalkTalkContent = '';
    let applicationFactors = null;
    
    try {
      // Get FOA details and application factors
      const { data: project } = await supabase
        .from('research_projects')
        .select('foa, application_factors')
        .eq('id', projectId)
        .single();
        
      if (project?.foa) {
        // Get the full FOA details from the foas table
        const { data: foaData, error: foaError } = await supabase
          .from('foas')
          .select('*')
          .eq('id', project.foa)
          .single();

        if (foaError) {
          console.error('Error fetching FOA details:', foaError);
        } else if (foaData) {
          foaDetails = foaData;
          console.log('FOA Details:', foaDetails);
          
          // Get FOA text from vector store
          try {
            const foaText = await getFOAText(foaData.id);
            if (foaText) {
              foaDetails = {
                ...foaDetails,
                fullText: foaText
              };
            }
          } catch (error) {
            console.error(`Error fetching FOA text for FOA ID ${foaData.id}:`, error);
          }
        }
      }
      
      if (project?.application_factors) {
        applicationFactors = project.application_factors;
      }
      
      // Get chalk talk content
      try {
        chalkTalkContent = await getChalkTalkText(projectId);
      } catch (error) {
        console.error('Error fetching chalk talk text:', error);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }

    // Determine grant type and load requirements
    const grantType = determineGrantType(researchDescription || '', foaDetails);
    console.log('Determined grant type:', grantType);
    const documents = loadRequirements(grantType);

    // Filter documents using Gemini AI
    const filteredDocs = await filterQuestionsWithGemini(
      documents,
      researchDescription || '',
      foaDetails,
      chalkTalkContent,
      applicationFactors
    );
    console.log('Filtered documents:', filteredDocs);

    // Create debug information
    const debugInfo = {
      researchDescription: researchDescription?.substring(0, 100) + (researchDescription?.length > 100 ? '...' : ''),
      chalkTalkContent: chalkTalkContent?.substring(0, 100) + (chalkTalkContent?.length > 100 ? '...' : ''),
      foaDetails: foaDetails ? JSON.stringify(foaDetails).substring(0, 100) + (JSON.stringify(foaDetails).length > 100 ? '...' : '') : 'Not provided',
      applicationFactors: applicationFactors ? JSON.stringify(applicationFactors).substring(0, 100) + (JSON.stringify(applicationFactors).length > 100 ? '...' : '') : 'Not provided',
      documents: documents ? JSON.stringify(documents).substring(0, 100) + (JSON.stringify(documents).length > 100 ? '...' : '') : 'Not provided',
      grantType,
      filteredDocs
    };

    // Log debug information
    console.log('\n=== Debug Information ===');
    console.log('Research Description:', debugInfo.researchDescription);
    console.log('Chalk Talk Content:', debugInfo.chalkTalkContent);
    console.log('FOA Details:', debugInfo.foaDetails);
    console.log('Application Factors:', debugInfo.applicationFactors);
    console.log('Documents:', debugInfo.documents);
    console.log('Grant Type:', debugInfo.grantType);
    console.log('Filtered Documents:', JSON.stringify(debugInfo.filteredDocs, null, 2));
    console.log('=== End Debug Information ===\n');

    // Return the filtered documents with grant type and debug info
    return Response.json({
      ...filteredDocs,
      grantType,
      documents: documents, // Include the full document structure from JSON
      debugInfo // Include debug information
    });
  } catch (error) {
    console.error('Error in application-requirements API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 