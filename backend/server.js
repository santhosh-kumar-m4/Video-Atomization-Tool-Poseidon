const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Video Atomization API is running' });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const pool = require('./src/config');
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', message: 'Database connected', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
  }
});

const videoRoutes = require('./src/routes/videos');
const transcriptRoutes = require('./src/routes/transcripts');

app.use('/api/videos', videoRoutes);
app.use('/api/transcripts', transcriptRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
