const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const pool = require('../config');

const clipsDir = process.env.CLIPS_DIR || './clips';

if (!fs.existsSync(clipsDir)) {
  fs.mkdirSync(clipsDir, { recursive: true });
}

async function generateClip(clipId, videoPath, startTime, endTime, title) {
  if (!fs.existsSync(videoPath)) {
    throw new Error('Video file not found');
  }

  const duration = endTime - startTime;
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const ts = Date.now();

  const hFile = `clip-${clipId}-${cleanTitle}-${ts}-h.mp4`;
  const vFile = `clip-${clipId}-${cleanTitle}-${ts}-v.mp4`;
  
  const hPath = path.join(clipsDir, hFile);
  const vPath = path.join(clipsDir, vFile);

  // horizontal clip
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 23', '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'])
      .output(hPath)
      .on('end', () => {
        console.log(`Horizontal clip done: ${hPath}`);
        resolve();
      })
      .on('error', reject)
      .run();
  });

  // vertical clip
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 23', '-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2'])
      .output(vPath)
      .on('end', () => {
        console.log(`Vertical clip done: ${vPath}`);
        resolve();
      })
      .on('error', reject)
      .run();
  });

  await pool.query(
    `UPDATE clips SET horizontal_path = $1, vertical_path = $2 WHERE id = $3`,
    [hPath, vPath, clipId]
  );

  return {
    horizontal_path: hPath,
    vertical_path: vPath
  };
}

async function generateAllClips(videoId) {
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
    throw new Error('No clips found');
  }

  const results = [];
  for (const clip of clipsResult.rows) {
    if (clip.horizontal_path && clip.vertical_path) {
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
    } catch (err) {
      console.error(`Failed to generate clip ${clip.id}:`, err);
      results.push({
        clip_id: clip.id,
        status: 'failed',
        error: err.message
      });
    }
  }

  return results;
}

module.exports = {
  generateClip,
  generateAllClips
};
