import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Optional project ID filtering
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    const query = supabase
      .from('attachments')
      .select('*')
      .order('created_at', { ascending: false });
      
    // Apply project filter if provided
    if (projectId) {
      query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching attachments:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in attachments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, file_url, file_type, project_id, description } = body;
    
    if (!name || !file_url || !file_type || !project_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        name,
        file_url,
        file_type,
        project_id,
        description: description || '',
        user_id: user.user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating attachment:', error);
      return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in attachments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 