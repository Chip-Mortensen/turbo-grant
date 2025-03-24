import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { getResearchDescriptionText, getChalkTalkText } from '@/lib/project-document-processing/query';
import { 
  NihGrantType, 
  NsfProposalType, 
  nihGrantTypeDescriptions, 
  getNihGrantTypes, 
  getNsfProposalTypes, 
  getNihGrantTypeDescription,
  nsfProposalTypeLabels
} from '@/types/enum-types';

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
  progress?: number;
  totalQuestions?: number;
  completedQuestions?: number;
  recommendedGrants?: {
    agencyType: string;
    organizationType: string;
    recommendedGrants: Array<{
      code: string;
    }>;
  };
  recommendationsUpdatedAt?: string;
}

function getSystemPrompt(researchDescription: string, applicationFactors: ApplicationFactors, chalkTalkText: string): string {
  // Extract the answers from the application factors
  const answers = applicationFactors.questions?.reduce((acc, qa) => {
    acc[qa.id] = qa.answer;
    return acc;
  }, {} as Record<string, string>) || {};
  
  // Extract agency alignment from the answers
  const agencyAlignment = answers['agency_alignment'] || '';
  // Extract organization type from the answers
  const organizationType = answers['applicant_characteristics'] || '';
  
  // Get all NIH grant types with descriptions
  const nihGrantTypes = getNihGrantTypes();
  const nihGrantsInfo = nihGrantTypes
    .map(code => {
      const description = getNihGrantTypeDescription(code);
      return description && description !== 'Description not available' 
        ? { code: code.toString(), description } 
        : null;
    })
    .filter(Boolean) as Array<{code: string, description: string}>;
  
  // Get all NSF proposal types with labels
  const nsfProposalTypes = getNsfProposalTypes();
  const nsfGrantsInfo = nsfProposalTypes
    .map(code => {
      const description = nsfProposalTypeLabels[code];
      return description 
        ? { code: code.toString(), description } 
        : null;
    })
    .filter(Boolean) as Array<{code: string, description: string}>;
    
  // Determine which grant types to include based on agency alignment
  let grantsToShow: Array<{code: string, description: string}> = [];
  
  // Include grants based on agency alignment
  const agencyLower = agencyAlignment.toLowerCase();
  if (agencyLower.includes('nih') || agencyLower.includes('both')) {
    grantsToShow = [...grantsToShow, ...nihGrantsInfo];
  }
  
  if (agencyLower.includes('nsf') || agencyLower.includes('both')) {
    grantsToShow = [...grantsToShow, ...nsfGrantsInfo];
  }
  
  // If no agency is specified, include all
  if (!agencyAlignment || (!agencyLower.includes('nih') && !agencyLower.includes('nsf'))) {
    grantsToShow = [...nihGrantsInfo, ...nsfGrantsInfo];
  }

  return `You are an AI assistant helping a researcher identify appropriate grant types based on their research and application factors.

    Research Description:
    ${researchDescription || 'No research description provided.'}

    Chalk Talk Text:
    ${chalkTalkText || 'No chalk talk transcription available.'}

    Available Grant Types:
    ${JSON.stringify(grantsToShow)}

    Based on the application factors and research description, recommend ONLY the most appropriate grant types for this researcher. Focus on quality over quantity - include only grants that are highly relevant to the research. Do not include grants that are a poor fit or only tangentially related. We can add as many grants as you think are relevant, but please be thoughtful about it.

    Respond with a JSON object that ONLY contains a "recommendedGrants" array with grant types, each containing ONLY the "code" field.

    Example format:
    {
    "recommendedGrants": [
        {
        "code": "R01"
        },
        {
        "code": "R03"
        }
    ]
    }`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return Response.json({ error: 'Missing project ID' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get the application factors from the database
    const { data: project, error } = await supabase
      .from('research_projects')
      .select('application_factors')
      .eq('id', projectId)
      .single();
    
    if (error) {
      console.error('Error fetching application factors:', error);
      return Response.json({ error: 'Failed to fetch application factors' }, { status: 500 });
    }
    
    if (!project?.application_factors?.completed) {
      return Response.json({ 
        error: 'Application factors are not complete', 
        applicationFactorsComplete: false 
      }, { status: 400 });
    }

    // Get research description text
    let researchDescription = '';
    try {
      researchDescription = await getResearchDescriptionText(projectId);
      console.log(`Retrieved research description, length: ${researchDescription.length} characters`);
    } catch (error) {
      console.error('Error getting research description:', error);
    }

    // Get chalk talk text
    let chalkTalkText = '';
    try {
      chalkTalkText = await getChalkTalkText(projectId);
      console.log(`Retrieved chalk talk text, length: ${chalkTalkText.length} characters`);
    } catch (error) {
      console.error('Error getting chalk talk text:', error);
    }

    // Call OpenAI to analyze and recommend grant types
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: getSystemPrompt(researchDescription, project.application_factors, chalkTalkText) 
        }
      ],
      temperature: 0.1,
    });

    try {
      const response = completion.choices[0]?.message?.content || '';
      let recommendations: any;

      try {
        // First try parsing directly
        recommendations = JSON.parse(response);
      } catch (parseError) {
        // If direct parsing fails, try cleaning the response
        console.log('Initial parse failed, attempting to clean response');
        const cleanedResponse = response
          .replace(/```json\n?|```\n?/g, '') // Remove markdown code blocks
          .replace(/^[^{]*({.*})[^}]*$/, '$1') // Extract just the JSON object
          .trim();
        
        try {
          recommendations = JSON.parse(cleanedResponse);
        } catch (cleanError) {
          console.error('Failed to parse even after cleaning:', cleanError);
          console.error('Raw response:', response);
          console.error('Cleaned response:', cleanedResponse);
          throw new Error('Failed to parse response as JSON');
        }
      }

      // Log the parsed response
      console.log('Grant Recommendations - Parsed OpenAI Response:', JSON.stringify(recommendations, null, 2));
      
      // Fetch the current application factors first
      const { data: currentProject, error: fetchError } = await supabase
        .from('research_projects')
        .select('application_factors')
        .eq('id', projectId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching current application factors:', fetchError);
        return Response.json({
          error: 'Failed to fetch current application factors',
          recommendations,
          success: true
        });
      }
      
      // Extract agency alignment and organization type from the application factors
      const answers = currentProject.application_factors.questions?.reduce((acc: Record<string, string>, qa: QuestionAnswer) => {
        acc[qa.id] = qa.answer;
        return acc;
      }, {} as Record<string, string>) || {};
      
      const agencyAlignment = answers['agency_alignment'] || '';
      const organizationType = answers['applicant_characteristics'] || '';
      const userMentionedGrants = answers['grant_type'] || '';
      
      // Extract grant codes from user's answer
      let preferredGrantCodes: string[] = [];
      if (userMentionedGrants) {
        // Pattern to match grant codes like R01, R21, CAREER, etc.
        const grantCodePattern = /\b([A-Z][0-9]{2}|[A-Z]\d{2}\/[A-Z]\d{2}|CAREER|EAGER|RAPID|RAISE|GOALI|SBIR|STTR)\b/gi;
        const matches: RegExpMatchArray | null = userMentionedGrants.match(grantCodePattern);
        if (matches) {
          // Type assertion to tell TypeScript that each match is a string
          preferredGrantCodes = matches.map((code: string) => code.toUpperCase());
        }
      }
      
      // Determine agency type
      let agencyType = 'Both';
      const agencyLower = agencyAlignment.toLowerCase();
      console.log('Raw agency alignment from answer:', agencyAlignment);
      console.log('Lowercase agency alignment:', agencyLower);
      
      if (agencyLower.includes('nih') && !agencyLower.includes('nsf')) {
        agencyType = 'NIH';
      } else if (agencyLower.includes('nsf') && !agencyLower.includes('nih')) {
        agencyType = 'NSF';
      } else if (agencyLower.includes('both') || (agencyLower.includes('nsf') && agencyLower.includes('nih'))) {
        agencyType = 'Both';
      }
      
      console.log('Determined agency type:', agencyType);
      
      // Make sure user-specified grants are prioritized
      let recommendedGrants = recommendations.recommendedGrants || [];
      
      // Make sure that preferred grants are included
      if (preferredGrantCodes.length > 0) {
        // Create a Set of existing codes for O(1) lookup
        const existingCodes = new Set(recommendedGrants.map((g: {code: string}) => g.code));
        
        // Add user's preferred grants that don't already exist
        for (const code of preferredGrantCodes) {
          if (!existingCodes.has(code)) {
            recommendedGrants.unshift({ code });
            existingCodes.add(code);
          }
        }
      }

      // For NSF or both agencies, ensure "research" is added as a grant code
      if (agencyType === 'NSF' || agencyType === 'Both') {
        console.log('Backend: Adding "research" as a grant code for agency type:', agencyType);
        console.log('Before modification, grant codes:', recommendedGrants.map((g: {code: string}) => g.code));
        
        // Check if research is already in the list (case insensitive)
        const hasResearch = recommendedGrants.some((grant: {code: string}) => 
          grant.code.toLowerCase() === "research"
        );
        
        // Add research as a separate grant code if not already present
        if (!hasResearch) {
          console.log('Backend: Adding research as a separate grant code');
          recommendedGrants.push({ code: 'research' });
        }
        
        console.log('After modification, grant codes:', recommendedGrants.map((g: {code: string}) => g.code));
      }

      // Update the application factors with the recommendations
      const updatedApplicationFactors = {
        ...currentProject.application_factors,
        recommendedGrants: {
          agencyType,
          organizationType,
          recommendedGrants
        },
        recommendationsUpdatedAt: new Date().toISOString()
      };
      
      // Log the final recommendations
      console.log('Final Grant Recommendations:', {
        agencyType,
        organizationType,
        recommendedGrants: recommendedGrants.map((g: {code: string}) => g.code),
        totalRecommendations: recommendedGrants.length
      });
      
      // Save the updated application factors
      const { error: updateError } = await supabase
        .from('research_projects')
        .update({ 
          application_factors: updatedApplicationFactors
        })
        .eq('id', projectId);
        
      if (updateError) {
        console.error('Error saving grant recommendations:', updateError);
        return Response.json({ 
          error: 'Failed to save grant recommendations',
          recommendations,
          success: true
        });
      }
      
      return Response.json({
        recommendations,
        success: true
      });
    } catch (error: any) {
      console.error('Error processing response:', error);
      return Response.json({
        error: `Error processing response: ${error.message}. Please try again.`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 