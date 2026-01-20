import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/config';
import { generateAllClips } from '@/lib/services/clip';

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = parseInt(params.videoId);
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const clipsResult = await pool.query('SELECT * FROM clips WHERE video_id = $1', [videoId]);
    if (clipsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No clips found' },
        { status: 400 }
      );
    }

    const results = await generateAllClips(videoId);
    const generatedCount = results.filter((r: any) => r.status === 'generated').length;

    return NextResponse.json({
      success: true,
      results: results,
      message: `Generated ${generatedCount} clips`
    });
  } catch (error: any) {
    console.error('Error generating clips:', error);
    return NextResponse.json(
      { error: 'Failed to generate clips', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = parseInt(params.videoId);
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT * FROM clips WHERE video_id = $1 ORDER BY start_time ASC',
      [videoId]
    );
    return NextResponse.json({ success: true, clips: result.rows });
  } catch (error) {
    console.error('Error fetching clips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clips' },
      { status: 500 }
    );
  }
}
