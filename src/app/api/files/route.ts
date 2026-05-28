import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Basic auth check
    const cookieHeader = request.headers.get('cookie') || '';
    const internalToken = 'vault-active-session-token';
    if (!cookieHeader.includes(`admin_token=${internalToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.storage.from('files').list();

    if (error) {
      console.error('Supabase list error:', error);
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    // Filter out potential empty folders or hidden files
    const files = data.filter(file => file.name !== '.emptyFolderPlaceholder' && !file.name.startsWith('.'));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('List handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
