import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Basic auth check
    const cookieHeader = request.headers.get('cookie') || '';
    const adminToken = process.env.ADMIN_TOKEN || 'secret-admin-token-123';
    if (!cookieHeader.includes(`admin_token=${adminToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage bucket named 'files'
    // We use upsert: true to overwrite if a file with the same name exists
    const { data, error } = await supabase.storage
      .from('files')
      .upload(file.name, buffer, {
        contentType: file.type || 'text/plain',
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload to storage' }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: data.path });
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
