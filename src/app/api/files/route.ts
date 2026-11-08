import { NextResponse } from 'next/server';
import { del, list } from '@vercel/blob';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Basic auth check
    const cookieHeader = request.headers.get('cookie') || '';
    const internalToken = 'vault-active-session-token';
    if (!cookieHeader.includes(`admin_token=${internalToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [supabaseResult, blobResult] = await Promise.allSettled([
      supabase.storage.from('files').list(),
      list({ prefix: 'files/' }),
    ]);
    const filesByName = new Map<string, { name: string; created_at: string }>();

    if (supabaseResult.status === 'fulfilled' && !supabaseResult.value.error) {
      for (const file of supabaseResult.value.data) {
        if (file.name !== '.emptyFolderPlaceholder' && !file.name.startsWith('.')) {
          filesByName.set(file.name, { name: file.name, created_at: file.created_at ?? new Date().toISOString() });
        }
      }
    } else {
      console.error('Supabase list error:', supabaseResult.status === 'rejected' ? supabaseResult.reason : supabaseResult.value.error);
    }

    if (blobResult.status === 'fulfilled') {
      for (const blob of blobResult.value.blobs) {
        const name = blob.pathname.slice('files/'.length);
        if (name && !name.startsWith('.')) {
          filesByName.set(name, { name, created_at: blob.uploadedAt.toISOString() });
        }
      }
    } else {
      console.error('Vercel Blob list error:', blobResult.reason);
    }

    if (filesByName.size === 0 && supabaseResult.status === 'rejected' && blobResult.status === 'rejected') {
      return NextResponse.json({ error: 'Failed to list files from both providers' }, { status: 502 });
    }
    return NextResponse.json({ files: [...filesByName.values()] });
  } catch (error) {
    console.error('List handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const internalToken = 'vault-active-session-token';
    if (!cookieHeader.includes(`admin_token=${internalToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = body?.name;
    if (typeof name !== 'string' || !name.trim() || name === '.' || name === '..' || /[\\/]/.test(name)) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    const pathname = `files/${name}`;
    const [supabaseResult, blobResult] = await Promise.allSettled([
      supabase.storage.from('files').remove([name]),
      list({ prefix: pathname }).then(({ blobs }) =>
        Promise.all(blobs.filter((blob) => blob.pathname === pathname).map((blob) => del(blob.url)))
      ),
    ]);
    const supabaseDeleted = supabaseResult.status === 'fulfilled' && !supabaseResult.value.error;
    const blobDeleted = blobResult.status === 'fulfilled';

    if (!supabaseDeleted) {
      console.error('Supabase delete error:', supabaseResult.status === 'rejected' ? supabaseResult.reason : supabaseResult.value.error);
    }
    if (!blobDeleted) console.error('Vercel Blob delete error:', blobResult.reason);

    if (!supabaseDeleted && !blobDeleted) {
      return NextResponse.json({ error: 'Failed to delete file from both providers' }, { status: 500 });
    }
    if (!supabaseDeleted || !blobDeleted) {
      return NextResponse.json({ error: 'File was deleted from only one provider; retry deletion.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
