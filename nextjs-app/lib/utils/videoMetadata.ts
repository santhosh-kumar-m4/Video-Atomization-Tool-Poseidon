import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const normalizedPath = path.resolve(videoPath);
    
    if (!fs.existsSync(normalizedPath)) {
      reject(new Error('Video file not found: ' + normalizedPath));
      return;
    }

    ffmpeg.ffprobe(normalizedPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata?.format?.duration;
      if (!duration) {
        reject(new Error('Could not extract video duration'));
        return;
      }

      resolve(Math.round(duration));
    });
  });
}
