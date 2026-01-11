const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const pool = require('../config');

const clipsDir = process.env.CLIPS_DIR || './clips';

if (!fs.existsSync(clipsDir)) {
  fs.mkdirSync(clipsDir, { recursive: true });
}

async function generateClip(clipId, videoPath, startTime, endTime, title) {
  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error('Video file not found');
    }

    const duration = endTime - startTime;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const timestamp = Date.now();

    const horizontalFilename = `clip-${clipId}-${sanitizedTitle}-${timestamp}-h.mp4`;
    const verticalFilename = `clip-${clipId}-${sanitizedTitle}-${timestamp}-v.mp4`;
    
    const horizontalPath = path.join(clipsDir, horizontalFilename);
    const verticalPath = path.join(clipsDir, verticalFilename);

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
        ])
        .output(horizontalPath)
        .on('end', () => {
          console.log(`Horizontal clip generated: ${horizontalPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error (horizontal):', err);
          reject(err);
        })
        .run();
    });

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2'
        ])
        .output(verticalPath)
        .on('end', () => {
          console.log(`Vertical clip generated: ${verticalPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error (vertical):', err);
          reject(err);
        })
        .run();
    });

    await pool.query(
      `UPDATE clips 
       SET horizontal_path = $1, vertical_path = $2 
       WHERE id = $3`,
      [horizontalPath, verticalPath, clipId]
    );

    return {
      horizontal_path: horizontalPath,
      vertical_path: verticalPath
    };

  } catch (error) {
    console.error('Clip generation error:', error);
    throw error;
  }
}

async function generateAllClips(videoId) {
  try {
    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      throw new Error('Video not found');
    }

    const video = videoResult.rows[0];
    const videoPath = video.file_path;

    if (!fs.existsSync(videoPath)) {
      throw new Error('Video file not found');
    }

    const clipsResult = await pool.query(
      'SELECT * FROM clips WHERE video_id = $1 ORDER BY start_time ASC',
      [videoId]
    );

    if (clipsResult.rows.length === 0) {
      throw new Error('No clips found for this video');
    }

    const results = [];
    for (const clip of clipsResult.rows) {
      if (clip.horizontal_path && clip.vertical_path) {
        console.log(`Clip ${clip.id} already generated, skipping`);
        results.push({
          clip_id: clip.id,
          status: 'already_exists',
          paths: {
            horizontal: clip.horizontal_path,
            vertical: clip.vertical_path
          }
        });
        continue;
      }

      try {
        const paths = await generateClip(
          clip.id,
          videoPath,
          clip.start_time,
          clip.end_time,
          clip.title || `clip-${clip.id}`
        );
        results.push({
          clip_id: clip.id,
          status: 'generated',
          paths: paths
        });
      } catch (clipError) {
        console.error(`Error generating clip ${clip.id}:`, clipError);
        results.push({
          clip_id: clip.id,
          status: 'failed',
          error: clipError.message
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Error generating all clips:', error);
    throw error;
  }
}

module.exports = {
  generateClip,
  generateAllClips
};
