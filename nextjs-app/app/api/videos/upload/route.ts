import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import pool from '@/lib/db/config';
import { getVideoDuration } from '@/lib/utils/videoMetadata';

export async function POST(request: NextRequest) {
  try {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file uploaded' },
        { status: 400 }
      );
    }

    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const ext = path.extname(file.name).toLowerCase();
    const allowedExts = ['.mp4', '.mov', '.avi', '.webm', '.mpeg'];
    
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: 'Only video files allowed (mp4, mov, avi, webm)' },
        { status: 400 }
      );
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large', message: 'Maximum file size is 500MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `video-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    let duration = null;
    try {
      duration = await getVideoDuration(filePath);
    } catch (durationError) {
      console.error('Failed to extract duration:', durationError);
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO videos (filename, original_filename, file_path, file_size, duration, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, filename, original_filename, file_size, duration, status, created_at`,
      [filename, file.name, filePath, file.size, duration, 'uploaded', now]
    );

    const video = result.rows[0];
    video.created_at = video.created_at ? new Date(video.created_at).toISOString() : video.created_at;

    return NextResponse.json({
      success: true,
      video: video,
      message: 'Video uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video', message: error.message },
      { status: 500 }
    );
  }
}
