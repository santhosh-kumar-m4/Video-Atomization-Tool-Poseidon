const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = require('../middleware/upload');
const pool = require('../config');
const fs = require('fs');
const { getVideoDuration } = require('../utils/videoMetadata');

router.post('/upload', (req, res) => {
  upload.single('video')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            error: 'File too large', 
            message: 'Maximum file size is 500MB' 
          });
        }
        return res.status(400).json({ 
          error: 'Upload error', 
          message: err.message 
        });
      }
      return res.status(400).json({ 
        error: 'Upload failed', 
        message: err.message 
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }

      const file = req.file;
      const stats = fs.statSync(file.path);
      const fileSize = stats.size;

      let duration = null;
      try {
        duration = await getVideoDuration(file.path);
      } catch (durationError) {
        console.error('Failed to extract duration:', durationError);
      }

      const now = new Date();
      const result = await pool.query(
        `INSERT INTO videos (filename, original_filename, file_path, file_size, duration, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, filename, original_filename, file_size, duration, status, created_at`,
        [file.filename, file.originalname, file.path, fileSize, duration, 'uploaded', now]
      );

      const video = result.rows[0];
      video.created_at = video.created_at ? new Date(video.created_at).toISOString() : video.created_at;

      res.json({
        success: true,
        video: video,
        message: 'Video uploaded successfully'
      });

    } catch (error) {
      console.error('Upload error:', error);
      
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
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, filename, original_filename, file_size, duration, status, created_at FROM videos ORDER BY created_at DESC'
    );
    
    const videos = result.rows.map(video => ({
      ...video,
      created_at: video.created_at ? new Date(video.created_at).toISOString() : video.created_at
    }));
    
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const video = result.rows[0];
    video.created_at = video.created_at ? new Date(video.created_at).toISOString() : video.created_at;
    video.updated_at = video.updated_at ? new Date(video.updated_at).toISOString() : video.updated_at;
    
    res.json({ video });
  } catch (error) {
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
