import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    // Basic auth check
    const cookieHeader = request.headers.get('cookie') || '';
    const internalToken = 'vault-active-session-token';
    if (!cookieHeader.includes(`admin_token=${internalToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (/[\\/]/.test(file.name) || file.name === '.' || file.name === '..') {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const [supabaseResult, blobResult] = await Promise.allSettled([
      supabase.storage.from('files').upload(file.name, buffer, {
        contentType: file.type || 'text/plain',
        upsert: true,
      }),
      put(`files/${file.name}`, buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: file.type || 'application/octet-stream',
      }),
    ]);

    const supabaseUploaded = supabaseResult.status === 'fulfilled' && !supabaseResult.value.error;
    const blobUploaded = blobResult.status === 'fulfilled';

    if (!supabaseUploaded) {
      console.error('Supabase upload error:', supabaseResult.status === 'rejected' ? supabaseResult.reason : supabaseResult.value.error);
    }
    if (!blobUploaded) console.error('Vercel Blob upload error:', blobResult.reason);

    if (!supabaseUploaded && !blobUploaded) {
      return NextResponse.json({ error: 'Upload failed in both storage providers' }, { status: 500 });
    }

    const failedProviders = [!supabaseUploaded && 'Supabase', !blobUploaded && 'Vercel Blob'].filter(Boolean);
    return NextResponse.json({
      success: true,
      path: file.name,
      warning: failedProviders.length ? `File saved, but upload to ${failedProviders.join(' and ')} failed.` : undefined,
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
