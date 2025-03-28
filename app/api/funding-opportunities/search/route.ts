import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPineconeClient } from '@/lib/vectorization/pinecone';
import { generateEmbeddings } from '@/lib/vectorization/openai';

// Helper function to normalize scores
function normalizeScore(score: number): number {
  // Convert cosine similarity (-1 to 1) to a 0-1 range
  const normalized = (score + 1) / 2;
  // Scale to 0-100 range and round to 2 decimal places
  return Math.round(normalized * 100 * 100) / 100;
}

// Helper function to filter FOAs by recommended grants
function filterByRecommendedGrants(foas: any[], recommendedGrantCodes: string[]) {
  if (!recommendedGrantCodes.length) return foas;
  
  const filteredResults = foas.filter(foa => {
    if (!foa.grant_type) return false;
    
    // Check if any of the FOA's grant types match the recommended grant codes
    return recommendedGrantCodes.some(code => {
      // In Pinecone metadata, grant types are stored as grant_R01, grant_R03, etc.
      // But in Supabase they are stored without the prefix
      const grantKey = `grant_${code}`;
      return foa.grant_type[code] === true || // Check Supabase format
             (grantKey in foa.grant_type && foa.grant_type[grantKey] === true); // Check Pinecone format
    });
  });
  
  console.log(`Filtered results by recommended grants: ${filteredResults.length} of ${foas.length}`);
  return filteredResults;
}

