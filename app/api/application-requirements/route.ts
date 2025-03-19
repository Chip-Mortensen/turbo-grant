import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { getDocumentContent } from '@/lib/project-document-processing/document-templates';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the structure for questions and answers
interface QuestionAnswer {
  id: string;
  question: string;
  criteria: string;
  answer: string;
  completed: boolean;
  answerType?: 'auto-extracted' | 'uncertainty-expressed' | 'manually-answered';
}

// Define the structure for required documents
interface RequiredDocument {
  documentName: string;
  description: string;
  pageLimit: string;
  formatRequirements: string;
  isRequired: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// Define the structure for application requirements
interface ApplicationRequirements {
  completed?: boolean;
  updatedAt?: string;
  questions?: QuestionAnswer[];
  currentQuestionIndex?: number;
  requiredDocuments?: RequiredDocument[];
}

function getSystemPrompt(
  researchDescription: string, 
  currentQuestion: string,
  criteria: string, 
  currentQuestionContext: string, 
  foaDetails: any,
  documentContent: string,
  requiredDocuments: RequiredDocument[],
  applicationFactors: any
): string {
  return `You are an AI assistant helping a researcher complete a grant application requirements analysis.
    
Based on the conversation history and the current question about application requirements, provide the most accurate and helpful response.

${documentContent ? `\n\nApplication Document: ${documentContent}` : ''}
${foaDetails ? `\n\nFunding Opportunity Announcement: ${JSON.stringify(foaDetails)}` : ''}
${applicationFactors ? `\n\nApplication Factors: ${JSON.stringify(applicationFactors)}` : ''}
${requiredDocuments && requiredDocuments.length > 0 ? `\n\nRequired Documents: ${JSON.stringify(requiredDocuments)}` : ''}

Current Question: "${currentQuestion}"
${criteria ? `Criteria for a complete answer: ${criteria}` : ''}
${currentQuestionContext ? `Additional Context: ${currentQuestionContext}` : ''}

Analyze the information provided and give a direct answer to the current question. If you detect an answer in the information provided, extract it. If the information is unclear, admit uncertainty and provide your best assessment. 

Your response will be parsed to extract:
1. A message to display to the user
2. A final answer to the question
3. Whether the answer is complete
4. The type of answer (auto-extracted, uncertainty-expressed, or manually-answered)

Respond in the following JSON format:
{
  "message": "Your message to display to the user",
  "finalAnswer": "The final answer to the question that will be saved",
  "isAnswerComplete": true or false,
  "answerType": "auto-extracted", "uncertainty-expressed", or "manually-answered"
}`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { 
      messages, 
      researchDescription, 
      currentQuestion, 
      projectId, 
      criteria, 
      currentQuestionContext,
      documentFilename,
      requiredDocuments
    } = await request.json();
    
    if (!projectId) {
      return Response.json({ error: 'Missing project ID' }, { status: 400 });
    }

    // Get FOA details if available
    const supabase = await createClient();
    let foaDetails = null;
    let applicationFactors = null;
    
    try {
      const { data: project } = await supabase
        .from('research_projects')
        .select('foa, application_factors')
        .eq('id', projectId)
        .single();
        
      if (project?.foa) {
        foaDetails = project.foa;
      }
      
      if (project?.application_factors) {
        applicationFactors = project.application_factors;
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      // Continue without FOA details or application factors
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

    // Handle single question analysis
    if (!currentQuestion) {
      return Response.json({ error: 'Missing question ID' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: getSystemPrompt(
            researchDescription || '', 
            currentQuestion, 
            criteria || '', 
            currentQuestionContext || '', 
            foaDetails, 
            documentContent,
            requiredDocuments || [],
            applicationFactors
          ) 
        },
        ...(messages || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content || '';
    
    try {
      // Try to parse the response as JSON
      let parsedResponse;
      
      try {
        // First try parsing directly
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        // If direct parsing fails, try cleaning the response
        const cleanedResponse = response
          .replace(/```json\n?|```\n?/g, '')
          .trim();
        
        parsedResponse = JSON.parse(cleanedResponse);
      }
      
      // Validate the response has the required fields
      if (!parsedResponse.hasOwnProperty('isAnswerComplete') || 
          !parsedResponse.hasOwnProperty('finalAnswer') || 
          !parsedResponse.hasOwnProperty('message')) {
        throw new Error('Response missing required fields');
      }
      
      return Response.json(parsedResponse);
    } catch (error) {
      console.error('Error parsing response:', error);
      console.error('Raw response:', response);
      
      // Return a fallback response
      return Response.json({
        isAnswerComplete: false,
        finalAnswer: '',
        confidence: 'high',
        isUncertaintyExpressed: false,
        meetsCriteria: false,
        missingCriteria: ['parsing error'],
        message: 'I apologize, but I encountered an error processing your response. Could you please rephrase or provide more details?'
      });
    }
  } catch (error) {
    console.error('Error in application-requirements API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 