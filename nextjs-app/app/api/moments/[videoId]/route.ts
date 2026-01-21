import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/config';
import { detectMoments, getMoments } from '@/lib/services/moments';
import { getTranscript } from '@/lib/services/transcript';

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

    const transcript = await getTranscript(videoId);
    if (!transcript || transcript.status !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Transcript not found or not completed',
          message: 'Please generate transcript first'
        },
        { status: 400 }
      );
    }

    const existingMoments = await getMoments(videoId);
    if (existingMoments.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Moments already detected',
        moments: existingMoments
      });
    }

    const moments = await detectMoments(videoId, transcript.transcript_text);

    return NextResponse.json({
      success: true,
      moments: moments,
      message: `Detected ${moments.length} key moments`
    });

  } catch (error: any) {
    console.error('Error detecting moments:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect moments',
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

    const moments = await getMoments(videoId);
    return NextResponse.json({ success: true, moments: moments });
  } catch (error) {
    console.error('Error fetching moments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moments' },
      { status: 500 }
    );
  }
}
