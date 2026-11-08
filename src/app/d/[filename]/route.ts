import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    const decodedFilename = filename;
    if (!decodedFilename || decodedFilename === '.' || decodedFilename === '..' || /[\\/]/.test(decodedFilename)) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    try {
      const { data, error } = await supabase.storage.from('files').download(decodedFilename);
      if (error) {
        console.warn('Supabase download failed; trying Vercel Blob:', error);
      } else if (data) {
        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(decodedFilename)}`);
        headers.set('Content-Type', data.type || 'application/octet-stream');
        return new NextResponse(data, { status: 200, headers });
      }
    } catch (error) {
      console.warn('Supabase download failed; trying Vercel Blob:', error);
    }

    const pathname = `files/${decodedFilename}`;
    const { blobs } = await list({ prefix: pathname });
    const blob = blobs.find((item) => item.pathname === pathname);
    if (!blob) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const blobResponse = await fetch(blob.url);
    if (!blobResponse.ok || !blobResponse.body) {
      console.error('Vercel Blob download failed:', blobResponse.status);
      return NextResponse.json({ error: 'File unavailable from both storage providers' }, { status: 502 });
    }

    const headers = new Headers(blobResponse.headers);
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(decodedFilename)}`);
    headers.set('Content-Type', blobResponse.headers.get('content-type') || 'application/octet-stream');
    return new NextResponse(blobResponse.body, { status: 200, headers });
  } catch (error) {
    console.error('Download handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
