const ffmpeg = require('fluent-ffmpeg');

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration;
      if (!duration) {
        reject(new Error('Could not extract video duration'));
        return;
      }

      resolve(Math.round(duration));
    });
  });
}

module.exports = {
  getVideoDuration
};