export async function GET(request: NextRequest) {
  try {
    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Parse filter parameters
    const agency = searchParams.get('agency') || null;
    const minAward = searchParams.get('minAward') ? parseFloat(searchParams.get('minAward')!) : null;
    const maxAward = searchParams.get('maxAward') ? parseFloat(searchParams.get('maxAward')!) : null;
    const animalTrials = searchParams.get('animalTrials') === 'true' ? true : 
                         searchParams.get('animalTrials') === 'false' ? false : null;
    const humanTrials = searchParams.get('humanTrials') === 'true' ? true : 
                        searchParams.get('humanTrials') === 'false' ? false : null;
    const recommendedGrants = searchParams.get('recommendedGrants') === 'true' ? true : false;
    
    // Parse deadline date
    const deadlineDate = searchParams.get('deadlineDate') ? new Date(searchParams.get('deadlineDate')!) : null;
    
    // Parse organization eligibility filters
    const organizationEligibility = searchParams.get('organization_eligibility') 
      ? JSON.parse(searchParams.get('organization_eligibility')!)
      : null;
    
    // Parse user eligibility filters
    const userPrincipalInvestigator = searchParams.get('userPrincipalInvestigator') === 'true' ? true : null;
    const userPostdoc = searchParams.get('userPostdoc') === 'true' ? true : null;
    const userGraduateStudent = searchParams.get('userGraduateStudent') === 'true' ? true : null;
    const userEarlyCareer = searchParams.get('userEarlyCareer') === 'true' ? true : null;
    
    const projectId = searchParams.get('projectId') || null;

    // Create Supabase client
    const supabase = await createClient();
    
    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('API auth error:', authError);
      return NextResponse.json({
        error: 'Unauthorized',
        foas: [],
        total: 0
      }, { status: 401 });
    }

    // If filtering by recommended grants, fetch the project's recommended grants
    let recommendedGrantCodes: string[] = [];
    if (recommendedGrants && projectId) {
      try {
        // Get the recommended grants from the project's application factors
        const { data: projectData, error: projectError } = await supabase
          .from('research_projects')
          .select('application_factors')
          .eq('id', projectId)
          .single();
        
        if (projectError) {
          console.error('Error fetching project data:', projectError);
        } else if (projectData?.application_factors?.recommendedGrants?.recommendedGrants) {
          // Extract grant codes
          recommendedGrantCodes = projectData.application_factors.recommendedGrants.recommendedGrants
            .map((grant: { code: string }) => grant.code)
            .filter(Boolean);
          
          console.log('Filtering by recommended grants:', recommendedGrantCodes);
        }
      } catch (error) {
        console.error('Error processing recommended grants:', error);
      }
      
      // If no recommended grants found, but filter is enabled, return empty results early
      if (recommendedGrants && recommendedGrantCodes.length === 0) {
        return NextResponse.json({
          foas: [],
          total: 0,
          error: null
        });
      }
    }

    try {
      // Get Pinecone client
      const client = await getPineconeClient();
      const index = client.index(process.env.PINECONE_INDEX_NAME!);
      
      // Build filter object for Pinecone query
      const filter: Record<string, any> = {
        type: 'foa_description'
      };
      
      // Create an array for $and conditions to combine different filter categories
      const andConditions: Record<string, any>[] = [];
      
      // Add filters if provided
      if (agency) {
        andConditions.push({ agency });
      }
      
      // Add award amount filters
      if (minAward !== null && maxAward !== null) {
        // At least one of these conditions should be true:
        // 1. award_floor (if exists) is within the range
        // 2. award_ceiling (if exists) is within the range
        // 3. range completely encompasses the award range (floor to ceiling)
        andConditions.push({
          $or: [
            { award_floor: { $gte: minAward, $lte: maxAward } },
            { award_ceiling: { $gte: minAward, $lte: maxAward } },
            {
              $and: [
                { award_floor: { $lte: minAward } },
                { award_ceiling: { $gte: maxAward } }
              ]
            }
          ]
        });
      } else if (minAward !== null) {
        // Either the floor or ceiling should be >= minAward
        andConditions.push({
          $or: [
            { award_floor: { $gte: minAward } },
            { award_ceiling: { $gte: minAward } }
          ]
        });
      } else if (maxAward !== null) {
        // Either the floor or ceiling should be <= maxAward
        andConditions.push({
          $or: [
            { award_floor: { $lte: maxAward } },
            { award_ceiling: { $lte: maxAward } }
          ]
        });
      }
      
      // Add animal trials filter
      if (animalTrials !== null) {
        andConditions.push({ animal_trials: animalTrials });
      }
      
      // Add human trials filter
      if (humanTrials !== null) {
        andConditions.push({ human_trials: humanTrials });
      }
      
      // Add deadline filter
      if (deadlineDate !== null) {
        // Convert date to Unix timestamp (seconds)
        const timestamp = Math.floor(deadlineDate.getTime() / 1000);
        andConditions.push({ deadline_timestamp: { $lte: timestamp } });
      }
      
      // Add organization eligibility filters
      if (organizationEligibility) {
        // Create an array of conditions for each organization type
        const orgConditions = Object.entries(organizationEligibility)
          .filter(([_, value]) => value !== null)
          .map(([type, value]) => ({
            [`org_${type}`]: value
          }));
        
        if (orgConditions.length > 0) {
          // Use $or to match any of the selected organization types
          andConditions.push({
            $or: orgConditions
          });
        }
      }
      
      // Add user eligibility filters
      if (userPrincipalInvestigator !== null) {
        andConditions.push({ user_pi: userPrincipalInvestigator });
      }
      if (userPostdoc !== null) {
        andConditions.push({ user_postdoc: userPostdoc });
      }
      if (userGraduateStudent !== null) {
        andConditions.push({ user_grad_student: userGraduateStudent });
      }
      if (userEarlyCareer !== null) {
        andConditions.push({ user_senior_personnel: userEarlyCareer });
      }
      
      // Apply all AND conditions if there are any
      if (andConditions.length > 0) {
        filter.$and = andConditions;
      }

      console.log('Using filter:', JSON.stringify(filter, null, 2));

      // If there's no query text, use metadata-only filtering
      if (!query.trim()) {
        // Use Pinecone's list operation for metadata-only filtering
        const listResponse = await index.query({
          filter,
          topK: 1000, // Get all matching results
          includeMetadata: true,
          vector: Array(3072).fill(0) // Required by Pinecone but won't affect results when using pure metadata filtering
        });

        console.log('Pinecone response matches:', listResponse.matches.length);

        // Convert Pinecone matches to FOA format
        let allFoas = listResponse.matches
          .filter(match => match.metadata)
          .map(match => {
            // Extract metadata with type safety
            const metadata = match.metadata!;
            const deadline_timestamp = typeof metadata.deadline_timestamp === 'number' ? metadata.deadline_timestamp : null;
            
            return {
              id: metadata.foaId as string,
              title: metadata.title as string,
              agency: metadata.agency as string,
              description: metadata.text as string,
              foa_code: metadata.foa_code as string,
              deadline: deadline_timestamp ? new Date(deadline_timestamp * 1000).toISOString() : null,
              award_floor: typeof metadata.award_floor === 'number' ? metadata.award_floor : null,
              award_ceiling: typeof metadata.award_ceiling === 'number' ? metadata.award_ceiling : null,
              animal_trials: !!metadata.animal_trials,
              human_trials: !!metadata.human_trials,
              // Convert Pinecone metadata format to grant_type format
              grant_type: Object.entries(metadata)
                .filter(([key]) => key.startsWith('grant_'))
                .reduce((acc, [key, value]) => ({
                  ...acc,
                  [key]: value
                }), {}),
              score: match.score !== undefined ? normalizeScore(match.score) : undefined,
              created_at: (metadata.created_at as string) || new Date().toISOString()
            };
          });

        console.log('Converted FOAs:', allFoas.length);

        // Filter by recommended grants if needed
        if (recommendedGrants && recommendedGrantCodes.length > 0) {
          allFoas = filterByRecommendedGrants(allFoas, recommendedGrantCodes);
          console.log('After recommended grants filter:', allFoas.length);
        }

        // Sort by created_at
        allFoas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Apply pagination AFTER filtering
        const paginatedFoas = allFoas.slice(offset, offset + limit);
        
        return NextResponse.json({
          foas: paginatedFoas,
          total: allFoas.length,
          error: null
        });
      }

      // For text queries, use vector search
      const vector = await generateEmbeddings(query);
      
      // Query Pinecone with larger topK
      const queryResponse = await index.query({
        vector,
        filter,
        topK: 1000, // Get all matching results
        includeMetadata: true
      });
      
      // Convert Pinecone matches to FOA format
      const allFoas = queryResponse.matches
        .filter(match => match.metadata)
        .map(match => {
          // Extract metadata with type safety
          const metadata = match.metadata!;
          const deadline_timestamp = typeof metadata.deadline_timestamp === 'number' ? metadata.deadline_timestamp : null;
          
          return {
            id: metadata.foaId as string,
            title: metadata.title as string,
            agency: metadata.agency as string,
            description: metadata.text as string,
            foa_code: metadata.foa_code as string,
            deadline: deadline_timestamp ? new Date(deadline_timestamp * 1000).toISOString() : null,
            award_floor: typeof metadata.award_floor === 'number' ? metadata.award_floor : null,
            award_ceiling: typeof metadata.award_ceiling === 'number' ? metadata.award_ceiling : null,
            animal_trials: !!metadata.animal_trials,
            human_trials: !!metadata.human_trials,
            // Convert Pinecone metadata format to grant_type format
            grant_type: Object.entries(metadata)
              .filter(([key]) => key.startsWith('grant_'))
              .reduce((acc, [key, value]) => ({
                ...acc,
                [key]: value
              }), {}),
            score: match.score !== undefined ? normalizeScore(match.score) : undefined,
            created_at: (metadata.created_at as string) || new Date().toISOString()
          };
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      // Filter by recommended grants if needed  
      if (recommendedGrants && recommendedGrantCodes.length > 0) {
        const finalResults = filterByRecommendedGrants(allFoas, recommendedGrantCodes);
        
        // Apply pagination AFTER filtering
        const paginatedResults = finalResults.slice(offset, offset + limit);
        
        return NextResponse.json({
          foas: paginatedResults,
          total: finalResults.length,
          error: null
        });
      }
      
      // Apply pagination
      const paginatedFoas = allFoas.slice(offset, offset + limit);
      
      return NextResponse.json({
        foas: paginatedFoas,
        total: allFoas.length,
        error: null
      });
    } catch (error) {
      console.error('Error performing vector search:', error);
      return NextResponse.json({
        error: 'Vector search failed',
        foas: [],
        total: 0
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in FOA search API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      foas: [],
      total: 0
    }, { status: 500 });
  }
} 