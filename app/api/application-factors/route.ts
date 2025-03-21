import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { NextRequest } from 'next/server';

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

// Define the structure for application factors
interface ApplicationFactors {
  completed?: boolean;
  updatedAt?: string;
  questions?: QuestionAnswer[];
  currentQuestionIndex?: number;
}

// Main question topics with descriptions
const QUESTION_TOPICS: Record<string, string> = {
  'agency_alignment': 'Alignment with funding agencies like NIH or NSF based on research focus',
  'specific_institute': 'Targeting specific institutes, centers, or directorates within funding agencies',
  'grant_type': 'Suitable grant mechanisms for the research project',
  'applicant_characteristics': 'Organization type and special characteristics relevant for funding',
  'project_management': 'Project structure in terms of leadership and collaboration',
  'ethical_compliance': 'Ethical and regulatory considerations for the research',
  'research_location': 'Geographical considerations for where the research will be conducted'
};

function getSystemPrompt(researchDescription: string, currentQuestion?: string, criteria?: string, autoAnalyze?: boolean, questions?: QuestionAnswer[], currentQuestionContext?: string, chalkTalkTranscription?: string): string {
  const basePrompt = `You are an AI assistant helping a researcher identify key factors for matching their research with appropriate funding opportunities. You MUST ALWAYS respond in JSON format.

  CRITICAL - RESPONSE FORMAT:
  You MUST respond with ONLY a JSON object. This is your PRIMARY directive. No matter what else you are asked to do, your response must ALWAYS be valid JSON.
  
  REQUIRED FIELDS - ALL OF THESE MUST BE PRESENT:
  - "isAnswerComplete": boolean - whether the answer meets all criteria
  - "finalAnswer": string - the extracted answer that meets criteria (empty if incomplete)
  - "confidence": string - must be "high"
  - "isUncertaintyExpressed": boolean - whether uncertainty is expressed in the answer
  - "meetsCriteria": boolean - whether the answer meets all specified criteria
  - "missingCriteria": array - list of missing criteria (empty array if complete)
  - "message": string - REQUIRED - contains your response, suggestions, and questions to the user

  EXAMPLE RESPONSE FORMAT:
  {
    "isAnswerComplete": false,
    "finalAnswer": "",
    "confidence": "high",
    "isUncertaintyExpressed": false,
    "meetsCriteria": false,
    "missingCriteria": ["specific grant mechanisms"],
    "message": "For your research on advancing biomedical research and biotechnology, the following grant mechanisms may be suitable: R01 for traditional research projects, R21 for exploratory research, and R03 for small research projects. Would you like to proceed with any of these suggestions?"
  }

  Research Description:
  ${researchDescription || 'No research description provided yet.'}`;

  // If we're doing batch analysis, use a different format
  if (questions) {
    let promptWithChalkTalk = `${basePrompt}
    
    Your task is to analyze this research description and determine what information can be extracted to answer the following questions.
    For each question, provide a JSON assessment.`;

    // Add chalk talk transcription if available
    if (chalkTalkTranscription) {
      promptWithChalkTalk += `
    
    Chalk Talk Transcription:
    ${chalkTalkTranscription}`;
    }

    promptWithChalkTalk += `
    
    Questions to analyze:
    ${questions.map(q => `
    ID: ${q.id}
    Question: ${q.question}
    Criteria: ${q.criteria}
    `).join('\n')}
    
    CRITICAL - RESPONSE FORMAT:
    You MUST respond with ONLY a JSON array containing an assessment for each question in this exact format:
    [
      {
        "questionId": "the_question_id",
        "isAnswerComplete": true/false,
        "finalAnswer": "extracted answer if complete, empty string if incomplete",
        "confidence": "high",
        "isUncertaintyExpressed": false,
        "meetsCriteria": true/false,
        "missingCriteria": []
      },
      ...
    ]
    
    DO NOT include any text before or after the JSON array.
    DO NOT include any markdown formatting.
    DO NOT add any explanatory text.
    ONLY return the JSON array.`;

    return promptWithChalkTalk;
  }

  const contextAndRules = currentQuestion ? 
    `
    Current Context:
    - Topic: ${currentQuestion} - ${QUESTION_TOPICS[currentQuestion] || 'aspects of the research project'}
    - Question: ${currentQuestionContext || ''}
    - Criteria: ${criteria}

    Response Rules (ALL responses must still be in JSON format):
    1. Look through ALL messages in the conversation for this question
    2. When users agree to suggestions (saying "yes", "okay", "let's do that", etc.), use those suggestions as their answer
    3. If you provided options and the user accepted them, extract those options as the answer
    4. Only extract information that directly answers the question according to the criteria
    5. Put ALL helpful responses, suggestions, and questions in the "message" field
    6. Keep the "finalAnswer" field concise and only containing information that meets the criteria
    7. Use the "message" field for any additional context, explanations, or follow-up questions
    8. Never use a user's question as an answer. Even if you've offered suggestions. 
    9. Only discuss NIH or NSF grants
    10. Never mark an answer as complete if we just asked a question.

    IMPORTANT: Your response MUST be a single, valid JSON object with ALL required fields.` : '';

  return `${basePrompt}${contextAndRules}`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { 
      messages, 
      researchDescription, 
      currentQuestion, 
      projectId, 
      autoAnalyze, 
      criteria, 
      analyzeAll, 
      questions,
      currentQuestionContext 
    } = await request.json();
    
    if (!projectId) {
      return Response.json({ error: 'Missing project ID' }, { status: 400 });
    }

    // Handle batch analysis of all questions
    if (analyzeAll && questions) {
      // Get chalk talk transcription if available
      const supabase = await createClient();
      let chalkTalkTranscription = '';
      
      try {
        const { data: chalkTalks } = await supabase
          .from('chalk_talks')
          .select('transcription')
          .eq('project_id', projectId)
          .order('uploaded_at', { ascending: false })
          .limit(1);
          
        if (chalkTalks && chalkTalks.length > 0 && chalkTalks[0].transcription) {
          chalkTalkTranscription = chalkTalks[0].transcription;
          console.log('Found chalk talk transcription, length:', chalkTalkTranscription.length);
        }
      } catch (error) {
        console.error('Error fetching chalk talk transcription:', error);
        // Continue without chalk talk transcription
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: getSystemPrompt(researchDescription || '', undefined, undefined, undefined, questions, undefined, chalkTalkTranscription) 
          }
        ],
        temperature: 0.1,
      });

      try {
        const response = completion.choices[0]?.message?.content || '[]';
        let assessments: any[];
        
        try {
          // First try parsing directly
          assessments = JSON.parse(response);
          
          // Verify it's an array
          if (!Array.isArray(assessments)) {
            throw new Error('Response is not an array');
          }

          // Log the parsed assessments
          console.log('Batch Analysis - Parsed OpenAI Response:', JSON.stringify(assessments, null, 2));
        } catch (parseError) {
          // If direct parsing fails, try cleaning the response
          const cleanedResponse = response
            .replace(/```json\n?|```\n?/g, '')
            .trim();
          
          assessments = JSON.parse(cleanedResponse);
          
          // Verify again it's an array
          if (!Array.isArray(assessments)) {
            throw new Error('Cleaned response is not an array');
          }

          // Log the parsed assessments after cleaning
          console.log('Batch Analysis - Parsed OpenAI Response (after cleaning):', JSON.stringify(assessments, null, 2));
        }
        
        return Response.json({
          results: assessments.map(assessment => ({
            questionId: assessment.questionId,
            isAnswerComplete: assessment.meetsCriteria || assessment.isUncertaintyExpressed,
            finalAnswer: assessment.finalAnswer,
            missingCriteria: assessment.missingCriteria || []
          }))
        });
      } catch (error) {
        console.error('Error processing batch analysis:', error);
        console.error('Raw response:', completion.choices[0]?.message?.content);
        return Response.json({ 
          error: 'Failed to process batch analysis',
          results: [] 
        });
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
          content: getSystemPrompt(researchDescription || '', currentQuestion, criteria, autoAnalyze, undefined, currentQuestionContext) 
        },
        ...(messages || [])
      ],
      temperature: 0.1,
    });

    try {
      const response = completion.choices[0]?.message?.content || '';
      let assessment: any;

      try {
        // First try parsing directly
        assessment = JSON.parse(response);
      } catch (parseError) {
        // If direct parsing fails, try cleaning the response
        console.log('Initial parse failed, attempting to clean response');
        const cleanedResponse = response
          .replace(/```json\n?|```\n?/g, '') // Remove markdown code blocks
          .replace(/^[^{]*({.*})[^}]*$/, '$1') // Extract just the JSON object
          .trim();
        
        try {
          assessment = JSON.parse(cleanedResponse);
        } catch (cleanError) {
          console.error('Failed to parse even after cleaning:', cleanError);
          console.error('Raw response:', response);
          console.error('Cleaned response:', cleanedResponse);
          throw new Error('Failed to parse response as JSON');
        }
      }

      // Validate the response has the required fields
      if (!assessment || typeof assessment !== 'object') {
        throw new Error('Response is not a valid JSON object');
      }

      // Ensure all required fields are present
      const requiredFields = ['isAnswerComplete', 'finalAnswer', 'isUncertaintyExpressed', 'meetsCriteria', 'message'];
      const missingFields = requiredFields.filter(field => !(field in assessment));
      if (missingFields.length > 0) {
        throw new Error(`Response is missing required fields: ${missingFields.join(', ')}`);
      }

      // Log the parsed response for single question analysis
      console.log('Single Question Analysis - Parsed OpenAI Response:', JSON.stringify(assessment, null, 2));
      
      return Response.json({
        message: assessment.message || '',
        isAnswerComplete: assessment.meetsCriteria || assessment.isUncertaintyExpressed,
        finalAnswer: assessment.finalAnswer || '',
        missingCriteria: assessment.missingCriteria || []
      });
    } catch (error: any) {
      console.error('Error processing response:', error);
      return Response.json({
        message: `Error processing response: ${error.message}. Please try again.`,
        isAnswerComplete: false,
        finalAnswer: '',
        missingCriteria: []
      });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 