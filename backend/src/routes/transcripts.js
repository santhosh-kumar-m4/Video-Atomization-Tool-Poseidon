const express = require('express');
const router = express.Router();
const transcriptService = require('../services/transcript');
const pool = require('../config');

router.post('/:videoId/generate', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];

    const existingTranscript = await transcriptService.getTranscript(videoId);
    if (existingTranscript && existingTranscript.status === 'completed') {
      return res.json({
        success: true,
        message: 'Transcript already exists',
        transcript: existingTranscript
      });
    }

    const transcript = await transcriptService.generateTranscript(videoId, video.file_path);

    res.json({
      success: true,
      transcript: transcript,
      message: 'Transcript generated successfully'
    });

  } catch (error) {
    console.error('Error generating transcript:', error);
    res.status(500).json({
      error: 'Failed to generate transcript',
      message: error.message
    });
  }
});

router.get('/:videoId', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);
    const transcript = await transcriptService.getTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    res.json({ success: true, transcript: transcript });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

module.exports = router;
