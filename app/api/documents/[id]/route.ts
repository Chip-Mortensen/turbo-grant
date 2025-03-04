import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';
import { Document } from '@/types/documents';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching document:', error);
      return Response.json({ error: 'Failed to fetch document' }, { status: 500 });
    }

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json(document);
  } catch (error) {
    console.error('Error in GET /api/documents/[id]:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const updates: Partial<Document> = await request.json();

    const { data: document, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return Response.json({ error: 'Failed to update document' }, { status: 500 });
    }

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json(document);
  } catch (error) {
    console.error('Error in PUT /api/documents/[id]:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      return Response.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/documents/[id]:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 