import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/config';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }
    
    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    const video = result.rows[0];
    video.created_at = video.created_at ? new Date(video.created_at).toISOString() : video.created_at;
    video.updated_at = video.updated_at ? new Date(video.updated_at).toISOString() : video.updated_at;
    
    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const videoId = parseInt(idParam);
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1',
      [videoId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const video = result.rows[0];
    const filePath = video.file_path;

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
      }
    }

    await pool.query('DELETE FROM videos WHERE id = $1', [videoId]);

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video', message: error.message },
      { status: 500 }
    );
  }
}
