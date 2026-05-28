import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Decode filename in case it has special characters
    const decodedFilename = decodeURIComponent(filename);

    const { data, error } = await supabase.storage
      .from('files')
      .download(decodedFilename);

    if (error) {
      console.error('Download error:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Set headers to force download with correct filename for curl -O
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${decodedFilename}"`);
    headers.set('Content-Type', data.type || 'application/octet-stream');

    return new NextResponse(data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
