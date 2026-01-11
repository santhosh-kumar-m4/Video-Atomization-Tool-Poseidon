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

// TODO: video upload endpoint
// TODO: transcript generation
// TODO: clip generation with ffmpeg

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
