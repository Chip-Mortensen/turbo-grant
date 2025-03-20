import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { getFOAText, getChalkTalkText } from '@/lib/project-document-processing/query';
import { getDocumentContent } from '@/lib/project-document-processing/document-templates';

// Helper function to truncate text
const truncate = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Initialize OpenAI client for fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Generative AI client
const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface AIResponse {
  questions: {
    id?: string;
    documentName: string; // The document this question is related to
    question: string;
    criteria?: string; // Only required for chat questions
    answer: string;
    isComplete?: boolean;
    answerType?: 'auto-extracted' | 'uncertainty-expressed' | 'manually-answered';
    questionType: 'options' | 'chat';
    options?: string[];
  }[];
  requiredDocuments: {
    documentName: string;
    description: string;
    pageLimit: string;
    isRequired: boolean;
    confidence: 'high' | 'medium' | 'low';
    justification: string; // Brief reason why this document is required
    mustDraft: boolean; // Whether the proposer must draft this document themselves
  }[];
}

function getSystemPrompt(
  researchDescription: string,
  foaDetails: any,
  documentContent: string,
  chalkTalkContent: string,
  applicationFactors: any,
  currentApplicationRequirements?: any,
  refinementIteration: number = 0
): string {
  // Print the first 100 characters of each variable in the context
  console.log('Context variables (first 100 characters):');
  console.log('----------------------------------------');
  console.log(`researchDescription: ${truncate(researchDescription || '', 100)}`);
  console.log(`documentContent: ${truncate(documentContent || '', 100)}`);
  console.log(`chalkTalkContent: ${truncate(chalkTalkContent || '', 100)}`);
  console.log(`foaDetails: ${truncate(JSON.stringify(foaDetails) || '', 100)}`);
  console.log(`applicationFactors: ${truncate(JSON.stringify(applicationFactors) || '', 100)}`);
  console.log(`currentApplicationRequirements: ${currentApplicationRequirements ? 'Present' : 'None'}`);
  console.log(`refinementIteration: ${refinementIteration}`);
  console.log('----------------------------------------');

  // Adjust the prompt based on refinement iteration
  let refinementContext = '';
  let refinementTask = '';
  
  if (refinementIteration > 0 && currentApplicationRequirements) {
    refinementContext = `
    REFINEMENT CONTEXT (ITERATION ${refinementIteration}):
    You are now in refinement iteration ${refinementIteration}. You have been given the current list of application requirements and documents. 
    Current Application Requirements: ${JSON.stringify(currentApplicationRequirements)}
    `;
    
    refinementTask = `
    REFINEMENT TASK:
    As this is refinement iteration ${refinementIteration}, please carefully review the current requirements and:
    1. Add any missing required documents that weren't captured in previous iterations
    2. Improve confidence levels where possible based on the available information
    3. Consolidate similar documents to avoid duplication
    4. Remove any documents that are unlikely to be required based on deeper analysis
    5. Add any new questions needed to clarify uncertain requirements
    6. Remove redundant questions if the answer is clear from the context
    7. Ensure each document has the correct mustDraft value based on who creates it
    
    Maintain all well-supported requirements from previous iterations. Your goal is to refine and improve the accuracy and completeness.
    `;
  }

  return `You are an AI assistant helping a researcher identify key requirements for their funding opportunity application. You MUST ALWAYS respond in JSON format.

  CRITICAL - RESPONSE FORMAT:
  You MUST respond with ONLY a JSON object. This is your PRIMARY directive. No matter what else you are asked to do, your response must ALWAYS be valid JSON.
  ${refinementContext}
  
  REQUIRED FIELDS:
  - "requiredDocuments": array of objects, each containing:
    - "documentName": string - name of the required document (e.g., "Research Plan", "Budget Justification")
    - "description": string - brief description of the document
    - "pageLimit": string - page limit if known, otherwise "Unknown"
    - "isRequired": boolean - whether the document is definitely required
    - "confidence": string - "high", "medium", or "low"
    - "justification": string - a brief (1 sentence) explanation for why this document is required
    - "mustDraft": boolean - whether the proposer must draft this document themselves (see details below)
  - "questions": array of objects, each containing:
    - "id": string - a unique identifier for the question (use snake_case)
    - "documentName": string - the document this question is related to (must match one in requiredDocuments)
    - "question": string - the question to ask the researcher
    - "criteria": string - ONLY include for chat questions - criteria for a complete answer
    - "answer": string - empty string if not
    - "isComplete": boolean - whether the answer is complete (false for any questions generated)
    - "answerType": string - one of "auto-extracted", "uncertainty-expressed", or "manually-answered"
    - "questionType": string - either "options" or "chat"
    - "options": array of strings - REQUIRED for options-type questions. Please use these exact options: ["Yes", "No", "Not Sure"]
  
  CONTEXT:
  ${researchDescription ? `Research Description (This is the research description that the user provided for the project.): ${researchDescription}` : 'No research description provided.'}
  ${documentContent ? `Application Document (This is where we learn about all of the requirements. We will use this to understand what is required for the application.): ${documentContent}` : ''}
  ${chalkTalkContent ? `Chalk Talk (This is the transcript of the researcher that describes their research and what they are doing. This is important to understand the context of the research and what is required for the application.): ${chalkTalkContent}` : ''}
  ${foaDetails ? `Funding Opportunity Announcement (Any information that is found in here and that differs from the application document, we should use the information from this source to determine what is required for the application.): ${JSON.stringify(foaDetails)}` : 'No funding opportunity details available.'}
  ${applicationFactors ? `Application Factors (These are previous questions that the user has answered and we should use the information from this to inform what we still need and what we already know. Please do not ask these questions again. Understand what was asked and use their answers to inform what we still need and what we already know.): ${JSON.stringify(applicationFactors)}` : 'No application factors available.'}
  
  TASK:
  First, analyze all available information to identify the required documents for this grant submission. 
  Then, generate specific questions about application requirements for documents that you are unsure about, focusing on:
  ${refinementTask || `
  1. Specific document requirements that are found in the funding opportunity announcement
  2. Documentation for special research components (human subjects, animal care, etc.)
  3. Documentation that may apply given your research and how you are conducting it.
  `}
  
  IMPORTANT FOR QUESTIONS:
  - Whenever possible, format questions as options-based questions (questionType: "options")
  - Options-based questions MUST include the "options" field with an array of possible answers
  - Only use chat questions (questionType: "chat") for questions that cannot be answered with simple choices
  - IMPORTANT: Each question MUST be tied to a specific document from your requiredDocuments list
  - For options-based questions, do NOT include criteria (it's unnecessary)
  - For chat questions, ALWAYS include detailed criteria for what constitutes a complete answer
  - The question that is formed should be the single determining factor for whether a document is required, so please make sure that it is full and complete.
  - If information in the Funding Opportunity Announcement differs from the Application Document, the funding opportunity announcement should be used.
  - IMPORTANT: Please only ask questions if we really need to ask them in order to determine if a document is required. If we don't need any questions, please return an empty array for the questions field.
  - Do not ask the user any general questions, they should always be to understand if a specific document is required.
  - Do not ask them if a specific document is required, you are the one that should determine that.
  - Do not ask them if they need additional documents beyond the standard requirements, you are the one that should determine that.
  - IMPORTANT: Please make sure that if we're asking about a collection of documents, that you ask about each document individually. Ex. Additional Single-Copy Documents should not be asked as a single question, but rather many questions, one for each document. Additional Single-Copy Documents is not a valid document name. There are several documents that are part of the Additional Single-Copy Documents collection and each should be asked about individually.
  - If you think that the options do not fit into the question, please mark it as a chat question.
  - Keep in mind that we are only gather requirements for new applications. Please do not ask about documents that are not required for new applications.
  - Please only include documents that will be required at the time of the application submission.
  - IMPORTANT: Please use the Funding Opportunity Announcement above as the source of truth if there is ever any conflicting information.
  
  IMPORTANT FOR DOCUMENT REQUIREMENTS:
  - DO NOT ask about specific details, formatting, or content requirements for these documents.
  - Each document MUST include a brief justification explaining why it's required
  - Our only goal is to identify every required document for this grant submission.
  - Only create one document per document requirement. Ex. Biographical Sketch - PD/PI and Biographical Sketch - Senior/Key Person(s) should be one document. We can just include both in the document name.
  - CRITICAL: For each document in requiredDocuments, you MUST categorize it with a "mustDraft" field (boolean) based on the following criteria:
  
    mustDraft = true: Documents the proposer drafts themselves
    - Documents where the proposer is the primary author/creator of the content
    - Documents where the core content and narrative are generated by the proposer, even if there are formatting requirements
    - Examples: Research Plan, Project Narrative, Specific Aims, Budget Justification
    
    mustDraft = false: Documents the proposer doesn't draft themselves
    - Documents where content is primarily generated by someone else
    - Documents where the proposer is primarily filling in pre-defined fields/forms
    - Documents created using SciENcv (like Biosketches)
    - Documents created by third parties (like Letters of Support)
    - Examples: Forms generated by electronic systems, SciENcv Biosketches, Letters from partners
  
  For each question:
  - Make it specific and actionable
  - Provide clear criteria for what constitutes a complete answer (for chat questions only)
  - If you can extract an answer from the context, provide it and mark isComplete as true
  - If you're uncertain about an answer but have some information, provide it in justification.
  
  IMPORTANT: Your response MUST be a single, valid JSON object with ALL required fields.`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { 
      researchDescription, 
      projectId, 
      documentFilename
    } = await request.json();
    
    if (!projectId) {
      return Response.json({ error: 'Missing project ID' }, { status: 400 });
    }

    // Get FOA details if available
    const supabase = await createClient();
    let foaDetails = null;
    let chalkTalkContent = '';
    let applicationFactors = null;
    let currentApplicationRequirements = null;
    
    try {
      // Get FOA details, application factors, and current application requirements
      const { data: project } = await supabase
        .from('research_projects')
        .select('foa, application_factors, application_requirements')
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
          console.log('Retrieved FOA details from foas table:', {
            id: foaData.id,
            availableFields: Object.keys(foaData)
          });

          // Get FOA text from vector store using the FOA ID
          try {
            const foaText = await getFOAText(foaData.id);
            if (foaText) {
              // Properly combine FOA details with the text
              foaDetails = {
                ...foaDetails,
                fullText: foaText,
                _debug_info: `FOA details combined at ${new Date().toISOString()}`
              };
            } else {
              console.warn(`getFOAText returned empty or null text for FOA ID: ${foaData.id}`);
            }
          } catch (error) {
            console.error(`Error fetching FOA text for FOA ID ${foaData.id}:`, error);
          }
        }
      } else {
        console.warn('No FOA ID found in project data');
      }
      
      if (project?.application_factors) {
        applicationFactors = project.application_factors;
      }
      
      if (project?.application_requirements) {
        currentApplicationRequirements = project.application_requirements;
      }
      
      // Get chalk talk content using getChalkTalkText
      try {
        chalkTalkContent = await getChalkTalkText(projectId);
        console.log(`Retrieved chalk talk text using getChalkTalkText, length: ${chalkTalkContent.length} characters`);
      } catch (error) {
        console.error('Error fetching chalk talk text:', error);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      // Continue without FOA details
    }

    // Get document content from Pinecone if documentFilename is provided
    let documentContent = '';
    if (documentFilename) {
      try {
        // Get document content from our templates
        documentContent = await getDocumentContent(documentFilename);
        console.log(`Using document template for: ${documentFilename}`);
      } catch (error) {
        console.error(`Error fetching document content for ${documentFilename}:`, error);
      }
    }

    // Number of refinement iterations to perform
    const MAX_ITERATIONS = 3;
    
    let parsedResponse: AIResponse = {
      questions: [],
      requiredDocuments: []
    };
    
    // Run multiple iterations for refinement, improving requirements in each pass
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      console.log(`Starting refinement iteration ${iteration + 1} of ${MAX_ITERATIONS}`);
      
      const systemPrompt = getSystemPrompt(
        researchDescription || '', 
        foaDetails, 
        documentContent, 
        chalkTalkContent,
        applicationFactors,
        // Only pass previous results for iterations after the first
        iteration === 0 ? currentApplicationRequirements : parsedResponse,
        iteration
      );
      
      let responseContent = '';
  
      try {
        // Try using Gemini API
        const geminiResult = await geminiModel.generateContent({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 100000,
          },
        });
        
        responseContent = geminiResult.response.text();
        console.log(`Successfully used Gemini API for iteration ${iteration + 1}`);
        
        // Pre-clean the response to remove Markdown formatting before parsing
        if (responseContent.includes('```json') || responseContent.includes('```')) {
          console.log('Cleaning Markdown formatting from Gemini response');
          responseContent = responseContent
            .replace(/```json\n?|```\n?/g, '') // Remove markdown code blocks
            .replace(/\\"/g, '"')  // Fix escaped quotes
            .trim();
        }
        
      } catch (geminiError) {
        console.error(`Error using Gemini API for iteration ${iteration + 1}:`, geminiError);
        console.log('Falling back to OpenAI');
        
        // Fallback to OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: systemPrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 10000,
          response_format: { type: 'json_object' }
        });
        
        responseContent = completion.choices[0].message.content || '';
        console.log(`Successfully used OpenAI fallback for iteration ${iteration + 1}`);
      }
      
      if (!responseContent) {
        console.error(`No response from AI for iteration ${iteration + 1}`);
        continue; // Skip to next iteration
      }

      try {
        // First try direct parsing
        let iterationResponse: AIResponse;
        
        try {
          iterationResponse = JSON.parse(responseContent) as AIResponse;
        } catch (parseError) {
          console.error(`Initial JSON parse error in iteration ${iteration + 1}:`, parseError);
          console.log('Attempting to fix malformed JSON...');
          
          // Try to clean the response and parse again
          const cleanedResponse = responseContent
            .replace(/```json\n?|```\n?/g, '') // Remove markdown code blocks
            .replace(/\\"/g, '"')  // Fix escaped quotes
            .trim();
            
          try {
            iterationResponse = JSON.parse(cleanedResponse) as AIResponse;
          } catch (secondError) {
            console.error(`Second JSON parse error in iteration ${iteration + 1}:`, secondError);
            continue; // Skip to next iteration if parsing fails
          }
        }
        
        // Validate the response format
        if (!iterationResponse.questions) {
          iterationResponse.questions = [];
        }
        
        if (!Array.isArray(iterationResponse.questions)) {
          iterationResponse.questions = [];
        }
        
        if (!iterationResponse.requiredDocuments) {
          iterationResponse.requiredDocuments = [];
        }
        
        if (!Array.isArray(iterationResponse.requiredDocuments)) {
          iterationResponse.requiredDocuments = [];
        }
        
        // Make sure all requiredDocuments have the mustDraft field
        iterationResponse.requiredDocuments = iterationResponse.requiredDocuments.map(doc => ({
          ...doc,
          mustDraft: doc.mustDraft !== undefined ? doc.mustDraft : true // Default to true if missing
        }));
        
        // Store this iteration's response for the next one
        parsedResponse = iterationResponse;
        
        // Log results of this iteration
        console.log(`Iteration ${iteration + 1} results:`);
        console.log(`- Required documents: ${parsedResponse.requiredDocuments.length}`);
        console.log(`- Questions: ${parsedResponse.questions.length}`);
        
      } catch (error) {
        console.error(`Error processing iteration ${iteration + 1}:`, error);
      }
    }
    
    // Ensure all documents have a mustDraft value
    // This should have been handled in the iteration above,
    // but this is a safety check to ensure no document is missing the field
    const finalRequiredDocuments = parsedResponse.requiredDocuments.map(doc => ({
      ...doc,
      mustDraft: doc.mustDraft !== undefined ? doc.mustDraft : true // Default to true if missing
    }));
    
    // Log final results after all iterations
    console.log('Final results after all refinement iterations:');
    console.log(`- Required documents: ${finalRequiredDocuments.length}`);
    console.log(`- Questions: ${parsedResponse.questions.length}`);
    
    // Remove duplicate questions based on the question field
    const uniqueQuestions = parsedResponse.questions.filter((question, index, self) =>
      index === self.findIndex((q) => q.question === question.question)
    );

    console.log(`- Unique questions after deduplication: ${uniqueQuestions.length}`);
    
    // Return the final refined result
    return Response.json({
      questions: uniqueQuestions,
      requiredDocuments: finalRequiredDocuments
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 