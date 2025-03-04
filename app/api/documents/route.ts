import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';
import { Document } from '@/types/documents';

export async function GET(): Promise<Response> {
  try {
    console.log('Starting GET /api/documents');
    const supabase = await createClient();
    console.log('Supabase client created');
    
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return Response.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    console.log('Documents fetched successfully:', documents);
    return Response.json(documents);
  } catch (error) {
    console.error('Unexpected error in GET /api/documents:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    const document: Omit<Document, 'id' | 'created_at' | 'updated_at'> = await request.json();

    const { data, error } = await supabase
      .from('documents')
      .insert([document])
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return Response.json({ error: 'Failed to create document' }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('Error in POST /api/documents:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 