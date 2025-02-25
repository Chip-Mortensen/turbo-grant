import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Cap at 100
    const offset = parseInt(searchParams.get("offset") || "0");

    // Create Supabase client
    const supabase = await createClient();
    
    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("API auth error:", authError);
      return NextResponse.json({
        error: "Unauthorized",
        organizations: [],
        total: 0
      }, { status: 401 });
    }

    // Sanitize the query to prevent SQL injection
    const sanitizedQuery = query.replace(/[%_]/g, (match) => `\\${match}`);

    try {
      // Build the database query
      let dbQuery = supabase
        .from("organizations")
        .select("*", { count: "exact" });

      // Apply search filter if query is provided
      if (sanitizedQuery) {
        // Only search by name for simplicity and reliability
        dbQuery = dbQuery.ilike('name', `%${sanitizedQuery}%`);
      }

      // Apply pagination and execute query
      const { data, error, count } = await dbQuery
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Database error searching organizations:", error);
        return NextResponse.json({
          error: "Database error: " + error.message,
          organizations: [],
          total: 0
        }, { status: 500 });
      }

      // Return successful response
      return NextResponse.json({
        organizations: data || [],
        total: count || 0,
        error: null
      });
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json({
        error: "Database operation failed",
        organizations: [],
        total: 0
      }, { status: 500 });
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in organizations search API:", error);
    return NextResponse.json({
      error: "Internal server error",
      organizations: [],
      total: 0
    }, { status: 500 });
  }
} 