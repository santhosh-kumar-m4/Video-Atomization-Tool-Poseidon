import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/config';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  try {
    const { id: idParam, format } = await params;
    const clipId = parseInt(idParam);

    if (isNaN(clipId)) {
      return NextResponse.json(
        { error: 'Invalid clip ID' },
        { status: 400 }
      );
    }

    if (format !== 'horizontal' && format !== 'vertical') {
      return NextResponse.json(
        { error: 'Invalid format. Use "horizontal" or "vertical"' },
        { status: 400 }
      );
    }

    const clipResult = await pool.query('SELECT * FROM clips WHERE id = $1', [clipId]);
    if (clipResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }

    const clip = clipResult.rows[0];
    const filePath = format === 'horizontal' ? clip.horizontal_path : clip.vertical_path;

    if (!filePath) {
      return NextResponse.json(
        { error: 'Clip file not generated yet' },
        { status: 404 }
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Clip file not found' },
        { status: 404 }
      );
    }

    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error: any) {
    console.error('Error downloading clip:', error);
    return NextResponse.json(
      { error: 'Failed to download clip', message: error.message },
      { status: 500 }
    );
  }
}
