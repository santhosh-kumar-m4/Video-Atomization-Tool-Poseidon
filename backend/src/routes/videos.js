// video routes
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const pool = require('../config');
const fs = require('fs');

// upload endpoint
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const file = req.file;
    const stats = fs.statSync(file.path);
    const fileSize = stats.size;

    // TODO: get duration with ffprobe later
    const duration = null;

    // insert into db
    const result = await pool.query(
      `INSERT INTO videos (filename, original_filename, file_path, file_size, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, filename, original_filename, file_size, status, created_at`,
      [file.filename, file.originalname, file.path, fileSize, duration, 'uploaded']
    );

    res.json({
      success: true,
      video: result.rows[0],
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to upload video', 
      message: error.message 
    });
  }
});

// get all videos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, filename, original_filename, file_size, duration, status, created_at FROM videos ORDER BY created_at DESC'
    );
    res.json({ videos: result.rows });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// get single video
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video: result.rows[0] });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);

    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1',
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
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

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      error: 'Failed to delete video',
      message: error.message
    });
  }
});

module.exports = router;
