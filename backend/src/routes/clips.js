const express = require('express');
const router = express.Router();
const clipService = require('../services/clip');
const pool = require('../config');

router.post('/:videoId/generate', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const clipsResult = await pool.query(
      'SELECT * FROM clips WHERE video_id = $1',
      [videoId]
    );

    if (clipsResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No clips found',
        message: 'Please detect moments first'
      });
    }

    const results = await clipService.generateAllClips(videoId);

    res.json({
      success: true,
      results: results,
      message: `Generated ${results.filter(r => r.status === 'generated').length} clips`
    });

  } catch (error) {
    console.error('Error generating clips:', error);
    res.status(500).json({
      error: 'Failed to generate clips',
      message: error.message
    });
  }
});

router.post('/:clipId/generate-one', async (req, res) => {
  try {
    const clipId = parseInt(req.params.clipId);

    const clipResult = await pool.query('SELECT * FROM clips WHERE id = $1', [clipId]);
    if (clipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const clip = clipResult.rows[0];

    if (clip.horizontal_path && clip.vertical_path) {
      return res.json({
        success: true,
        message: 'Clip already generated',
        paths: {
          horizontal: clip.horizontal_path,
          vertical: clip.vertical_path
        }
      });
    }

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [clip.video_id]);
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];
    const paths = await clipService.generateClip(
      clipId,
      video.file_path,
      clip.start_time,
      clip.end_time,
      clip.title || `clip-${clipId}`
    );

    res.json({
      success: true,
      paths: paths,
      message: 'Clip generated successfully'
    });

  } catch (error) {
    console.error('Error generating clip:', error);
    res.status(500).json({
      error: 'Failed to generate clip',
      message: error.message
    });
  }
});

router.get('/:videoId', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);

    const result = await pool.query(
      'SELECT * FROM clips WHERE video_id = $1 ORDER BY start_time ASC',
      [videoId]
    );

    res.json({
      success: true,
      clips: result.rows
    });

  } catch (error) {
    console.error('Error fetching clips:', error);
    res.status(500).json({
      error: 'Failed to fetch clips',
      message: error.message
    });
  }
});

module.exports = router;
