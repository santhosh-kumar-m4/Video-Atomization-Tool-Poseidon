const express = require('express');
const router = express.Router();
const momentService = require('../services/moments');
const transcriptService = require('../services/transcript');
const pool = require('../config');

router.post('/:videoId/detect', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const transcript = await transcriptService.getTranscript(videoId);
    if (!transcript || transcript.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Transcript not found or not completed',
        message: 'Please generate transcript first'
      });
    }

    const existingMoments = await momentService.getMoments(videoId);
    if (existingMoments.length > 0) {
      return res.json({
        success: true,
        message: 'Moments already detected',
        moments: existingMoments
      });
    }

    const moments = await momentService.detectMoments(videoId, transcript.transcript_text);

    res.json({
      success: true,
      moments: moments,
      message: `Detected ${moments.length} key moments`
    });

  } catch (error) {
    console.error('Error detecting moments:', error);
    res.status(500).json({
      error: 'Failed to detect moments',
      message: error.message
    });
  }
});

router.get('/:videoId', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);
    const moments = await momentService.getMoments(videoId);
    res.json({ success: true, moments: moments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch moments' });
  }
});

module.exports = router;
