import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/config';
import { generateTranscript, getTranscript } from '@/lib/services/transcript';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId: videoIdParam } = await params;
    const videoId = parseInt(videoIdParam);
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

    const video = videoResult.rows[0];

    const existingTranscript = await getTranscript(videoId);
    if (existingTranscript && existingTranscript.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Transcript already exists',
        transcript: existingTranscript
      });
    }

    const transcript = await generateTranscript(videoId, video.file_path);

    return NextResponse.json({
      success: true,
      transcript: transcript,
      message: 'Transcript generated successfully'
    });

  } catch (error: any) {
    console.error('Error generating transcript:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate transcript',
        message: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId: videoIdParam } = await params;
    const videoId = parseInt(videoIdParam);
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const transcript = await getTranscript(videoId);
    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, transcript: transcript });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}
