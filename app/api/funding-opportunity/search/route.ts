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
    
    // Parse deadline date
    const deadlineDate = searchParams.get('deadlineDate') ? new Date(searchParams.get('deadlineDate')!) : null;
    
    // Parse organization eligibility filters
    const orgHigherEducation = searchParams.get('orgHigherEducation') === 'true' ? true : null;
    const orgNonProfit = searchParams.get('orgNonProfit') === 'true' ? true : null;
    const orgForProfit = searchParams.get('orgForProfit') === 'true' ? true : null;
    const orgGovernment = searchParams.get('orgGovernment') === 'true' ? true : null;
    const orgHospital = searchParams.get('orgHospital') === 'true' ? true : null;
    const orgForeign = searchParams.get('orgForeign') === 'true' ? true : null;
    const orgIndividual = searchParams.get('orgIndividual') === 'true' ? true : null;
    
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

    try {
      // Get Pinecone client
      const client = await getPineconeClient();
      const index = client.index(process.env.PINECONE_INDEX_NAME!);
      
      // Build filter object for Pinecone query
      const filter: Record<string, any> = {
        type: 'foa_description'
      };
      
      // Add filters if provided
      if (agency) {
        filter.agency = agency;
      }
      if (minAward !== null && maxAward !== null) {
        // At least one of these conditions should be true:
        // 1. award_floor (if exists) is within the range
        // 2. award_ceiling (if exists) is within the range
        // 3. range completely encompasses the award range (floor to ceiling)
        filter.$or = [
          { award_floor: { $gte: minAward, $lte: maxAward } },
          { award_ceiling: { $gte: minAward, $lte: maxAward } },
          {
            $and: [
              { award_floor: { $lte: minAward } },
              { award_ceiling: { $gte: maxAward } }
            ]
          }
        ];
      } else if (minAward !== null) {
        // Either the floor or ceiling should be >= minAward
        filter.$or = [
          { award_floor: { $gte: minAward } },
          { award_ceiling: { $gte: minAward } }
        ];
      } else if (maxAward !== null) {
        // Either the floor or ceiling should be <= maxAward
        filter.$or = [
          { award_floor: { $lte: maxAward } },
          { award_ceiling: { $lte: maxAward } }
        ];
      }
      if (animalTrials !== null) {
        filter.animal_trials = animalTrials;
      }
      if (humanTrials !== null) {
        filter.human_trials = humanTrials;
      }
      
      // Add deadline filter
      if (deadlineDate !== null) {
        // Convert date to Unix timestamp (seconds)
        const timestamp = Math.floor(deadlineDate.getTime() / 1000);
        filter.deadline_timestamp = { $lte: timestamp };
      }
      
      // Add organization eligibility filters
      if (orgHigherEducation !== null) {
        filter.org_higher_education = orgHigherEducation;
      }
      if (orgNonProfit !== null) {
        filter.org_non_profit = orgNonProfit;
      }
      if (orgForProfit !== null) {
        filter.org_for_profit = orgForProfit;
      }
      if (orgGovernment !== null) {
        filter.org_government = orgGovernment;
      }
      if (orgHospital !== null) {
        filter.org_hospital = orgHospital;
      }
      if (orgForeign !== null) {
        filter.org_foreign = orgForeign;
      }
      if (orgIndividual !== null) {
        filter.org_individual = orgIndividual;
      }
      
      // Add user eligibility filters
      if (userPrincipalInvestigator !== null) {
        filter.user_pi = userPrincipalInvestigator;
      }
      if (userPostdoc !== null) {
        filter.user_postdoc = userPostdoc;
      }
      if (userGraduateStudent !== null) {
        filter.user_grad_student = userGraduateStudent;
      }
      if (userEarlyCareer !== null) {
        filter.user_senior_personnel = userEarlyCareer; // Early career maps to senior personnel in our metadata
      }
      
      // FOAs are global, so we don't filter by projectId
      // Only include projectId filter for other content types
      // if (projectId) {
      //   filter.projectId = projectId;
      // }

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
        console.log('First match metadata:', listResponse.matches[0]?.metadata);

        // Get all FOA IDs with normalized scores
        const allFoaIds = listResponse.matches
          .filter(match => match.metadata && match.metadata.foaId)
          .map(match => ({
            id: match.metadata!.foaId as string,
            score: match.score !== undefined ? normalizeScore(match.score) : undefined
          }));

        // Apply pagination to FOA IDs
        const paginatedFoaIds = allFoaIds.slice(offset, offset + limit);

        console.log('Total FOA IDs:', allFoaIds.length);
        console.log('Paginated FOA IDs:', paginatedFoaIds.length);
        
        // Only log score range if there are scores
        const scores = allFoaIds.map(f => f.score).filter((s): s is number => s !== undefined);
        if (scores.length > 0) {
          console.log('Score range:', Math.min(...scores), 'to', Math.max(...scores));
        }

        if (paginatedFoaIds.length === 0) {
          return NextResponse.json({
            foas: [],
            total: allFoaIds.length,
            error: null
          });
        }

        // Fetch the actual FOA records from Supabase
        const { data: foas, error: foasError } = await supabase
          .from('foas')
          .select('*')
          .in('id', paginatedFoaIds.map(f => f.id));

        if (foasError) {
          console.error('Error fetching FOAs from Supabase:', foasError);
          return NextResponse.json({
            error: 'Failed to fetch FOA details',
            foas: [],
            total: 0
          }, { status: 500 });
        }

        console.log('Found FOAs in Supabase:', foas?.length || 0);

        // Sort the FOAs by created_at (most recent first) and include scores
        const sortedFoas = foas
          ?.map(foa => ({
            ...foa,
            score: paginatedFoaIds.find(f => f.id === foa.id)?.score
          }))
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          || [];

        return NextResponse.json({
          foas: sortedFoas,
          total: allFoaIds.length,
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
      
      // Get all FOA IDs with normalized scores
      const allFoaIds = queryResponse.matches
        .filter(match => match.metadata && match.metadata.foaId)
        .map(match => ({
          id: match.metadata!.foaId as string,
          score: match.score !== undefined ? normalizeScore(match.score) : undefined
        }));
      
      // Apply pagination to FOA IDs
      const paginatedFoaIds = allFoaIds.slice(offset, offset + limit);
      
      // Only log score range if there are scores
      const scores = allFoaIds.map(f => f.score).filter((s): s is number => s !== undefined);
      if (scores.length > 0) {
        console.log('Score range:', Math.min(...scores), 'to', Math.max(...scores));
      }
      
      if (paginatedFoaIds.length === 0) {
        return NextResponse.json({
          foas: [],
          total: allFoaIds.length,
          error: null
        });
      }
      
      // Fetch the actual FOA records from Supabase
      const { data: foas, error: foasError } = await supabase
        .from('foas')
        .select('*')
        .in('id', paginatedFoaIds.map(f => f.id));
      
      if (foasError) {
        console.error('Error fetching FOAs from Supabase:', foasError);
        return NextResponse.json({
          error: 'Failed to fetch FOA details',
          foas: [],
          total: 0
        }, { status: 500 });
      }
      
      // Sort the FOAs by score and include scores in response
      const sortedFoas = paginatedFoaIds
        .map(({ id, score }) => ({
          ...foas?.find(foa => foa.id === id),
          score
        }))
        .filter(Boolean)
        .sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort by score for text queries
      
      return NextResponse.json({
        foas: sortedFoas,
        total: allFoaIds.length,
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