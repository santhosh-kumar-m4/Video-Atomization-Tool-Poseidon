import { NextResponse } from 'next/server';
import pool from '@/lib/db/config';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT id, filename, original_filename, file_size, duration, status, created_at FROM videos ORDER BY created_at DESC'
    );
    
    const videos = result.rows.map(video => ({
      ...video,
      created_at: video.created_at ? new Date(video.created_at).toISOString() : null
    }));
    
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
