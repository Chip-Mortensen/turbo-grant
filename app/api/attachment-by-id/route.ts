import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Handle attachment operations using query params instead of dynamic routes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching attachment:', error);
      return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in attachments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update a specific attachment
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description } = body;
    
    // Only name and description can be updated
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    
    const { data, error } = await supabase
      .from('attachments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating attachment:', error);
      return NextResponse.json({ error: 'Failed to update attachment' }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in attachments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a specific attachment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First, get the attachment to check if it exists
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }
    
    // Delete the attachment
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting attachment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in attachments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 